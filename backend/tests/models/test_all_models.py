import uuid
from datetime import date, datetime
from decimal import Decimal

import pytest
from sqlalchemy import inspect, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.area import AreaProgress, AreaStatus, ConstructionArea
from app.models.audit import AuditAction, AuditLog
from app.models.chat import ChatConversation, ChatMessage
from app.models.checklist import (
    ChecklistInstance,
    ChecklistItemResponse,
    ChecklistItemTemplate,
    ChecklistStatus,
    ChecklistSubSection,
    ChecklistTemplate,
    ItemResponseStatus,
)
from app.models.consultant_assignment import AssignmentStatus, ConsultantAssignment
from app.models.contact import Contact
from app.models.document_analysis import DocumentAnalysis
from app.models.document_review import DocumentComment, DocumentReview, ReviewStatus
from app.models.equipment import ApprovalStatus, Equipment, EquipmentChecklist
from app.models.file import File
from app.models.inspection import Finding, FindingSeverity, FindingStatus, Inspection, InspectionStage, InspectionStatus
from app.models.inspection_template import InspectionConsultantType, InspectionStageTemplate
from app.models.material import Material
from app.models.meeting import Meeting, MeetingAttendee, MeetingStatus
from app.models.notification import Notification, NotificationCategory
from app.models.project import Project, ProjectMember, ProjectStatus, UserRole
from app.models.rfi import RFI, RFICategory, RFIEmailLog, RFIPriority, RFIStatus
from app.models.rfi import RFIResponse as RFIResponseModel
from app.models.user import User


# ---------------------------------------------------------------------------
# User Model
# ---------------------------------------------------------------------------
class TestUserModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert User.__tablename__ == "users"

    @pytest.mark.asyncio
    async def test_create_user(self, db: AsyncSession):
        user = User(
            id=uuid.uuid4(), email="model@test.com",
            full_name="Test User", role="admin", is_active=True,
        )
        db.add(user)
        await db.commit()
        result = await db.execute(select(User).where(User.email == "model@test.com"))
        fetched = result.scalar_one()
        assert fetched.email == "model@test.com"
        assert fetched.full_name == "Test User"

    @pytest.mark.asyncio
    async def test_default_is_active(self, db: AsyncSession):
        user = User(id=uuid.uuid4(), email="active@test.com")
        db.add(user)
        await db.commit()
        result = await db.execute(select(User).where(User.email == "active@test.com"))
        fetched = result.scalar_one()
        assert fetched.is_active is True

    @pytest.mark.asyncio
    async def test_default_language(self, db: AsyncSession):
        user = User(id=uuid.uuid4(), email="lang@test.com")
        db.add(user)
        await db.commit()
        result = await db.execute(select(User).where(User.email == "lang@test.com"))
        fetched = result.scalar_one()
        assert fetched.language == "en"

    @pytest.mark.asyncio
    async def test_nullable_fields(self, db: AsyncSession):
        user = User(id=uuid.uuid4(), email="nullable@test.com")
        db.add(user)
        await db.commit()
        result = await db.execute(select(User).where(User.email == "nullable@test.com"))
        fetched = result.scalar_one()
        assert fetched.firebase_uid is None
        assert fetched.password_hash is None
        assert fetched.full_name is None
        assert fetched.phone is None
        assert fetched.company is None
        assert fetched.role is None

    @pytest.mark.asyncio
    async def test_created_at_default(self, db: AsyncSession):
        user = User(id=uuid.uuid4(), email="ts@test.com")
        db.add(user)
        await db.commit()
        result = await db.execute(select(User).where(User.email == "ts@test.com"))
        fetched = result.scalar_one()
        assert fetched.created_at is not None

    @pytest.mark.asyncio
    async def test_column_types(self):
        mapper = inspect(User)
        cols = {c.key: c for c in mapper.columns}
        assert str(cols["email"].type) in ("VARCHAR(255)", "VARCHAR(length=255)")


# ---------------------------------------------------------------------------
# Project Model
# ---------------------------------------------------------------------------
class TestProjectModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert Project.__tablename__ == "projects"

    @pytest.mark.asyncio
    async def test_create_project(self, db: AsyncSession, admin_user: User):
        proj = Project(
            id=uuid.uuid4(), name="Model Test Project", code="MTP-01",
            status="active", created_by_id=admin_user.id,
        )
        db.add(proj)
        await db.commit()
        result = await db.execute(select(Project).where(Project.code == "MTP-01"))
        fetched = result.scalar_one()
        assert fetched.name == "Model Test Project"

    @pytest.mark.asyncio
    async def test_default_status(self, db: AsyncSession, admin_user: User):
        proj = Project(
            id=uuid.uuid4(), name="Def Project", code="DEF-01",
            created_by_id=admin_user.id,
        )
        db.add(proj)
        await db.commit()
        result = await db.execute(select(Project).where(Project.code == "DEF-01"))
        fetched = result.scalar_one()
        assert fetched.status == "active"

    @pytest.mark.asyncio
    async def test_nullable_fields(self, db: AsyncSession, admin_user: User):
        proj = Project(
            id=uuid.uuid4(), name="Null Project", code="NUL-01",
            created_by_id=admin_user.id,
        )
        db.add(proj)
        await db.commit()
        result = await db.execute(select(Project).where(Project.code == "NUL-01"))
        fetched = result.scalar_one()
        assert fetched.description is None
        assert fetched.address is None
        assert fetched.start_date is None
        assert fetched.estimated_end_date is None

    @pytest.mark.asyncio
    async def test_timestamps(self, db: AsyncSession, admin_user: User):
        proj = Project(
            id=uuid.uuid4(), name="TS Project", code="TSP-01",
            created_by_id=admin_user.id,
        )
        db.add(proj)
        await db.commit()
        result = await db.execute(select(Project).where(Project.code == "TSP-01"))
        fetched = result.scalar_one()
        assert fetched.created_at is not None
        assert fetched.updated_at is not None

    def test_project_status_enum(self):
        assert ProjectStatus.ACTIVE.value == "active"
        assert ProjectStatus.ON_HOLD.value == "on_hold"
        assert ProjectStatus.COMPLETED.value == "completed"
        assert ProjectStatus.ARCHIVED.value == "archived"

    def test_user_role_enum(self):
        assert UserRole.PROJECT_ADMIN.value == "project_admin"
        assert UserRole.CONTRACTOR.value == "contractor"
        assert UserRole.CONSULTANT.value == "consultant"


