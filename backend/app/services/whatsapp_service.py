import hashlib
import hmac
import logging
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

WHATSAPP_STRINGS = {
    "notification": {
        "en": {
            "view_action": "View in BuilderOps",
            "footer": "BuilderOps - Construction Management",
        },
        "he": {
            "view_action": "צפה ב-BuilderOps",
            "footer": "BuilderOps - ניהול בנייה",
        },
    },
    "rfi": {
        "en": {
            "new": "New RFI",
            "from": "From",
            "question": "Question",
        },
        "he": {
            "new": "בקשת מידע חדשה",
            "from": "מאת",
            "question": "שאלה",
        },
    },
    "equipment": {
        "en": {
            "approval_needed": "Equipment Approval Needed",
            "item": "Item",
            "location": "Location",
            "action_required": "Action Required",
        },
        "he": {
            "approval_needed": "נדרש אישור ציוד",
            "item": "פריט",
            "location": "מיקום",
            "action_required": "נדרשת פעולה",
        },
    },
    "meeting": {
        "en": {
            "reminder": "Meeting Reminder",
            "scheduled": "Scheduled for",
            "location": "Location",
            "organized_by": "Organized by",
        },
        "he": {
            "reminder": "תזכורת לפגישה",
            "scheduled": "מתוזמן ל",
            "location": "מיקום",
            "organized_by": "אורגן על ידי",
        },
    },
    "inspection": {
        "en": {
            "assigned": "Inspection Assigned",
            "checklist": "Checklist",
            "due_date": "Due",
            "consultant": "Consultant",
        },
        "he": {
            "assigned": "בדיקה הוקצתה",
            "checklist": "צ'קליסט",
            "due_date": "תאריך יעד",
            "consultant": "יועץ",
        },
    },
    "approval": {
        "en": {
            "overdue": "Overdue Approval",
            "pending": "Pending Approval",
            "approved": "Approved",
            "rejected": "Rejected",
        },
        "he": {
            "overdue": "אישור באיחור",
            "pending": "ממתין לאישור",
            "approved": "אושר",
            "rejected": "נדחה",
        },
    },
}

try:
    from twilio.rest import Client
    from twilio.base.exceptions import TwilioRestException
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    TwilioRestException = None
    logger.warning("Twilio library not installed. WhatsApp integration will be disabled.")


