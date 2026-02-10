import logging
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.project import Project
from app.models.rfi import RFI, RFIEmailLog, RFIResponse, RFIStatus
from app.models.user import User
from app.services.email_service import EmailService
from app.services.rfi_email_parser import ParsedEmail, RFIEmailParser

logger = logging.getLogger(__name__)


class RFIService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.email_service = EmailService()
        self.email_parser = RFIEmailParser()
        self.settings = get_settings()

    async def generate_rfi_from_email(self, project_id: uuid.UUID, rfi_number: str) -> str:
        result = await self.db.execute(
            select(Project.code).where(Project.id == project_id)
        )
        project_code = result.scalar_one()
        seq = rfi_number.split("-")[-1]
        local_part = f"RFI-{project_code}-{seq}".lower()
        return f"{local_part}@{self.settings.rfi_email_domain}"

    async def generate_rfi_number(self) -> str:
        year = datetime.utcnow().year
        result = await self.db.execute(
            select(func.count(RFI.id)).where(
                RFI.rfi_number.like(f"RFI-{year}-%")
            )
        )
        count = result.scalar() + 1
        return f"RFI-{year}-{count:05d}"

    async def create_rfi(
        self,
        project_id: uuid.UUID,
        created_by_id: uuid.UUID,
        to_email: str,
        subject: str,
        question: str,
        to_name: Optional[str] = None,
        cc_emails: Optional[list[str]] = None,
        category: str = "other",
        priority: str = "medium",
        due_date: Optional[datetime] = None,
        location: Optional[str] = None,
        drawing_reference: Optional[str] = None,
        specification_reference: Optional[str] = None,
        attachments: Optional[list[dict]] = None,
        assigned_to_id: Optional[uuid.UUID] = None,
        related_equipment_id: Optional[uuid.UUID] = None,
        related_material_id: Optional[uuid.UUID] = None
    ) -> RFI:
        rfi_number = await self.generate_rfi_number()

        rfi = RFI(
            project_id=project_id,
            rfi_number=rfi_number,
            subject=subject,
            question=question,
            category=category,
            priority=priority,
            created_by_id=created_by_id,
            assigned_to_id=assigned_to_id,
            related_equipment_id=related_equipment_id,
            related_material_id=related_material_id,
            to_email=to_email.lower(),
            to_name=to_name,
            cc_emails=cc_emails or [],
            due_date=due_date,
            location=location,
            drawing_reference=drawing_reference,
            specification_reference=specification_reference,
            attachments=attachments or [],
            status=RFIStatus.DRAFT.value
        )
        self.db.add(rfi)
        await self.db.commit()
        await self.db.refresh(rfi)

        return rfi

    async def send_rfi(self, rfi_id: uuid.UUID) -> RFI:
        result = await self.db.execute(
            select(RFI)
            .options(selectinload(RFI.created_by))
            .where(RFI.id == rfi_id)
        )
        rfi = result.scalar_one_or_none()

        if not rfi:
            raise ValueError(f"RFI not found: {rfi_id}")

        if rfi.status not in [RFIStatus.DRAFT.value, RFIStatus.OPEN.value]:
            raise ValueError(f"Cannot send RFI with status: {rfi.status}")

        email_html = self._build_rfi_email_html(rfi)
        rfi_from_email = await self.generate_rfi_from_email(rfi.project_id, rfi.rfi_number)

        try:
            email_result = self.email_service.send_rfi_email(
                rfi_number=rfi.rfi_number,
                to_email=rfi.to_email,
                subject=rfi.subject,
                body_html=email_html,
                cc_emails=rfi.cc_emails,
                from_email=rfi_from_email
            )

            rfi.email_thread_id = email_result['thread_id']
            rfi.email_message_id = email_result['email_message_id']
            rfi.sent_at = datetime.utcnow()
            rfi.status = RFIStatus.WAITING_RESPONSE.value

            email_log = RFIEmailLog(
                rfi_id=rfi.id,
                event_type='sent',
                email_message_id=email_result.get('email_message_id'),
                from_email=rfi_from_email,
                to_email=rfi.to_email,
                subject=f"[{rfi.rfi_number}] {rfi.subject}"
            )
            self.db.add(email_log)

        except Exception as e:
            logger.error(f"Failed to send RFI email: {e}")

            email_log = RFIEmailLog(
                rfi_id=rfi.id,
                event_type='send_failed',
                from_email=rfi_from_email,
                to_email=rfi.to_email,
                subject=f"[{rfi.rfi_number}] {rfi.subject}",
                error_message=str(e)
            )
            self.db.add(email_log)
            await self.db.commit()
            raise

        await self.db.commit()
        await self.db.refresh(rfi)

        return rfi

    async def process_incoming_email(self, gmail_message: dict) -> Optional[RFIResponse]:
        parsed = self.email_parser.parse_gmail_message(gmail_message)

        email_log = RFIEmailLog(
            event_type='received',
            email_message_id=parsed.message_id,
            from_email=parsed.from_email,
            to_email=parsed.to_email,
            subject=parsed.subject,
            raw_payload=gmail_message
        )
        self.db.add(email_log)

        rfi = await self._find_rfi_for_email(parsed)

        if not rfi:
            logger.info(f"No matching RFI found for email: {parsed.subject}")
            await self.db.commit()
            return None

        email_log.rfi_id = rfi.id

        response = await self._create_response_from_email(rfi, parsed)

        await self.db.commit()
        await self.db.refresh(response)

        return response

    async def _find_rfi_for_email(self, parsed: ParsedEmail) -> Optional[RFI]:
        if parsed.thread_id:
            result = await self.db.execute(
                select(RFI).where(RFI.email_thread_id == parsed.thread_id)
            )
            rfi = result.scalar_one_or_none()
            if rfi:
                return rfi

        if parsed.rfi_number:
            result = await self.db.execute(
                select(RFI).where(RFI.rfi_number == parsed.rfi_number)
            )
            rfi = result.scalar_one_or_none()
            if rfi:
                return rfi

        if parsed.in_reply_to:
            result = await self.db.execute(
                select(RFI).where(RFI.email_message_id == parsed.in_reply_to)
            )
            rfi = result.scalar_one_or_none()
            if rfi:
                return rfi

            result = await self.db.execute(
                select(RFIResponse).where(RFIResponse.email_message_id == parsed.in_reply_to)
            )
            response = result.scalar_one_or_none()
            if response:
                result = await self.db.execute(
                    select(RFI).where(RFI.id == response.rfi_id)
                )
                return result.scalar_one_or_none()

        return None

    def _is_cc_participant(self, rfi: RFI, email: str) -> bool:
        if not rfi.cc_emails:
            return False
        normalized_email = email.lower()
        return normalized_email in [cc.lower() for cc in rfi.cc_emails]

    async def _create_response_from_email(self, rfi: RFI, parsed: ParsedEmail) -> RFIResponse:
        response_text = self.email_parser.extract_reply_content(parsed.body_text)
        if not response_text and parsed.body_html:
            response_text = parsed.body_html

        responder = await self._find_user_by_email(parsed.from_email)
        is_cc = self._is_cc_participant(rfi, parsed.from_email)

        response = RFIResponse(
            rfi_id=rfi.id,
            email_message_id=parsed.message_id,
            in_reply_to=parsed.in_reply_to,
            response_text=response_text,
            from_email=parsed.from_email,
            from_name=parsed.from_name,
            responder_id=responder.id if responder else None,
            attachments=[
                {
                    'filename': a['filename'],
                    'attachment_id': a['attachment_id'],
                    'message_id': a['message_id']
                }
                for a in parsed.attachments
            ],
            source='email',
            is_internal=bool(responder),
            is_cc_participant=is_cc,
            received_at=datetime.utcnow()
        )
        self.db.add(response)

        rfi.status = RFIStatus.ANSWERED.value
        rfi.responded_at = datetime.utcnow()

        return response

    async def _find_user_by_email(self, email: str) -> Optional[User]:
        result = await self.db.execute(
            select(User).where(func.lower(User.email) == email.lower())
        )
        return result.scalar_one_or_none()

    async def add_internal_response(
        self,
        rfi_id: uuid.UUID,
        user_id: uuid.UUID,
        response_text: str,
        attachments: Optional[list[dict]] = None,
        send_email: bool = True
    ) -> RFIResponse:
        result = await self.db.execute(
            select(RFI).options(selectinload(RFI.created_by)).where(RFI.id == rfi_id)
        )
        rfi = result.scalar_one_or_none()
        if not rfi:
            raise ValueError(f"RFI not found: {rfi_id}")

        user_result = await self.db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError(f"User not found: {user_id}")

        response = RFIResponse(
            rfi_id=rfi.id,
            response_text=response_text,
            from_email=user.email,
            from_name=user.full_name,
            responder_id=user.id,
            attachments=attachments or [],
            source='crm',
            is_internal=True
        )
        self.db.add(response)

        if send_email and self.email_service.enabled:
            try:
                rfi_from_email = await self.generate_rfi_from_email(rfi.project_id, rfi.rfi_number)
                email_result = self.email_service.send_rfi_email(
                    rfi_number=rfi.rfi_number,
                    to_email=rfi.to_email,
                    subject=f"Re: {rfi.subject}",
                    body_html=self._build_response_email_html(rfi, response_text),
                    in_reply_to=rfi.email_message_id,
                    references=rfi.email_message_id,
                    from_email=rfi_from_email
                )
                response.email_message_id = email_result.get('email_message_id')

                email_log = RFIEmailLog(
                    rfi_id=rfi.id,
                    event_type='response_sent',
                    email_message_id=email_result.get('email_message_id'),
                    from_email=rfi_from_email,
                    to_email=rfi.to_email,
                    subject=f"Re: [{rfi.rfi_number}] {rfi.subject}"
                )
                self.db.add(email_log)

            except Exception as e:
                logger.error(f"Failed to send response email: {e}")

        await self.db.commit()
        await self.db.refresh(response)

        return response

    async def update_status(self, rfi_id: uuid.UUID, status: str) -> RFI:
        result = await self.db.execute(select(RFI).where(RFI.id == rfi_id))
        rfi = result.scalar_one_or_none()
        if not rfi:
            raise ValueError(f"RFI not found: {rfi_id}")

        rfi.status = status

        if status == RFIStatus.CLOSED.value:
            rfi.closed_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(rfi)

        return rfi

    async def get_rfi(self, rfi_id: uuid.UUID) -> Optional[RFI]:
        result = await self.db.execute(
            select(RFI)
            .options(
                selectinload(RFI.responses).selectinload(RFIResponse.responder),
                selectinload(RFI.created_by),
                selectinload(RFI.assigned_to)
            )
            .where(RFI.id == rfi_id)
        )
        return result.scalar_one_or_none()

    async def get_rfis_by_project(
        self,
        project_id: uuid.UUID,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[list[RFI], int]:
        query = select(RFI).where(RFI.project_id == project_id)

        if status:
            query = query.where(RFI.status == status)
        if priority:
            query = query.where(RFI.priority == priority)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    RFI.rfi_number.ilike(search_term),
                    RFI.subject.ilike(search_term),
                    RFI.to_email.ilike(search_term)
                )
            )

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar()

        query = query.order_by(RFI.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        rfis = result.scalars().all()

        return list(rfis), total

    async def get_rfi_summary(self, project_id: uuid.UUID) -> dict:
        base_query = select(RFI).where(RFI.project_id == project_id)

        total = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )

        status_counts = {}
        for status in RFIStatus:
            result = await self.db.execute(
                select(func.count(RFI.id)).where(
                    RFI.project_id == project_id,
                    RFI.status == status.value
                )
            )
            status_counts[status.value] = result.scalar()

        overdue_result = await self.db.execute(
            select(func.count(RFI.id)).where(
                RFI.project_id == project_id,
                RFI.due_date < datetime.utcnow(),
                RFI.status.in_([RFIStatus.OPEN.value, RFIStatus.WAITING_RESPONSE.value])
            )
        )

        priority_result = await self.db.execute(
            select(RFI.priority, func.count(RFI.id))
            .where(RFI.project_id == project_id)
            .group_by(RFI.priority)
        )
        by_priority = {row[0]: row[1] for row in priority_result.all()}

        category_result = await self.db.execute(
            select(RFI.category, func.count(RFI.id))
            .where(RFI.project_id == project_id)
            .group_by(RFI.category)
        )
        by_category = {row[0]: row[1] for row in category_result.all()}

        return {
            'total_rfis': total.scalar(),
            'draft_count': status_counts.get(RFIStatus.DRAFT.value, 0),
            'open_count': status_counts.get(RFIStatus.OPEN.value, 0),
            'waiting_response_count': status_counts.get(RFIStatus.WAITING_RESPONSE.value, 0),
            'answered_count': status_counts.get(RFIStatus.ANSWERED.value, 0),
            'closed_count': status_counts.get(RFIStatus.CLOSED.value, 0),
            'overdue_count': overdue_result.scalar(),
            'by_priority': by_priority,
            'by_category': by_category
        }

    def _build_rfi_email_html(self, rfi: RFI) -> str:
        due_date_str = rfi.due_date.strftime('%Y-%m-%d') if rfi.due_date else 'N/A'
        location_str = rfi.location or 'N/A'
        drawing_str = rfi.drawing_reference or 'N/A'

        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #0F172A; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">Request for Information</h2>
                    <p style="margin: 5px 0 0; opacity: 0.9;">{rfi.rfi_number}</p>
                </div>

                <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px;">
                    <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <strong>Category:</strong>
                            </td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                {rfi.category.title()}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <strong>Priority:</strong>
                            </td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                {rfi.priority.title()}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <strong>Due Date:</strong>
                            </td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                {due_date_str}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                <strong>Location:</strong>
                            </td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                                {location_str}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;">
                                <strong>Drawing Ref:</strong>
                            </td>
                            <td style="padding: 8px 0;">
                                {drawing_str}
                            </td>
                        </tr>
                    </table>

                    <h3 style="color: #0F172A; margin-bottom: 10px;">Question:</h3>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0369A1;">
                        {rfi.question.replace(chr(10), '<br>')}
                    </div>

                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

                    <p style="color: #6b7280; font-size: 12px;">
                        Please reply directly to this email. Your response will be automatically tracked.
                        <br><br>
                        <strong>Reference:</strong> {rfi.rfi_number}
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _build_response_email_html(self, rfi: RFI, response_text: str) -> str:
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #0369A1;">
                    {response_text.replace(chr(10), '<br>')}
                </div>

                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

                <p style="color: #6b7280; font-size: 12px;">
                    <strong>Reference:</strong> {rfi.rfi_number}
                </p>
            </div>
        </body>
        </html>
        """