# ---------------------------------------------------------------------------
# ProjectMember Model
# ---------------------------------------------------------------------------
class TestProjectMemberModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert ProjectMember.__tablename__ == "project_members"

    @pytest.mark.asyncio
    async def test_create_member(self, db: AsyncSession, admin_user: User):
        proj = Project(
            id=uuid.uuid4(), name="Mem Project", code="MEM-01",
            status="active", created_by_id=admin_user.id,
        )
        db.add(proj)
        await db.flush()
        member = ProjectMember(
            project_id=proj.id, user_id=admin_user.id, role="project_admin",
        )
        db.add(member)
        await db.commit()
        result = await db.execute(
            select(ProjectMember).where(ProjectMember.project_id == proj.id)
        )
        fetched = result.scalar_one()
        assert fetched.role == "project_admin"

    @pytest.mark.asyncio
    async def test_added_at_default(self, db: AsyncSession, admin_user: User):
        proj = Project(
            id=uuid.uuid4(), name="AT Project", code="ATP-01",
            status="active", created_by_id=admin_user.id,
        )
        db.add(proj)
        await db.flush()
        member = ProjectMember(
            project_id=proj.id, user_id=admin_user.id, role="contractor",
        )
        db.add(member)
        await db.commit()
        result = await db.execute(
            select(ProjectMember).where(ProjectMember.project_id == proj.id)
        )
        fetched = result.scalar_one()
        assert fetched.added_at is not None


# ---------------------------------------------------------------------------
# Equipment Model
# ---------------------------------------------------------------------------
class TestEquipmentModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert Equipment.__tablename__ == "equipment"

    @pytest.mark.asyncio
    async def test_create_equipment(self, db: AsyncSession, project: Project, admin_user: User):
        eq = Equipment(
            id=uuid.uuid4(), project_id=project.id, name="Test Generator",
            equipment_type="Power", manufacturer="Caterpillar",
            model_number="CAT-3500", serial_number="SN123",
            created_by_id=admin_user.id,
        )
        db.add(eq)
        await db.commit()
        result = await db.execute(select(Equipment).where(Equipment.name == "Test Generator"))
        fetched = result.scalar_one()
        assert fetched.equipment_type == "Power"
        assert fetched.manufacturer == "Caterpillar"

    @pytest.mark.asyncio
    async def test_default_status(self, db: AsyncSession, project: Project):
        eq = Equipment(
            id=uuid.uuid4(), project_id=project.id, name="Default Status Eq",
        )
        db.add(eq)
        await db.commit()
        result = await db.execute(select(Equipment).where(Equipment.name == "Default Status Eq"))
        fetched = result.scalar_one()
        assert fetched.status == "draft"

    @pytest.mark.asyncio
    async def test_nullable_fields(self, db: AsyncSession, project: Project):
        eq = Equipment(
            id=uuid.uuid4(), project_id=project.id, name="Null Eq",
        )
        db.add(eq)
        await db.commit()
        result = await db.execute(select(Equipment).where(Equipment.name == "Null Eq"))
        fetched = result.scalar_one()
        assert fetched.equipment_type is None
        assert fetched.manufacturer is None
        assert fetched.model_number is None
        assert fetched.serial_number is None
        assert fetched.notes is None
        assert fetched.installation_date is None
        assert fetched.warranty_expiry is None

    def test_approval_status_enum(self):
        assert ApprovalStatus.DRAFT.value == "draft"
        assert ApprovalStatus.SUBMITTED.value == "submitted"
        assert ApprovalStatus.APPROVED.value == "approved"
        assert ApprovalStatus.REJECTED.value == "rejected"

    @pytest.mark.asyncio
    async def test_timestamps(self, db: AsyncSession, project: Project):
        eq = Equipment(id=uuid.uuid4(), project_id=project.id, name="TS Eq")
        db.add(eq)
        await db.commit()
        result = await db.execute(select(Equipment).where(Equipment.name == "TS Eq"))
        fetched = result.scalar_one()
        assert fetched.created_at is not None
        assert fetched.updated_at is not None


# ---------------------------------------------------------------------------
# EquipmentChecklist Model
# ---------------------------------------------------------------------------
class TestEquipmentChecklistModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert EquipmentChecklist.__tablename__ == "equipment_checklists"

    @pytest.mark.asyncio
    async def test_create_checklist(self, db: AsyncSession, project: Project):
        eq = Equipment(id=uuid.uuid4(), project_id=project.id, name="CL Eq")
        db.add(eq)
        await db.flush()
        cl = EquipmentChecklist(
            id=uuid.uuid4(), equipment_id=eq.id,
            checklist_name="Safety CL", items=[{"label": "Check A"}],
        )
        db.add(cl)
        await db.commit()
        result = await db.execute(
            select(EquipmentChecklist).where(EquipmentChecklist.equipment_id == eq.id)
        )
        fetched = result.scalar_one()
        assert fetched.checklist_name == "Safety CL"