class WhatsAppService:
    def __init__(self):
        self.settings = get_settings()
        self.account_sid = self.settings.twilio_account_sid
        self.auth_token = self.settings.twilio_auth_token
        self.whatsapp_from = self.settings.twilio_whatsapp_from
        self.enabled = bool(
            TWILIO_AVAILABLE
            and self.account_sid
            and self.auth_token
            and self.whatsapp_from
        )

        if self.enabled:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None
            logger.warning("WhatsApp/Twilio not configured - WhatsApp messaging disabled")

    def send_message(
        self,
        to_whatsapp: str,
        body: str
    ) -> dict:
        """
        Send a WhatsApp message to the specified number.

        Args:
            to_whatsapp: Recipient WhatsApp number in E.164 format (e.g., +972501234567)
            body: Message text content

        Returns:
            dict with message_sid, status, and success flag
        """
        if not self.enabled:
            logger.warning("WhatsApp service not enabled, simulating message send")
            return {
                'success': True,
                'message_sid': 'simulated-message-sid',
                'status': 'simulated',
                'to': to_whatsapp
            }

        if not to_whatsapp.startswith('whatsapp:'):
            to_whatsapp = f'whatsapp:{to_whatsapp}'

        if not self.whatsapp_from.startswith('whatsapp:'):
            from_number = f'whatsapp:{self.whatsapp_from}'
        else:
            from_number = self.whatsapp_from

        try:
            message = self.client.messages.create(
                body=body,
                from_=from_number,
                to=to_whatsapp
            )

            logger.info(f"WhatsApp message sent successfully to {to_whatsapp}: {message.sid}")

            return {
                'success': True,
                'message_sid': message.sid,
                'status': message.status,
                'to': to_whatsapp
            }

        except Exception as e:
            logger.error(f"Failed to send WhatsApp message to {to_whatsapp}: {e}")
            raise

    def send_quick_reply_buttons(
        self,
        to_whatsapp: str,
        body: str,
        buttons: list[str]
    ) -> dict:
        """
        Send a WhatsApp message with quick reply buttons.

        Args:
            to_whatsapp: Recipient WhatsApp number in E.164 format
            body: Message text content
            buttons: List of button labels (max 3)

        Returns:
            dict with message_sid, status, and success flag
        """
        if not self.enabled:
            logger.warning("WhatsApp service not enabled, simulating button message send")
            return {
                'success': True,
                'message_sid': 'simulated-button-message-sid',
                'status': 'simulated',
                'to': to_whatsapp
            }

        if len(buttons) > 3:
            logger.warning(f"WhatsApp supports max 3 quick reply buttons, truncating from {len(buttons)}")
            buttons = buttons[:3]

        formatted_body = f"{body}\n\n" + "\n".join([f"{i+1}. {btn}" for i, btn in enumerate(buttons)])

        try:
            return self.send_message(to_whatsapp, formatted_body)
        except Exception as e:
            logger.error(f"Failed to send quick reply buttons to {to_whatsapp}: {e}")
            raise

    def verify_webhook_signature(
        self,
        signature: str,
        url: str,
        body_params: dict
    ) -> bool:
        """
        Verify that a webhook request came from Twilio.

        Args:
            signature: X-Twilio-Signature header value
            url: Full URL of the webhook endpoint
            body_params: Request body parameters as dict

        Returns:
            bool: True if signature is valid, False otherwise
        """
        if not self.enabled:
            logger.warning("WhatsApp service not enabled, skipping signature verification")
            return True

        if not signature:
            logger.warning("No signature provided for webhook verification")
            return False

        try:
            sorted_params = sorted(body_params.items())
            data_string = url + ''.join([f'{k}{v}' for k, v in sorted_params])

            computed_signature = hmac.new(
                self.auth_token.encode('utf-8'),
                data_string.encode('utf-8'),
                hashlib.sha1
            ).digest()

            import base64
            expected_signature = base64.b64encode(computed_signature).decode('utf-8')

            is_valid = hmac.compare_digest(signature, expected_signature)

            if not is_valid:
                logger.warning(f"Invalid Twilio webhook signature for URL: {url}")

            return is_valid

        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False

    def format_notification_message(
        self,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        language: str = 'he',
        emoji: str = '🔔'
    ) -> str:
        """
        Format a generic notification message for WhatsApp with proper structure.

        Args:
            title: Notification title
            message: Main message content
            action_url: Optional action URL
            language: Language code ('he' or 'en')
            emoji: Emoji to use (default: 🔔)

        Returns:
            Formatted WhatsApp message string
        """
        s = WHATSAPP_STRINGS["notification"].get(language, WHATSAPP_STRINGS["notification"]["en"])

        formatted = f"{emoji} *{title}*\n\n{message}"

        if action_url:
            formatted += f"\n\n{s['view_action']}: {action_url}"

        formatted += f"\n\n_{s['footer']}_"

        return formatted

    def format_rfi_notification(
        self,
        rfi_title: str,
        from_name: str,
        question: str,
        action_url: str,
        language: str = 'he'
    ) -> str:
        """
        Format an RFI notification message for WhatsApp.

        Args:
            rfi_title: RFI title/number
            from_name: Name of person who created the RFI
            question: RFI question text
            action_url: Link to view RFI
            language: Language code ('he' or 'en')

        Returns:
            Formatted WhatsApp message string
        """
        s = WHATSAPP_STRINGS["rfi"].get(language, WHATSAPP_STRINGS["rfi"]["en"])
        n = WHATSAPP_STRINGS["notification"].get(language, WHATSAPP_STRINGS["notification"]["en"])

        message = f"📋 *{s['new']}*\n\n"
        message += f"*{rfi_title}*\n\n"
        message += f"{s['from']}: {from_name}\n"
        message += f"{s['question']}: {question}\n\n"
        message += f"{n['view_action']}: {action_url}\n\n"
        message += f"_{n['footer']}_"

        return message

    def format_equipment_approval_notification(
        self,
        equipment_name: str,
        location: str,
        action_url: str,
        language: str = 'he'
    ) -> str:
        """
        Format an equipment approval notification for WhatsApp.

        Args:
            equipment_name: Name of equipment requiring approval
            location: Equipment location
            action_url: Link to approve equipment
            language: Language code ('he' or 'en')

        Returns:
            Formatted WhatsApp message string
        """
        s = WHATSAPP_STRINGS["equipment"].get(language, WHATSAPP_STRINGS["equipment"]["en"])
        n = WHATSAPP_STRINGS["notification"].get(language, WHATSAPP_STRINGS["notification"]["en"])

        message = f"⚠️ *{s['approval_needed']}*\n\n"
        message += f"{s['item']}: {equipment_name}\n"
        message += f"{s['location']}: {location}\n\n"
        message += f"🔴 *{s['action_required']}*\n\n"
        message += f"{n['view_action']}: {action_url}\n\n"
        message += f"_{n['footer']}_"

        return message

    def format_meeting_reminder(
        self,
        meeting_title: str,
        scheduled_date: str,
        location: str,
        organizer: str,
        action_url: str,
        language: str = 'he'
    ) -> str:
        """
        Format a meeting reminder notification for WhatsApp.

        Args:
            meeting_title: Meeting title
            scheduled_date: Meeting date/time
            location: Meeting location
            organizer: Name of organizer
            action_url: Link to meeting details
            language: Language code ('he' or 'en')

        Returns:
            Formatted WhatsApp message string
        """
        s = WHATSAPP_STRINGS["meeting"].get(language, WHATSAPP_STRINGS["meeting"]["en"])
        n = WHATSAPP_STRINGS["notification"].get(language, WHATSAPP_STRINGS["notification"]["en"])

        message = f"📅 *{s['reminder']}*\n\n"
        message += f"*{meeting_title}*\n\n"
        message += f"{s['scheduled']}: {scheduled_date}\n"
        message += f"{s['location']}: {location}\n"
        message += f"{s['organized_by']}: {organizer}\n\n"
        message += f"{n['view_action']}: {action_url}\n\n"
        message += f"_{n['footer']}_"

        return message

    def format_inspection_assignment(
        self,
        checklist_name: str,
        consultant_name: str,
        due_date: str,
        action_url: str,
        language: str = 'he'
    ) -> str:
        """
        Format an inspection assignment notification for WhatsApp.

        Args:
            checklist_name: Checklist/inspection name
            consultant_name: Assigned consultant name
            due_date: Due date
            action_url: Link to inspection
            language: Language code ('he' or 'en')

        Returns:
            Formatted WhatsApp message string
        """
        s = WHATSAPP_STRINGS["inspection"].get(language, WHATSAPP_STRINGS["inspection"]["en"])
        n = WHATSAPP_STRINGS["notification"].get(language, WHATSAPP_STRINGS["notification"]["en"])

        message = f"✅ *{s['assigned']}*\n\n"
        message += f"{s['checklist']}: {checklist_name}\n"
        message += f"{s['consultant']}: {consultant_name}\n"
        message += f"{s['due_date']}: {due_date}\n\n"
        message += f"{n['view_action']}: {action_url}\n\n"
        message += f"_{n['footer']}_"

        return message

    def format_approval_status(
        self,
        item_name: str,
        status: str,
        message_text: str,
        action_url: Optional[str] = None,
        language: str = 'he'
    ) -> str:
        """
        Format an approval status notification for WhatsApp.

        Args:
            item_name: Name of item being approved
            status: Status ('approved', 'rejected', 'pending', 'overdue')
            message_text: Additional message/reason
            action_url: Optional link to item
            language: Language code ('he' or 'en')

        Returns:
            Formatted WhatsApp message string
        """
        s = WHATSAPP_STRINGS["approval"].get(language, WHATSAPP_STRINGS["approval"]["en"])
        n = WHATSAPP_STRINGS["notification"].get(language, WHATSAPP_STRINGS["notification"]["en"])

        emoji_map = {
            'approved': '✅',
            'rejected': '❌',
            'pending': '⏳',
            'overdue': '🔴'
        }

        emoji = emoji_map.get(status.lower(), '🔔')
        status_text = s.get(status.lower(), status)

        message = f"{emoji} *{status_text}*\n\n"
        message += f"{item_name}\n\n"
        message += f"{message_text}\n"

        if action_url:
            message += f"\n{n['view_action']}: {action_url}\n"

        message += f"\n_{n['footer']}_"

        return message