# ---------------------------------------------------------------------------
# Material Model
# ---------------------------------------------------------------------------
class TestMaterialModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert Material.__tablename__ == "materials"

    @pytest.mark.asyncio
    async def test_create_material(self, db: AsyncSession, project: Project, admin_user: User):
        mat = Material(
            id=uuid.uuid4(), project_id=project.id, name="Steel Rebar",
            material_type="Structural", quantity=Decimal("100.50"), unit="kg",
            created_by_id=admin_user.id,
        )
        db.add(mat)
        await db.commit()
        result = await db.execute(select(Material).where(Material.name == "Steel Rebar"))
        fetched = result.scalar_one()
        assert fetched.material_type == "Structural"
        assert fetched.unit == "kg"

    @pytest.mark.asyncio
    async def test_default_status(self, db: AsyncSession, project: Project):
        mat = Material(id=uuid.uuid4(), project_id=project.id, name="Default Mat")
        db.add(mat)
        await db.commit()
        result = await db.execute(select(Material).where(Material.name == "Default Mat"))
        fetched = result.scalar_one()
        assert fetched.status == "draft"

    @pytest.mark.asyncio
    async def test_nullable_fields(self, db: AsyncSession, project: Project):
        mat = Material(id=uuid.uuid4(), project_id=project.id, name="Null Mat")
        db.add(mat)
        await db.commit()
        result = await db.execute(select(Material).where(Material.name == "Null Mat"))
        fetched = result.scalar_one()
        assert fetched.material_type is None
        assert fetched.manufacturer is None
        assert fetched.quantity is None
        assert fetched.unit is None
        assert fetched.notes is None
        assert fetched.expected_delivery is None
        assert fetched.actual_delivery is None
        assert fetched.storage_location is None

    @pytest.mark.asyncio
    async def test_timestamps(self, db: AsyncSession, project: Project):
        mat = Material(id=uuid.uuid4(), project_id=project.id, name="TS Mat")
        db.add(mat)
        await db.commit()
        result = await db.execute(select(Material).where(Material.name == "TS Mat"))
        fetched = result.scalar_one()
        assert fetched.created_at is not None
        assert fetched.updated_at is not None


# ---------------------------------------------------------------------------
# Meeting Model
# ---------------------------------------------------------------------------
class TestMeetingModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert Meeting.__tablename__ == "meetings"

    @pytest.mark.asyncio
    async def test_create_meeting(self, db: AsyncSession, project: Project, admin_user: User):
        mtg = Meeting(
            id=uuid.uuid4(), project_id=project.id, title="Safety Meeting",
            scheduled_date=datetime.utcnow(), created_by_id=admin_user.id,
        )
        db.add(mtg)
        await db.commit()
        result = await db.execute(select(Meeting).where(Meeting.title == "Safety Meeting"))
        fetched = result.scalar_one()
        assert fetched.title == "Safety Meeting"

    @pytest.mark.asyncio
    async def test_default_status(self, db: AsyncSession, project: Project):
        mtg = Meeting(
            id=uuid.uuid4(), project_id=project.id, title="Def Meeting",
            scheduled_date=datetime.utcnow(),
        )
        db.add(mtg)
        await db.commit()
        result = await db.execute(select(Meeting).where(Meeting.title == "Def Meeting"))
        fetched = result.scalar_one()
        assert fetched.status == "scheduled"

    def test_meeting_status_enum(self):
        assert MeetingStatus.SCHEDULED.value == "scheduled"
        assert MeetingStatus.COMPLETED.value == "completed"
        assert MeetingStatus.CANCELLED.value == "cancelled"

    @pytest.mark.asyncio
    async def test_nullable_fields(self, db: AsyncSession, project: Project):
        mtg = Meeting(
            id=uuid.uuid4(), project_id=project.id, title="Null Meeting",
            scheduled_date=datetime.utcnow(),
        )
        db.add(mtg)
        await db.commit()
        result = await db.execute(select(Meeting).where(Meeting.title == "Null Meeting"))
        fetched = result.scalar_one()
        assert fetched.description is None
        assert fetched.meeting_type is None
        assert fetched.location is None
        assert fetched.google_event_id is None
        assert fetched.summary is None


# ---------------------------------------------------------------------------
# MeetingAttendee Model
# ---------------------------------------------------------------------------
class TestMeetingAttendeeModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert MeetingAttendee.__tablename__ == "meeting_attendees"

    @pytest.mark.asyncio
    async def test_create_attendee(self, db: AsyncSession, project: Project, admin_user: User):
        mtg = Meeting(
            id=uuid.uuid4(), project_id=project.id, title="Att Meeting",
            scheduled_date=datetime.utcnow(),
        )
        db.add(mtg)
        await db.flush()
        att = MeetingAttendee(
            id=uuid.uuid4(), meeting_id=mtg.id, user_id=admin_user.id, role="lead",
        )
        db.add(att)
        await db.commit()
        result = await db.execute(
            select(MeetingAttendee).where(MeetingAttendee.meeting_id == mtg.id)
        )
        fetched = result.scalar_one()
        assert fetched.role == "lead"
        assert fetched.confirmed is False


# ---------------------------------------------------------------------------
# Contact Model
# ---------------------------------------------------------------------------
class TestContactModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert Contact.__tablename__ == "contacts"

    @pytest.mark.asyncio
    async def test_create_contact(self, db: AsyncSession, project: Project):
        contact = Contact(
            id=uuid.uuid4(), project_id=project.id,
            contact_type="contractor", contact_name="John Doe",
            email="john@test.com", phone="+1234567890",
        )
        db.add(contact)
        await db.commit()
        result = await db.execute(select(Contact).where(Contact.contact_name == "John Doe"))
        fetched = result.scalar_one()
        assert fetched.contact_type == "contractor"
        assert fetched.email == "john@test.com"

    @pytest.mark.asyncio
    async def test_default_is_primary(self, db: AsyncSession, project: Project):
        contact = Contact(
            id=uuid.uuid4(), project_id=project.id,
            contact_type="sub", contact_name="Jane",
        )
        db.add(contact)
        await db.commit()
        result = await db.execute(select(Contact).where(Contact.contact_name == "Jane"))
        fetched = result.scalar_one()
        assert fetched.is_primary is False

    @pytest.mark.asyncio
    async def test_nullable_fields(self, db: AsyncSession, project: Project):
        contact = Contact(
            id=uuid.uuid4(), project_id=project.id,
            contact_type="vendor", contact_name="Null Contact",
        )
        db.add(contact)
        await db.commit()
        result = await db.execute(select(Contact).where(Contact.contact_name == "Null Contact"))
        fetched = result.scalar_one()
        assert fetched.company_name is None
        assert fetched.email is None
        assert fetched.phone is None
        assert fetched.role_description is None


# ---------------------------------------------------------------------------
# ConstructionArea Model
# ---------------------------------------------------------------------------
class TestConstructionAreaModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert ConstructionArea.__tablename__ == "construction_areas"

    @pytest.mark.asyncio
    async def test_create_area(self, db: AsyncSession, project: Project):
        area = ConstructionArea(
            id=uuid.uuid4(), project_id=project.id, name="Floor 1",
            area_type="residential", floor_number=1, area_code="FL-01",
            total_units=10,
        )
        db.add(area)
        await db.commit()
        result = await db.execute(
            select(ConstructionArea).where(ConstructionArea.name == "Floor 1")
        )
        fetched = result.scalar_one()
        assert fetched.floor_number == 1
        assert fetched.total_units == 10

    @pytest.mark.asyncio
    async def test_default_total_units(self, db: AsyncSession, project: Project):
        area = ConstructionArea(
            id=uuid.uuid4(), project_id=project.id, name="Default Units Area",
        )
        db.add(area)
        await db.commit()
        result = await db.execute(
            select(ConstructionArea).where(ConstructionArea.name == "Default Units Area")
        )
        fetched = result.scalar_one()
        assert fetched.total_units == 1

    @pytest.mark.asyncio
    async def test_default_progress(self, db: AsyncSession, project: Project):
        area = ConstructionArea(
            id=uuid.uuid4(), project_id=project.id, name="Progress Area",
        )
        db.add(area)
        await db.commit()
        result = await db.execute(
            select(ConstructionArea).where(ConstructionArea.name == "Progress Area")
        )
        fetched = result.scalar_one()
        assert fetched.current_progress == Decimal("0")

    @pytest.mark.asyncio
    async def test_parent_child_relationship(self, db: AsyncSession, project: Project):
        parent = ConstructionArea(
            id=uuid.uuid4(), project_id=project.id, name="Parent Area",
        )
        db.add(parent)
        await db.flush()
        child = ConstructionArea(
            id=uuid.uuid4(), project_id=project.id, name="Child Area",
            parent_id=parent.id,
        )
        db.add(child)
        await db.commit()
        result = await db.execute(
            select(ConstructionArea).where(ConstructionArea.name == "Child Area")
        )
        fetched = result.scalar_one()
        assert fetched.parent_id == parent.id

    def test_area_status_enum(self):
        assert AreaStatus.NOT_STARTED.value == "not_started"
        assert AreaStatus.IN_PROGRESS.value == "in_progress"
        assert AreaStatus.COMPLETED.value == "completed"


# ---------------------------------------------------------------------------
# AreaProgress Model
# ---------------------------------------------------------------------------
class TestAreaProgressModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert AreaProgress.__tablename__ == "area_progress"

    @pytest.mark.asyncio
    async def test_create_progress(self, db: AsyncSession, project: Project, admin_user: User):
        area = ConstructionArea(
            id=uuid.uuid4(), project_id=project.id, name="Prog Area",
        )
        db.add(area)
        await db.flush()
        prog = AreaProgress(
            id=uuid.uuid4(), area_id=area.id,
            progress_percentage=Decimal("50.00"), reported_by_id=admin_user.id,
        )
        db.add(prog)
        await db.commit()
        result = await db.execute(
            select(AreaProgress).where(AreaProgress.area_id == area.id)
        )
        fetched = result.scalar_one()
        assert fetched.progress_percentage == Decimal("50.00")


# ---------------------------------------------------------------------------
# RFI Model
# ---------------------------------------------------------------------------
class TestRFIModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert RFI.__tablename__ == "rfis"

    @pytest.mark.asyncio
    async def test_create_rfi(self, db: AsyncSession, project: Project, admin_user: User):
        rfi = RFI(
            id=uuid.uuid4(), project_id=project.id,
            rfi_number="RFI-001", subject="Foundation Question",
            question="What mix?", to_email="eng@test.com",
            created_by_id=admin_user.id,
        )
        db.add(rfi)
        await db.commit()
        result = await db.execute(select(RFI).where(RFI.rfi_number == "RFI-001"))
        fetched = result.scalar_one()
        assert fetched.subject == "Foundation Question"

    @pytest.mark.asyncio
    async def test_default_status(self, db: AsyncSession, project: Project, admin_user: User):
        rfi = RFI(
            id=uuid.uuid4(), project_id=project.id, rfi_number="RFI-DEF",
            subject="S", question="Q", to_email="e@t.com", created_by_id=admin_user.id,
        )
        db.add(rfi)
        await db.commit()
        result = await db.execute(select(RFI).where(RFI.rfi_number == "RFI-DEF"))
        fetched = result.scalar_one()
        assert fetched.status == "draft"

    @pytest.mark.asyncio
    async def test_default_category_and_priority(self, db: AsyncSession, project: Project, admin_user: User):
        rfi = RFI(
            id=uuid.uuid4(), project_id=project.id, rfi_number="RFI-CAT",
            subject="S", question="Q", to_email="e@t.com", created_by_id=admin_user.id,
        )
        db.add(rfi)
        await db.commit()
        result = await db.execute(select(RFI).where(RFI.rfi_number == "RFI-CAT"))
        fetched = result.scalar_one()
        assert fetched.category == "other"
        assert fetched.priority == "medium"

    def test_rfi_enums(self):
        assert RFIStatus.DRAFT.value == "draft"
        assert RFIStatus.OPEN.value == "open"
        assert RFIStatus.WAITING_RESPONSE.value == "waiting_response"
        assert RFIPriority.LOW.value == "low"
        assert RFIPriority.URGENT.value == "urgent"
        assert RFICategory.DESIGN.value == "design"
        assert RFICategory.OTHER.value == "other"

    @pytest.mark.asyncio
    async def test_nullable_fields(self, db: AsyncSession, project: Project, admin_user: User):
        rfi = RFI(
            id=uuid.uuid4(), project_id=project.id, rfi_number="RFI-NULL",
            subject="S", question="Q", to_email="e@t.com", created_by_id=admin_user.id,
        )
        db.add(rfi)
        await db.commit()
        result = await db.execute(select(RFI).where(RFI.rfi_number == "RFI-NULL"))
        fetched = result.scalar_one()
        assert fetched.email_thread_id is None
        assert fetched.due_date is None
        assert fetched.responded_at is None
        assert fetched.closed_at is None
        assert fetched.sent_at is None
        assert fetched.assigned_to_id is None
        assert fetched.to_name is None
        assert fetched.location is None
        assert fetched.drawing_reference is None
        assert fetched.specification_reference is None


# ---------------------------------------------------------------------------
# RFIResponse Model
# ---------------------------------------------------------------------------
class TestRFIResponseModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert RFIResponseModel.__tablename__ == "rfi_responses"

    @pytest.mark.asyncio
    async def test_create_rfi_response(self, db: AsyncSession, project: Project, admin_user: User):
        rfi = RFI(
            id=uuid.uuid4(), project_id=project.id, rfi_number="RFI-RESP",
            subject="S", question="Q", to_email="e@t.com", created_by_id=admin_user.id,
        )
        db.add(rfi)
        await db.flush()
        resp = RFIResponseModel(
            id=uuid.uuid4(), rfi_id=rfi.id,
            response_text="Use C30/37", from_email="eng@test.com",
        )
        db.add(resp)
        await db.commit()
        result = await db.execute(
            select(RFIResponseModel).where(RFIResponseModel.rfi_id == rfi.id)
        )
        fetched = result.scalar_one()
        assert fetched.response_text == "Use C30/37"
        assert fetched.source == "email"
        assert fetched.is_internal is False


# ---------------------------------------------------------------------------
# RFIEmailLog Model
# ---------------------------------------------------------------------------
class TestRFIEmailLogModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert RFIEmailLog.__tablename__ == "rfi_email_logs"

    @pytest.mark.asyncio
    async def test_create_email_log(self, db: AsyncSession, project: Project, admin_user: User):
        rfi = RFI(
            id=uuid.uuid4(), project_id=project.id, rfi_number="RFI-LOG",
            subject="S", question="Q", to_email="e@t.com", created_by_id=admin_user.id,
        )
        db.add(rfi)
        await db.flush()
        log = RFIEmailLog(
            id=uuid.uuid4(), rfi_id=rfi.id, event_type="sent",
            from_email="me@t.com", to_email="eng@t.com", subject="RFI-001",
        )
        db.add(log)
        await db.commit()
        result = await db.execute(
            select(RFIEmailLog).where(RFIEmailLog.rfi_id == rfi.id)
        )
        fetched = result.scalar_one()
        assert fetched.event_type == "sent"


# ---------------------------------------------------------------------------
# ApprovalRequest Model
# ---------------------------------------------------------------------------
class TestApprovalRequestModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert ApprovalRequest.__tablename__ == "approval_requests"

    @pytest.mark.asyncio
    async def test_create_approval_request(self, db: AsyncSession, project: Project, admin_user: User):
        eq = Equipment(id=uuid.uuid4(), project_id=project.id, name="Appr Eq")
        db.add(eq)
        await db.flush()
        ar = ApprovalRequest(
            id=uuid.uuid4(), project_id=project.id,
            entity_type="equipment", entity_id=eq.id,
            created_by_id=admin_user.id,
        )
        db.add(ar)
        await db.commit()
        result = await db.execute(
            select(ApprovalRequest).where(ApprovalRequest.entity_id == eq.id)
        )
        fetched = result.scalar_one()
        assert fetched.current_status == "submitted"
        assert fetched.current_step == 1


# ---------------------------------------------------------------------------
# ApprovalStep Model
# ---------------------------------------------------------------------------
class TestApprovalStepModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert ApprovalStep.__tablename__ == "approval_steps"

    @pytest.mark.asyncio
    async def test_create_step(self, db: AsyncSession, project: Project, admin_user: User):
        eq = Equipment(id=uuid.uuid4(), project_id=project.id, name="Step Eq")
        db.add(eq)
        await db.flush()
        ar = ApprovalRequest(
            id=uuid.uuid4(), project_id=project.id,
            entity_type="equipment", entity_id=eq.id,
            created_by_id=admin_user.id,
        )
        db.add(ar)
        await db.flush()
        step = ApprovalStep(
            id=uuid.uuid4(), approval_request_id=ar.id,
            step_order=1, approver_role="admin",
        )
        db.add(step)
        await db.commit()
        result = await db.execute(
            select(ApprovalStep).where(ApprovalStep.approval_request_id == ar.id)
        )
        fetched = result.scalar_one()
        assert fetched.status == "pending"
        assert fetched.comments is None


# ---------------------------------------------------------------------------
# Inspection Model
# ---------------------------------------------------------------------------
class TestInspectionModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert Inspection.__tablename__ == "inspections"

    @pytest.mark.asyncio
    async def test_create_inspection(self, db: AsyncSession, project: Project, admin_user: User):
        ct = InspectionConsultantType(
            id=uuid.uuid4(), name="Structural", name_he="קונסטרוקציה",
        )
        db.add(ct)
        await db.flush()
        insp = Inspection(
            id=uuid.uuid4(), project_id=project.id,
            consultant_type_id=ct.id, scheduled_date=datetime.utcnow(),
            created_by_id=admin_user.id,
        )
        db.add(insp)
        await db.commit()
        result = await db.execute(
            select(Inspection).where(Inspection.project_id == project.id)
        )
        fetched = result.scalar_one()
        assert fetched.status == "pending"

    @pytest.mark.asyncio
    async def test_default_status(self, db: AsyncSession, project: Project):
        ct = InspectionConsultantType(
            id=uuid.uuid4(), name="Arch", name_he="אדריכל",
        )
        db.add(ct)
        await db.flush()
        insp = Inspection(
            id=uuid.uuid4(), project_id=project.id,
            consultant_type_id=ct.id, scheduled_date=datetime.utcnow(),
        )
        db.add(insp)
        await db.commit()
        result = await db.execute(
            select(Inspection).where(Inspection.consultant_type_id == ct.id)
        )
        fetched = result.scalar_one()
        assert fetched.status == "pending"

    def test_inspection_status_enum(self):
        assert InspectionStatus.PENDING.value == "pending"
        assert InspectionStatus.IN_PROGRESS.value == "in_progress"
        assert InspectionStatus.COMPLETED.value == "completed"
        assert InspectionStatus.FAILED.value == "failed"


# ---------------------------------------------------------------------------
# Finding Model
# ---------------------------------------------------------------------------
class TestFindingModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert Finding.__tablename__ == "findings"

    @pytest.mark.asyncio
    async def test_create_finding(self, db: AsyncSession, project: Project, admin_user: User):
        ct = InspectionConsultantType(
            id=uuid.uuid4(), name="Elec", name_he="חשמל",
        )
        db.add(ct)
        await db.flush()
        insp = Inspection(
            id=uuid.uuid4(), project_id=project.id,
            consultant_type_id=ct.id, scheduled_date=datetime.utcnow(),
        )
        db.add(insp)
        await db.flush()
        finding = Finding(
            id=uuid.uuid4(), inspection_id=insp.id,
            title="Crack found", severity="high", created_by_id=admin_user.id,
        )
        db.add(finding)
        await db.commit()
        result = await db.execute(
            select(Finding).where(Finding.inspection_id == insp.id)
        )
        fetched = result.scalar_one()
        assert fetched.title == "Crack found"
        assert fetched.status == "open"

    def test_finding_enums(self):
        assert FindingSeverity.LOW.value == "low"
        assert FindingSeverity.CRITICAL.value == "critical"
        assert FindingStatus.OPEN.value == "open"
        assert FindingStatus.RESOLVED.value == "resolved"


# ---------------------------------------------------------------------------
# InspectionStage Model
# ---------------------------------------------------------------------------
class TestInspectionStageModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert InspectionStage.__tablename__ == "inspection_stages"

    @pytest.mark.asyncio
    async def test_create_stage(self, db: AsyncSession):
        ct = InspectionConsultantType(
            id=uuid.uuid4(), name="Plumb", name_he="אינסטלציה",
        )
        db.add(ct)
        await db.flush()
        stage = InspectionStage(
            id=uuid.uuid4(), consultant_type_id=ct.id,
            name="Rough-in Check", order=1,
        )
        db.add(stage)
        await db.commit()
        result = await db.execute(
            select(InspectionStage).where(InspectionStage.consultant_type_id == ct.id)
        )
        fetched = result.scalar_one()
        assert fetched.name == "Rough-in Check"
        assert fetched.order == 1


# ---------------------------------------------------------------------------
# InspectionConsultantType & InspectionStageTemplate Models
# ---------------------------------------------------------------------------
class TestInspectionTemplateModels:
    @pytest.mark.asyncio
    async def test_consultant_type_table(self):
        assert InspectionConsultantType.__tablename__ == "inspection_consultant_types"

    @pytest.mark.asyncio
    async def test_stage_template_table(self):
        assert InspectionStageTemplate.__tablename__ == "inspection_stage_templates"

    @pytest.mark.asyncio
    async def test_create_consultant_type(self, db: AsyncSession):
        ct = InspectionConsultantType(
            id=uuid.uuid4(), name="Fire Safety", name_he="בטיחות אש",
        )
        db.add(ct)
        await db.commit()
        result = await db.execute(
            select(InspectionConsultantType).where(InspectionConsultantType.name == "Fire Safety")
        )
        fetched = result.scalar_one()
        assert fetched.is_active is True

    @pytest.mark.asyncio
    async def test_create_stage_template(self, db: AsyncSession):
        ct = InspectionConsultantType(
            id=uuid.uuid4(), name="HVAC", name_he="מיזוג",
        )
        db.add(ct)
        await db.flush()
        tpl = InspectionStageTemplate(
            id=uuid.uuid4(), consultant_type_id=ct.id,
            name="Ductwork", name_he="צנרת", stage_order=1,
        )
        db.add(tpl)
        await db.commit()
        result = await db.execute(
            select(InspectionStageTemplate).where(InspectionStageTemplate.consultant_type_id == ct.id)
        )
        fetched = result.scalar_one()
        assert fetched.stage_order == 1
        assert fetched.is_active is True


# ---------------------------------------------------------------------------
# File Model
# ---------------------------------------------------------------------------
class TestFileModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert File.__tablename__ == "files"

    @pytest.mark.asyncio
    async def test_create_file(self, db: AsyncSession, project: Project, admin_user: User):
        f = File(
            id=uuid.uuid4(), project_id=project.id,
            entity_type="equipment", entity_id=uuid.uuid4(),
            filename="plan.pdf", storage_path="/files/plan.pdf",
            file_type="application/pdf", file_size=1024,
            uploaded_by_id=admin_user.id,
        )
        db.add(f)
        await db.commit()
        result = await db.execute(select(File).where(File.filename == "plan.pdf"))
        fetched = result.scalar_one()
        assert fetched.file_size == 1024
        assert fetched.storage_path == "/files/plan.pdf"


# ---------------------------------------------------------------------------
# Checklist Models
# ---------------------------------------------------------------------------
class TestChecklistModels:
    @pytest.mark.asyncio
    async def test_template_table(self):
        assert ChecklistTemplate.__tablename__ == "checklist_templates"

    @pytest.mark.asyncio
    async def test_subsection_table(self):
        assert ChecklistSubSection.__tablename__ == "checklist_subsections"

    @pytest.mark.asyncio
    async def test_item_template_table(self):
        assert ChecklistItemTemplate.__tablename__ == "checklist_item_templates"

    @pytest.mark.asyncio
    async def test_instance_table(self):
        assert ChecklistInstance.__tablename__ == "checklist_instances"

    @pytest.mark.asyncio
    async def test_item_response_table(self):
        assert ChecklistItemResponse.__tablename__ == "checklist_item_responses"

    def test_checklist_status_enum(self):
        assert ChecklistStatus.PENDING.value == "pending"
        assert ChecklistStatus.IN_PROGRESS.value == "in_progress"
        assert ChecklistStatus.COMPLETED.value == "completed"
        assert ChecklistStatus.CANCELLED.value == "cancelled"

    def test_item_response_status_enum(self):
        assert ItemResponseStatus.PENDING.value == "pending"
        assert ItemResponseStatus.APPROVED.value == "approved"
        assert ItemResponseStatus.REJECTED.value == "rejected"
        assert ItemResponseStatus.NOT_APPLICABLE.value == "not_applicable"

    @pytest.mark.asyncio
    async def test_create_template(self, db: AsyncSession, project: Project, admin_user: User):
        tpl = ChecklistTemplate(
            id=uuid.uuid4(), project_id=project.id,
            name="Safety CL", level="project", group="Safety",
            created_by_id=admin_user.id,
        )
        db.add(tpl)
        await db.commit()
        result = await db.execute(
            select(ChecklistTemplate).where(ChecklistTemplate.name == "Safety CL")
        )
        fetched = result.scalar_one()
        assert fetched.level == "project"

    @pytest.mark.asyncio
    async def test_create_full_hierarchy(self, db: AsyncSession, project: Project, admin_user: User):
        tpl = ChecklistTemplate(
            id=uuid.uuid4(), project_id=project.id,
            name="Full CL", level="unit", group="Build",
            created_by_id=admin_user.id,
        )
        db.add(tpl)
        await db.flush()
        sub = ChecklistSubSection(
            id=uuid.uuid4(), template_id=tpl.id, name="Section A", order=0,
        )
        db.add(sub)
        await db.flush()
        item = ChecklistItemTemplate(
            id=uuid.uuid4(), subsection_id=sub.id, name="Check wiring",
        )
        db.add(item)
        await db.flush()
        inst = ChecklistInstance(
            id=uuid.uuid4(), template_id=tpl.id, project_id=project.id,
            unit_identifier="Unit-A1", created_by_id=admin_user.id,
        )
        db.add(inst)
        await db.flush()
        resp = ChecklistItemResponse(
            id=uuid.uuid4(), instance_id=inst.id, item_template_id=item.id,
        )
        db.add(resp)
        await db.commit()
        result = await db.execute(
            select(ChecklistItemResponse).where(ChecklistItemResponse.instance_id == inst.id)
        )
        fetched = result.scalar_one()
        assert fetched.status == "pending"

    @pytest.mark.asyncio
    async def test_item_template_boolean_defaults(self, db: AsyncSession, project: Project, admin_user: User):
        tpl = ChecklistTemplate(
            id=uuid.uuid4(), project_id=project.id,
            name="Bool CL", level="unit", group="G",
            created_by_id=admin_user.id,
        )
        db.add(tpl)
        await db.flush()
        sub = ChecklistSubSection(
            id=uuid.uuid4(), template_id=tpl.id, name="Sec", order=0,
        )
        db.add(sub)
        await db.flush()
        item = ChecklistItemTemplate(
            id=uuid.uuid4(), subsection_id=sub.id, name="Item",
        )
        db.add(item)
        await db.commit()
        result = await db.execute(
            select(ChecklistItemTemplate).where(ChecklistItemTemplate.subsection_id == sub.id)
        )
        fetched = result.scalar_one()
        assert fetched.must_image is False
        assert fetched.must_note is False
        assert fetched.must_signature is False


# ---------------------------------------------------------------------------
# AuditLog Model
# ---------------------------------------------------------------------------
class TestAuditLogModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert AuditLog.__tablename__ == "audit_logs"

    @pytest.mark.asyncio
    async def test_create_audit_log(self, db: AsyncSession, admin_user: User, project: Project):
        log = AuditLog(
            id=uuid.uuid4(), project_id=project.id, user_id=admin_user.id,
            entity_type="equipment", entity_id=uuid.uuid4(),
            action="create", new_values={"name": "Gen"},
        )
        db.add(log)
        await db.commit()
        result = await db.execute(
            select(AuditLog).where(AuditLog.user_id == admin_user.id)
        )
        fetched = result.scalar_one()
        assert fetched.action == "create"

    def test_audit_action_enum(self):
        assert AuditAction.CREATE.value == "create"
        assert AuditAction.UPDATE.value == "update"
        assert AuditAction.DELETE.value == "delete"
        assert AuditAction.STATUS_CHANGE.value == "status_change"
        assert AuditAction.APPROVAL.value == "approval"
        assert AuditAction.REJECTION.value == "rejection"


# ---------------------------------------------------------------------------
# Notification Model
# ---------------------------------------------------------------------------
class TestNotificationModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert Notification.__tablename__ == "notifications"

    @pytest.mark.asyncio
    async def test_create_notification(self, db: AsyncSession, admin_user: User):
        notif = Notification(
            id=uuid.uuid4(), user_id=admin_user.id,
            category="approval", title="New Approval",
            message="Equipment needs review",
        )
        db.add(notif)
        await db.commit()
        result = await db.execute(
            select(Notification).where(Notification.user_id == admin_user.id)
        )
        fetched = result.scalar_one()
        assert fetched.is_read is False
        assert fetched.title == "New Approval"

    def test_notification_category_enum(self):
        assert NotificationCategory.APPROVAL.value == "approval"
        assert NotificationCategory.INSPECTION.value == "inspection"
        assert NotificationCategory.UPDATE.value == "update"
        assert NotificationCategory.GENERAL.value == "general"


# ---------------------------------------------------------------------------
# ChatConversation & ChatMessage Models
# ---------------------------------------------------------------------------
class TestChatModels:
    @pytest.mark.asyncio
    async def test_conversation_table(self):
        assert ChatConversation.__tablename__ == "chat_conversations"

    @pytest.mark.asyncio
    async def test_message_table(self):
        assert ChatMessage.__tablename__ == "chat_messages"

    @pytest.mark.asyncio
    async def test_create_conversation_and_message(self, db: AsyncSession, project: Project, admin_user: User):
        conv = ChatConversation(
            id=uuid.uuid4(), project_id=project.id, user_id=admin_user.id,
            title="Test Chat",
        )
        db.add(conv)
        await db.flush()
        msg = ChatMessage(
            id=uuid.uuid4(), conversation_id=conv.id,
            role="user", content="Hello",
        )
        db.add(msg)
        await db.commit()
        result = await db.execute(
            select(ChatMessage).where(ChatMessage.conversation_id == conv.id)
        )
        fetched = result.scalar_one()
        assert fetched.role == "user"
        assert fetched.content == "Hello"

    @pytest.mark.asyncio
    async def test_message_nullable_fields(self, db: AsyncSession, project: Project, admin_user: User):
        conv = ChatConversation(
            id=uuid.uuid4(), project_id=project.id, user_id=admin_user.id,
        )
        db.add(conv)
        await db.flush()
        msg = ChatMessage(
            id=uuid.uuid4(), conversation_id=conv.id, role="assistant",
        )
        db.add(msg)
        await db.commit()
        result = await db.execute(
            select(ChatMessage).where(ChatMessage.conversation_id == conv.id)
        )
        fetched = result.scalar_one()
        assert fetched.content is None
        assert fetched.tool_calls is None
        assert fetched.tool_results is None


# ---------------------------------------------------------------------------
# DocumentAnalysis Model
# ---------------------------------------------------------------------------
class TestDocumentAnalysisModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert DocumentAnalysis.__tablename__ == "document_analyses"

    @pytest.mark.asyncio
    async def test_create_analysis(self, db: AsyncSession, project: Project, admin_user: User):
        f = File(
            id=uuid.uuid4(), project_id=project.id,
            entity_type="equipment", entity_id=uuid.uuid4(),
            filename="doc.pdf", storage_path="/files/doc.pdf",
            uploaded_by_id=admin_user.id,
        )
        db.add(f)
        await db.flush()
        analysis = DocumentAnalysis(
            id=uuid.uuid4(), file_id=f.id, project_id=project.id,
            analysis_type="summary", model_used="gemini",
        )
        db.add(analysis)
        await db.commit()
        result = await db.execute(
            select(DocumentAnalysis).where(DocumentAnalysis.file_id == f.id)
        )
        fetched = result.scalar_one()
        assert fetched.status == "pending"
        assert fetched.analysis_type == "summary"
        assert fetched.model_used == "gemini"
        assert fetched.result is None
        assert fetched.error_message is None
        assert fetched.processing_time_ms is None


# ---------------------------------------------------------------------------
# DocumentReview & DocumentComment Models
# ---------------------------------------------------------------------------
class TestDocumentReviewModels:
    @pytest.mark.asyncio
    async def test_review_table(self):
        assert DocumentReview.__tablename__ == "document_reviews"

    @pytest.mark.asyncio
    async def test_comment_table(self):
        assert DocumentComment.__tablename__ == "document_comments"

    @pytest.mark.asyncio
    async def test_create_review_and_comment(self, db: AsyncSession, project: Project, admin_user: User):
        f = File(
            id=uuid.uuid4(), project_id=project.id,
            entity_type="equipment", entity_id=uuid.uuid4(),
            filename="rev.pdf", storage_path="/files/rev.pdf",
            uploaded_by_id=admin_user.id,
        )
        db.add(f)
        await db.flush()
        review = DocumentReview(
            id=uuid.uuid4(), project_id=project.id, document_id=f.id,
            created_by_id=admin_user.id,
        )
        db.add(review)
        await db.flush()
        comment = DocumentComment(
            id=uuid.uuid4(), review_id=review.id,
            comment_text="Looks good", created_by_id=admin_user.id,
        )
        db.add(comment)
        await db.commit()
        result = await db.execute(
            select(DocumentComment).where(DocumentComment.review_id == review.id)
        )
        fetched = result.scalar_one()
        assert fetched.comment_text == "Looks good"
        assert fetched.is_resolved is False

    @pytest.mark.asyncio
    async def test_review_default_status(self, db: AsyncSession, project: Project, admin_user: User):
        f = File(
            id=uuid.uuid4(), project_id=project.id,
            entity_type="material", entity_id=uuid.uuid4(),
            filename="ds.pdf", storage_path="/files/ds.pdf",
            uploaded_by_id=admin_user.id,
        )
        db.add(f)
        await db.flush()
        review = DocumentReview(
            id=uuid.uuid4(), project_id=project.id, document_id=f.id,
            created_by_id=admin_user.id,
        )
        db.add(review)
        await db.commit()
        result = await db.execute(
            select(DocumentReview).where(DocumentReview.document_id == f.id)
        )
        fetched = result.scalar_one()
        assert fetched.status == "pending"

    def test_review_status_enum(self):
        assert ReviewStatus.PENDING.value == "pending"
        assert ReviewStatus.IN_REVIEW.value == "in_review"
        assert ReviewStatus.APPROVED.value == "approved"
        assert ReviewStatus.REJECTED.value == "rejected"
        assert ReviewStatus.CHANGES_REQUESTED.value == "changes_requested"


# ---------------------------------------------------------------------------
# ConsultantAssignment Model
# ---------------------------------------------------------------------------
class TestConsultantAssignmentModel:
    @pytest.mark.asyncio
    async def test_table_name(self):
        assert ConsultantAssignment.__tablename__ == "consultant_assignments"

    @pytest.mark.asyncio
    async def test_create_assignment(self, db: AsyncSession, project: Project, admin_user: User):
        assignment = ConsultantAssignment(
            id=uuid.uuid4(), consultant_id=admin_user.id,
            project_id=project.id,
            start_date=date.today(), end_date=date.today(),
        )
        db.add(assignment)
        await db.commit()
        result = await db.execute(
            select(ConsultantAssignment).where(
                ConsultantAssignment.consultant_id == admin_user.id
            )
        )
        fetched = result.scalar_one()
        assert fetched.status == "pending"
        assert fetched.notes is None

    def test_assignment_status_enum(self):
        assert AssignmentStatus.PENDING.value == "pending"
        assert AssignmentStatus.ACTIVE.value == "active"
        assert AssignmentStatus.COMPLETED.value == "completed"
        assert AssignmentStatus.CANCELLED.value == "cancelled"
