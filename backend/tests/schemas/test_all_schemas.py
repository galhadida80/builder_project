import uuid
from datetime import date, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.analytics import (
    DistributionItem,
    DistributionsResponse,
    MetricsResponse,
    TrendDataPoint,
)
from app.schemas.approval import ApprovalAction, ApprovalRequestResponse, ApprovalStepResponse
from app.schemas.area import AreaCreate, AreaProgressCreate, AreaResponse
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSendResponse,
    ConversationDetailResponse,
    ConversationListResponse,
)
from app.schemas.checklist import (
    ChecklistInstanceCreate as CLInstanceCreate,
)
from app.schemas.checklist import (
    ChecklistItemResponseCreate as CLItemRespCreate,
)
from app.schemas.checklist import (
    ChecklistItemTemplateCreate as CLItemCreate,
)
from app.schemas.checklist import (
    ChecklistSubSectionCreate as CLSubCreate,
)
from app.schemas.checklist import (
    ChecklistTemplateCreate as CLTemplateCreate,
)
from app.schemas.checklist_template import (
    ChecklistInstanceCreate as CTplInstanceCreate,
)
from app.schemas.checklist_template import (
    ChecklistItemResponseCreate as CTplItemRespCreate,
)
from app.schemas.checklist_template import (
    ChecklistItemTemplateCreate as CTplItemCreate,
)
from app.schemas.checklist_template import (
    ChecklistSubSectionCreate as CTplSubCreate,
)
from app.schemas.checklist_template import (
    ChecklistTemplateCreate as CTplCreate,
)
from app.schemas.consultant_assignment import (
    ConsultantAssignmentCreate,
    ConsultantAssignmentResponse,
    ConsultantAssignmentUpdate,
)
from app.schemas.contact import ContactCreate, ContactResponse, ContactUpdate
from app.schemas.document_analysis import (
    DocumentAnalysisCreate,
    DocumentAnalysisListResponse,
    DocumentAnalysisResponse,
)
from app.schemas.document_review import (
    DocumentCommentCreate,
    DocumentCommentResponse,
    DocumentCommentUpdate,
    DocumentReviewCreate,
    DocumentReviewResponse,
    DocumentReviewUpdate,
)
from app.schemas.equipment import (
    ChecklistCreate,
    ChecklistItem,
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
)
from app.schemas.inspection import (
    FindingCreate,
    FindingUpdate,
    InspectionConsultantTypeCreate,
    InspectionCreate,
    InspectionHistoryEventResponse,
    InspectionStageCreate,
    InspectionSummaryResponse,
    InspectionUpdate,
)
from app.schemas.material import MaterialCreate, MaterialReceive, MaterialResponse, MaterialUpdate
from app.schemas.meeting import (
    ActionItem,
    MeetingAttendeeCreate,
    MeetingCreate,
    MeetingResponse,
    MeetingUpdate,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectMemberCreate,
    ProjectResponse,
    ProjectUpdate,
)
from app.schemas.rfi import (
    PaginatedRFIResponse,
    RFICreate,
    RFIResponseCreate,
    RFIStatusUpdate,
    RFISummaryResponse,
    RFIUpdate,
)
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserRegister, UserResponse

VALID_UUID = uuid.uuid4()
VALID_UUID_STR = str(VALID_UUID)
NOW = datetime.utcnow()
TODAY = date.today()


# ---------------------------------------------------------------------------
# UserRegister
# ---------------------------------------------------------------------------
class TestUserRegister:
    def test_valid_data(self):
        obj = UserRegister(email="test@example.com", password="12345678", full_name="John Doe")
        assert obj.email == "test@example.com"
        assert obj.full_name == "John Doe"

    def test_missing_email(self):
        with pytest.raises(ValidationError):
            UserRegister(password="12345678", full_name="John Doe")

    def test_missing_password(self):
        with pytest.raises(ValidationError):
            UserRegister(email="test@example.com", full_name="John Doe")

    def test_missing_full_name(self):
        with pytest.raises(ValidationError):
            UserRegister(email="test@example.com", password="12345678")

    def test_invalid_email_format(self):
        with pytest.raises(ValidationError):
            UserRegister(email="notanemail", password="12345678", full_name="John Doe")

    def test_password_too_short(self):
        with pytest.raises(ValidationError):
            UserRegister(email="test@example.com", password="1234567", full_name="John Doe")

    def test_password_too_long(self):
        with pytest.raises(ValidationError):
            UserRegister(email="test@example.com", password="x" * 129, full_name="John Doe")

    def test_full_name_too_short(self):
        with pytest.raises(ValidationError):
            UserRegister(email="test@example.com", password="12345678", full_name="A")

    def test_full_name_too_long(self):
        with pytest.raises(ValidationError):
            UserRegister(email="test@example.com", password="12345678", full_name="A" * 256)

    def test_xss_sanitization_full_name(self):
        obj = UserRegister(
            email="test@example.com", password="12345678",
            full_name='<script>alert("xss")</script>John'
        )
        assert "<script>" not in obj.full_name
        assert "John" in obj.full_name

    def test_html_tag_stripping(self):
        obj = UserRegister(
            email="test@example.com", password="12345678",
            full_name='<img src=x onerror=alert(1)>Valid Name'
        )
        assert "<img" not in obj.full_name

    def test_whitespace_stripped(self):
        obj = UserRegister(
            email="test@example.com", password="12345678", full_name="  John Doe  "
        )
        assert obj.full_name == "John Doe"


# ---------------------------------------------------------------------------
# UserLogin
# ---------------------------------------------------------------------------
class TestUserLogin:
    def test_valid_data(self):
        obj = UserLogin(email="test@example.com", password="pass")
        assert obj.email == "test@example.com"

    def test_missing_email(self):
        with pytest.raises(ValidationError):
            UserLogin(password="pass")

    def test_missing_password(self):
        with pytest.raises(ValidationError):
            UserLogin(email="test@example.com")

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            UserLogin(email="bad", password="pass")

    def test_empty_password(self):
        with pytest.raises(ValidationError):
            UserLogin(email="test@example.com", password="")

    def test_password_max_length(self):
        with pytest.raises(ValidationError):
            UserLogin(email="test@example.com", password="x" * 129)


# ---------------------------------------------------------------------------
# UserCreate
# ---------------------------------------------------------------------------
class TestUserCreate:
    def test_valid_data(self):
        obj = UserCreate(email="a@b.com")
        assert obj.email == "a@b.com"
        assert obj.firebase_uid is None

    def test_with_firebase_uid(self):
        obj = UserCreate(email="a@b.com", firebase_uid="abc123")
        assert obj.firebase_uid == "abc123"

    def test_optional_fields_none(self):
        obj = UserCreate(email="a@b.com")
        assert obj.full_name is None
        assert obj.phone is None
        assert obj.company is None
        assert obj.language is None


# ---------------------------------------------------------------------------
# UserResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestUserResponse:
    def test_camel_case_aliases(self):
        data = {
            "id": VALID_UUID, "email": "a@b.com", "is_active": True,
            "created_at": NOW, "role": "admin"
        }
        obj = UserResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "isActive" in dumped
        assert "createdAt" in dumped

    def test_uuid_field(self):
        data = {
            "id": VALID_UUID, "email": "a@b.com", "is_active": True,
            "created_at": NOW
        }
        obj = UserResponse(**data)
        assert obj.id == VALID_UUID


# ---------------------------------------------------------------------------
# TokenResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestTokenResponse:
    def test_camel_case_aliases(self):
        user_data = {
            "id": VALID_UUID, "email": "a@b.com", "is_active": True,
            "created_at": NOW
        }
        obj = TokenResponse(
            access_token="tok123",
            token_type="bearer",
            user=UserResponse(**user_data)
        )
        dumped = obj.model_dump(by_alias=True)
        assert "accessToken" in dumped
        assert "tokenType" in dumped
        assert dumped["accessToken"] == "tok123"

    def test_default_token_type(self):
        user_data = {
            "id": VALID_UUID, "email": "a@b.com", "is_active": True,
            "created_at": NOW
        }
        obj = TokenResponse(access_token="tok", user=UserResponse(**user_data))
        assert obj.token_type == "bearer"


# ---------------------------------------------------------------------------
# ProjectCreate
# ---------------------------------------------------------------------------
class TestProjectCreate:
    def test_valid_data(self):
        obj = ProjectCreate(name="My Project", code="PRJ-01")
        assert obj.name == "My Project"
        assert obj.code == "PRJ-01"

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            ProjectCreate(code="PRJ-01")

    def test_missing_code(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="My Project")

    def test_name_too_short(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="A", code="PRJ-01")

    def test_name_too_long(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="A" * 256, code="PRJ-01")

    def test_code_uppercased(self):
        obj = ProjectCreate(name="My Project", code="prj-01")
        assert obj.code == "PRJ-01"

    def test_code_invalid_characters(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="My Project", code="PRJ @!")

    def test_code_too_short(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="My Project", code="P")

    def test_optional_description(self):
        obj = ProjectCreate(name="My Project", code="PRJ-01", description=None)
        assert obj.description is None

    def test_optional_dates(self):
        obj = ProjectCreate(
            name="My Project", code="PRJ-01",
            start_date=TODAY, estimated_end_date=TODAY
        )
        assert obj.start_date == TODAY

    def test_xss_in_name(self):
        obj = ProjectCreate(name='<script>alert(1)</script>ProjectX', code="PRJ-01")
        assert "<script>" not in obj.name

    def test_xss_in_description(self):
        obj = ProjectCreate(
            name="My Project", code="PRJ-01",
            description='<iframe src="evil"></iframe>Clean text'
        )
        assert "<iframe" not in obj.description

    def test_description_too_long(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="My Project", code="PRJ-01", description="A" * 2001)

    def test_address_too_long(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="My Project", code="PRJ-01", address="A" * 501)


# ---------------------------------------------------------------------------
# ProjectUpdate
# ---------------------------------------------------------------------------
class TestProjectUpdate:
    def test_all_none(self):
        obj = ProjectUpdate()
        assert obj.name is None
        assert obj.description is None

    def test_partial_update(self):
        obj = ProjectUpdate(name="Updated Name")
        assert obj.name == "Updated Name"
        assert obj.description is None

    def test_name_min_length(self):
        with pytest.raises(ValidationError):
            ProjectUpdate(name="A")

    def test_sanitization(self):
        obj = ProjectUpdate(name='<script>x</script>Clean')
        assert "<script>" not in obj.name


# ---------------------------------------------------------------------------
# ProjectMemberCreate
# ---------------------------------------------------------------------------
class TestProjectMemberCreate:
    def test_valid(self):
        obj = ProjectMemberCreate(user_id=VALID_UUID, role="contractor")
        assert obj.user_id == VALID_UUID

    def test_missing_user_id(self):
        with pytest.raises(ValidationError):
            ProjectMemberCreate(role="contractor")

    def test_missing_role(self):
        with pytest.raises(ValidationError):
            ProjectMemberCreate(user_id=VALID_UUID)

    def test_invalid_uuid(self):
        with pytest.raises(ValidationError):
            ProjectMemberCreate(user_id="not-a-uuid", role="contractor")


# ---------------------------------------------------------------------------
# ProjectResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestProjectResponse:
    def test_camel_case_aliases(self):
        data = {
            "id": VALID_UUID, "name": "Proj", "code": "P01", "status": "active",
            "created_at": NOW, "updated_at": NOW, "estimated_end_date": TODAY,
        }
        obj = ProjectResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "createdAt" in dumped
        assert "updatedAt" in dumped
        assert "estimatedEndDate" in dumped

    def test_members_list_default_empty(self):
        data = {
            "id": VALID_UUID, "name": "Proj", "code": "P01", "status": "active",
            "created_at": NOW, "updated_at": NOW,
        }
        obj = ProjectResponse(**data)
        assert obj.members == []


# ---------------------------------------------------------------------------
# EquipmentCreate
# ---------------------------------------------------------------------------
class TestEquipmentCreate:
    def test_valid_minimal(self):
        obj = EquipmentCreate(name="Generator")
        assert obj.name == "Generator"

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            EquipmentCreate()

    def test_name_too_short(self):
        with pytest.raises(ValidationError):
            EquipmentCreate(name="A")

    def test_name_too_long(self):
        with pytest.raises(ValidationError):
            EquipmentCreate(name="A" * 256)

    def test_optional_fields_none(self):
        obj = EquipmentCreate(name="Generator")
        assert obj.equipment_type is None
        assert obj.manufacturer is None
        assert obj.model_number is None
        assert obj.serial_number is None
        assert obj.specifications is None
        assert obj.notes is None

    def test_with_all_fields(self):
        obj = EquipmentCreate(
            name="Generator", equipment_type="Power", manufacturer="Caterpillar",
            model_number="CAT-3500", serial_number="SN123",
            specifications={"voltage": "240V"}, notes="Test note",
        )
        assert obj.equipment_type == "Power"
        assert obj.specifications == {"voltage": "240V"}

    def test_xss_in_name(self):
        obj = EquipmentCreate(name='<script>alert(1)</script>Generator')
        assert "<script>" not in obj.name

    def test_specifications_validation(self):
        obj = EquipmentCreate(name="Gen", specifications={"key": "value"})
        assert obj.specifications == {"key": "value"}

    def test_specifications_too_many_keys(self):
        specs = {f"key_{i}": "val" for i in range(51)}
        with pytest.raises(ValidationError):
            EquipmentCreate(name="Gen", specifications=specs)

    def test_specifications_key_too_long(self):
        specs = {"k" * 101: "val"}
        with pytest.raises(ValidationError):
            EquipmentCreate(name="Gen", specifications=specs)

    def test_specifications_value_too_long(self):
        specs = {"key": "v" * 501}
        with pytest.raises(ValidationError):
            EquipmentCreate(name="Gen", specifications=specs)

    def test_specifications_invalid_value_type(self):
        specs = {"key": [1, 2, 3]}
        with pytest.raises(ValidationError):
            EquipmentCreate(name="Gen", specifications=specs)

    def test_specifications_with_numeric_value(self):
        obj = EquipmentCreate(name="Gen", specifications={"weight": 100})
        assert obj.specifications["weight"] == 100

    def test_specifications_with_boolean_value(self):
        obj = EquipmentCreate(name="Gen", specifications={"active": True})
        assert obj.specifications["active"] is True

    def test_specifications_with_null_value(self):
        obj = EquipmentCreate(name="Gen", specifications={"optional": None})
        assert obj.specifications["optional"] is None

    def test_notes_too_long(self):
        with pytest.raises(ValidationError):
            EquipmentCreate(name="Gen", notes="A" * 5001)

    def test_equipment_type_max_length(self):
        with pytest.raises(ValidationError):
            EquipmentCreate(name="Gen", equipment_type="A" * 101)


# ---------------------------------------------------------------------------
# EquipmentUpdate
# ---------------------------------------------------------------------------
class TestEquipmentUpdate:
    def test_all_none(self):
        obj = EquipmentUpdate()
        assert obj.name is None

    def test_partial_update(self):
        obj = EquipmentUpdate(name="Updated Gen")
        assert obj.name == "Updated Gen"

    def test_name_min_length(self):
        with pytest.raises(ValidationError):
            EquipmentUpdate(name="A")


# ---------------------------------------------------------------------------
# EquipmentResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestEquipmentResponse:
    def test_camel_case_aliases(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID, "name": "Gen",
            "status": "draft", "created_at": NOW, "updated_at": NOW,
            "equipment_type": "Power", "model_number": "M1",
            "serial_number": "SN1",
        }
        obj = EquipmentResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "equipmentType" in dumped
        assert "modelNumber" in dumped
        assert "serialNumber" in dumped
        assert "projectId" in dumped
        assert "createdAt" in dumped

    def test_checklists_default_empty(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID, "name": "Gen",
            "status": "draft", "created_at": NOW, "updated_at": NOW,
        }
        obj = EquipmentResponse(**data)
        assert obj.checklists == []


# ---------------------------------------------------------------------------
# ChecklistItem & ChecklistCreate (equipment sub-schemas)
# ---------------------------------------------------------------------------
class TestChecklistItem:
    def test_valid_item(self):
        obj = ChecklistItem(id="item-1", label="Check voltage")
        assert obj.is_completed is False

    def test_missing_label(self):
        with pytest.raises(ValidationError):
            ChecklistItem(id="item-1")

    def test_label_min_length(self):
        with pytest.raises(ValidationError):
            ChecklistItem(id="item-1", label="")

    def test_sanitization(self):
        obj = ChecklistItem(id="item-1", label='<script>x</script>Check')
        assert "<script>" not in obj.label


class TestChecklistCreate:
    def test_valid(self):
        items = [ChecklistItem(id="item-1", label="Check")]
        obj = ChecklistCreate(checklist_name="Safety Checklist", items=items)
        assert obj.checklist_name == "Safety Checklist"

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            ChecklistCreate(items=[])

    def test_name_min_length(self):
        with pytest.raises(ValidationError):
            ChecklistCreate(checklist_name="A", items=[])


# ---------------------------------------------------------------------------
# MaterialCreate
# ---------------------------------------------------------------------------
class TestMaterialCreate:
    def test_valid_minimal(self):
        obj = MaterialCreate(name="Concrete Mix")
        assert obj.name == "Concrete Mix"

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            MaterialCreate()

    def test_name_too_short(self):
        with pytest.raises(ValidationError):
            MaterialCreate(name="A")

    def test_with_all_fields(self):
        obj = MaterialCreate(
            name="Steel Rebar", material_type="Structural",
            manufacturer="SteelCo", model_number="SR-12",
            quantity=Decimal("100.50"), unit="kg",
            specifications={"grade": "A36"}, storage_location="Warehouse A",
            expected_delivery=TODAY, notes="Rush order",
        )
        assert obj.quantity == Decimal("100.50")
        assert obj.unit == "kg"

    def test_quantity_negative(self):
        with pytest.raises(ValidationError):
            MaterialCreate(name="Mat", quantity=Decimal("-1"))

    def test_quantity_too_large(self):
        with pytest.raises(ValidationError):
            MaterialCreate(name="Mat", quantity=Decimal("1000000000"))

    def test_xss_in_name(self):
        obj = MaterialCreate(name='<script>x</script>Concrete')
        assert "<script>" not in obj.name

    def test_specifications_sanitized(self):
        obj = MaterialCreate(name="Mat", specifications={"a": '<script>x</script>val'})
        assert "<script>" not in obj.specifications["a"]

    def test_notes_too_long(self):
        with pytest.raises(ValidationError):
            MaterialCreate(name="Mat", notes="A" * 5001)

    def test_optional_dates(self):
        obj = MaterialCreate(
            name="Mat", expected_delivery=TODAY, actual_delivery=TODAY,
        )
        assert obj.expected_delivery == TODAY


# ---------------------------------------------------------------------------
# MaterialUpdate
# ---------------------------------------------------------------------------
class TestMaterialUpdate:
    def test_all_none(self):
        obj = MaterialUpdate()
        assert obj.name is None

    def test_partial_update(self):
        obj = MaterialUpdate(name="Updated Mat")
        assert obj.name == "Updated Mat"


# ---------------------------------------------------------------------------
# MaterialReceive
# ---------------------------------------------------------------------------
class TestMaterialReceive:
    def test_valid(self):
        obj = MaterialReceive(quantity_received=Decimal("50"))
        assert obj.quantity_received == Decimal("50")

    def test_zero_quantity(self):
        with pytest.raises(ValidationError):
            MaterialReceive(quantity_received=Decimal("0"))

    def test_negative_quantity(self):
        with pytest.raises(ValidationError):
            MaterialReceive(quantity_received=Decimal("-1"))

    def test_optional_notes(self):
        obj = MaterialReceive(quantity_received=Decimal("10"), notes="Partial delivery")
        assert obj.notes == "Partial delivery"


# ---------------------------------------------------------------------------
# MaterialResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestMaterialResponse:
    def test_camel_case_aliases(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID, "name": "Mat",
            "status": "draft", "created_at": NOW, "updated_at": NOW,
            "material_type": "Structural", "model_number": "M1",
            "storage_location": "WH-A", "expected_delivery": TODAY,
        }
        obj = MaterialResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "materialType" in dumped
        assert "modelNumber" in dumped
        assert "storageLocation" in dumped
        assert "expectedDelivery" in dumped
        assert "projectId" in dumped


# ---------------------------------------------------------------------------
# MeetingCreate
# ---------------------------------------------------------------------------
class TestMeetingCreate:
    def test_valid(self):
        obj = MeetingCreate(title="Safety Meeting", scheduled_date=NOW)
        assert obj.title == "Safety Meeting"

    def test_missing_title(self):
        with pytest.raises(ValidationError):
            MeetingCreate(scheduled_date=NOW)

    def test_missing_scheduled_date(self):
        with pytest.raises(ValidationError):
            MeetingCreate(title="Meeting")

    def test_title_too_short(self):
        with pytest.raises(ValidationError):
            MeetingCreate(title="A", scheduled_date=NOW)

    def test_title_too_long(self):
        with pytest.raises(ValidationError):
            MeetingCreate(title="A" * 256, scheduled_date=NOW)

    def test_optional_fields(self):
        obj = MeetingCreate(title="Meeting", scheduled_date=NOW)
        assert obj.description is None
        assert obj.meeting_type is None
        assert obj.location is None

    def test_xss_in_title(self):
        obj = MeetingCreate(title='<script>x</script>Safety Meeting', scheduled_date=NOW)
        assert "<script>" not in obj.title

    def test_description_too_long(self):
        with pytest.raises(ValidationError):
            MeetingCreate(title="Meeting", scheduled_date=NOW, description="A" * 2001)


# ---------------------------------------------------------------------------
# MeetingUpdate
# ---------------------------------------------------------------------------
class TestMeetingUpdate:
    def test_all_none(self):
        obj = MeetingUpdate()
        assert obj.title is None

    def test_partial_update(self):
        obj = MeetingUpdate(title="Updated")
        assert obj.title == "Updated"

    def test_action_items(self):
        items = [ActionItem(id="ai-1", description="Follow up")]
        obj = MeetingUpdate(action_items=items)
        assert len(obj.action_items) == 1

    def test_title_min_length(self):
        with pytest.raises(ValidationError):
            MeetingUpdate(title="A")


# ---------------------------------------------------------------------------
# ActionItem
# ---------------------------------------------------------------------------
class TestActionItem:
    def test_valid(self):
        obj = ActionItem(id="ai-1", description="Do something")
        assert obj.is_completed is False

    def test_missing_description(self):
        with pytest.raises(ValidationError):
            ActionItem(id="ai-1")

    def test_sanitization(self):
        obj = ActionItem(id="ai-1", description='<script>x</script>Task')
        assert "<script>" not in obj.description


# ---------------------------------------------------------------------------
# MeetingAttendeeCreate
# ---------------------------------------------------------------------------
class TestMeetingAttendeeCreate:
    def test_valid(self):
        obj = MeetingAttendeeCreate(user_id=VALID_UUID)
        assert obj.user_id == VALID_UUID
        assert obj.role is None

    def test_with_role(self):
        obj = MeetingAttendeeCreate(user_id=VALID_UUID, role="observer")
        assert obj.role == "observer"

    def test_missing_user_id(self):
        with pytest.raises(ValidationError):
            MeetingAttendeeCreate()


# ---------------------------------------------------------------------------
# MeetingResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestMeetingResponse:
    def test_camel_case_aliases(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID, "title": "M",
            "scheduled_date": NOW, "status": "scheduled", "created_at": NOW,
            "meeting_type": "safety", "google_event_id": "gcal123",
            "action_items": [],
        }
        obj = MeetingResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "meetingType" in dumped
        assert "googleEventId" in dumped
        assert "scheduledDate" in dumped
        assert "actionItems" in dumped
        assert "projectId" in dumped


# ---------------------------------------------------------------------------
# ContactCreate
# ---------------------------------------------------------------------------
class TestContactCreate:
    def test_valid(self):
        obj = ContactCreate(contact_type="contractor", contact_name="John Doe", email="john@test.com")
        assert obj.contact_type == "contractor"
        assert obj.is_primary is False

    def test_missing_contact_type(self):
        with pytest.raises(ValidationError):
            ContactCreate(contact_name="John Doe")

    def test_missing_contact_name(self):
        with pytest.raises(ValidationError):
            ContactCreate(contact_type="contractor")

    def test_contact_name_too_short(self):
        with pytest.raises(ValidationError):
            ContactCreate(contact_type="contractor", contact_name="A")

    def test_with_email(self):
        obj = ContactCreate(
            contact_type="contractor", contact_name="John", email="john@test.com"
        )
        assert obj.email == "john@test.com"

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            ContactCreate(
                contact_type="contractor", contact_name="John", email="notvalid"
            )

    def test_valid_phone(self):
        obj = ContactCreate(
            contact_type="contractor", contact_name="John", email="john@test.com", phone="050-1234567"
        )
        assert obj.phone == "050-1234567"

    def test_invalid_phone(self):
        with pytest.raises(ValidationError):
            ContactCreate(
                contact_type="contractor", contact_name="John", phone="abc-invalid"
            )

    def test_xss_in_contact_name(self):
        obj = ContactCreate(
            contact_type="contractor", contact_name='<script>x</script>John Doe', email="xss@test.com"
        )
        assert "<script>" not in obj.contact_name

    def test_optional_fields_none(self):
        obj = ContactCreate(contact_type="sub", contact_name="Jane", email="jane@test.com")
        assert obj.company_name is None
        assert obj.phone is None
        assert obj.role_description is None

    def test_is_primary_flag(self):
        obj = ContactCreate(
            contact_type="sub", contact_name="Jane", email="jane2@test.com", is_primary=True
        )
        assert obj.is_primary is True


# ---------------------------------------------------------------------------
# ContactUpdate
# ---------------------------------------------------------------------------
class TestContactUpdate:
    def test_all_none(self):
        obj = ContactUpdate()
        assert obj.contact_name is None

    def test_partial_update(self):
        obj = ContactUpdate(contact_name="Updated Name")
        assert obj.contact_name == "Updated Name"

    def test_phone_validation(self):
        with pytest.raises(ValidationError):
            ContactUpdate(phone="abc")


# ---------------------------------------------------------------------------
# ContactResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestContactResponse:
    def test_camel_case_aliases(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID,
            "contact_type": "contractor", "contact_name": "John",
            "is_primary": True, "created_at": NOW, "company_name": "Co",
            "role_description": "Lead",
        }
        obj = ContactResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "contactType" in dumped
        assert "contactName" in dumped
        assert "isPrimary" in dumped
        assert "companyName" in dumped
        assert "roleDescription" in dumped
        assert "projectId" in dumped


# ---------------------------------------------------------------------------
# AreaCreate
# ---------------------------------------------------------------------------
class TestAreaCreate:
    def test_valid_minimal(self):
        obj = AreaCreate(name="Floor 1")
        assert obj.name == "Floor 1"
        assert obj.total_units == 1

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            AreaCreate()

    def test_name_too_short(self):
        with pytest.raises(ValidationError):
            AreaCreate(name="A")

    def test_with_all_fields(self):
        obj = AreaCreate(
            name="Floor 1", area_type="residential", floor_number=3,
            area_code="FL-01", total_units=10, parent_id=VALID_UUID,
        )
        assert obj.floor_number == 3
        assert obj.area_code == "FL-01"

    def test_floor_number_min(self):
        obj = AreaCreate(name="Basement", floor_number=-99)
        assert obj.floor_number == -99

    def test_floor_number_below_min(self):
        with pytest.raises(ValidationError):
            AreaCreate(name="Deep", floor_number=-100)

    def test_floor_number_max(self):
        obj = AreaCreate(name="Top", floor_number=999)
        assert obj.floor_number == 999

    def test_floor_number_above_max(self):
        with pytest.raises(ValidationError):
            AreaCreate(name="Sky", floor_number=1000)

    def test_total_units_min(self):
        with pytest.raises(ValidationError):
            AreaCreate(name="Floor", total_units=0)

    def test_total_units_max(self):
        with pytest.raises(ValidationError):
            AreaCreate(name="Floor", total_units=10001)

    def test_area_code_uppercased(self):
        obj = AreaCreate(name="Floor 1", area_code="fl-01")
        assert obj.area_code == "FL-01"

    def test_area_code_invalid(self):
        with pytest.raises(ValidationError):
            AreaCreate(name="Floor 1", area_code="FL @!")

    def test_area_code_none(self):
        obj = AreaCreate(name="Floor 1", area_code=None)
        assert obj.area_code is None

    def test_area_code_empty_string_becomes_none(self):
        obj = AreaCreate(name="Floor 1", area_code="  ")
        assert obj.area_code is None

    def test_xss_in_name(self):
        obj = AreaCreate(name='<script>x</script>Floor One')
        assert "<script>" not in obj.name


# ---------------------------------------------------------------------------
# AreaProgressCreate
# ---------------------------------------------------------------------------
class TestAreaProgressCreate:
    def test_valid(self):
        obj = AreaProgressCreate(progress_percentage=Decimal("50"))
        assert obj.progress_percentage == Decimal("50")

    def test_progress_below_zero(self):
        with pytest.raises(ValidationError):
            AreaProgressCreate(progress_percentage=Decimal("-1"))

    def test_progress_above_100(self):
        with pytest.raises(ValidationError):
            AreaProgressCreate(progress_percentage=Decimal("101"))

    def test_photos_limit(self):
        obj = AreaProgressCreate(
            progress_percentage=Decimal("10"), photos=["p1.jpg"] * 20
        )
        assert len(obj.photos) == 20


# ---------------------------------------------------------------------------
# AreaResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestAreaResponse:
    def test_camel_case_aliases(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID, "name": "F1",
            "total_units": 5, "current_progress": Decimal("0"),
            "created_at": NOW, "floor_number": 2, "area_type": "residential",
            "area_code": "FL01",
        }
        obj = AreaResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "totalUnits" in dumped
        assert "currentProgress" in dumped
        assert "floorNumber" in dumped
        assert "areaType" in dumped
        assert "areaCode" in dumped
        assert "projectId" in dumped


# ---------------------------------------------------------------------------
# RFICreate
# ---------------------------------------------------------------------------
class TestRFICreate:
    def test_valid(self):
        obj = RFICreate(
            subject="Foundation Question",
            question="What concrete mix to use?",
            to_email="engineer@test.com",
        )
        assert obj.subject == "Foundation Question"
        assert obj.category == "other"
        assert obj.priority == "medium"

    def test_missing_subject(self):
        with pytest.raises(ValidationError):
            RFICreate(question="Q?", to_email="e@t.com")

    def test_missing_question(self):
        with pytest.raises(ValidationError):
            RFICreate(subject="Subj", to_email="e@t.com")

    def test_missing_to_email(self):
        with pytest.raises(ValidationError):
            RFICreate(subject="Subj", question="Q?")

    def test_invalid_to_email(self):
        with pytest.raises(ValidationError):
            RFICreate(subject="Subj", question="Q?", to_email="bad")

    def test_category_valid_values(self):
        for cat in ["design", "structural", "mep", "architectural", "specifications", "schedule", "cost", "other"]:
            obj = RFICreate(subject="Subj", question="Q?", to_email="e@t.com", category=cat)
            assert obj.category == cat

    def test_category_invalid_becomes_other(self):
        obj = RFICreate(
            subject="Subj", question="Q?", to_email="e@t.com", category="bogus"
        )
        assert obj.category == "other"

    def test_category_case_insensitive(self):
        obj = RFICreate(
            subject="Subj", question="Q?", to_email="e@t.com", category="DESIGN"
        )
        assert obj.category == "design"

    def test_priority_valid_values(self):
        for pri in ["low", "medium", "high", "urgent"]:
            obj = RFICreate(subject="Subj", question="Q?", to_email="e@t.com", priority=pri)
            assert obj.priority == pri

    def test_priority_invalid_becomes_medium(self):
        obj = RFICreate(
            subject="Subj", question="Q?", to_email="e@t.com", priority="bogus"
        )
        assert obj.priority == "medium"

    def test_xss_in_subject(self):
        obj = RFICreate(
            subject='<script>x</script>Foundation', question="Q?", to_email="e@t.com"
        )
        assert "<script>" not in obj.subject

    def test_cc_emails(self):
        obj = RFICreate(
            subject="Subj", question="Q?", to_email="e@t.com",
            cc_emails=["cc1@t.com", "cc2@t.com"],
        )
        assert len(obj.cc_emails) == 2

    def test_optional_uuid_fields(self):
        obj = RFICreate(
            subject="Subj", question="Q?", to_email="e@t.com",
            assigned_to_id=VALID_UUID, related_equipment_id=VALID_UUID,
        )
        assert obj.assigned_to_id == VALID_UUID

    def test_subject_too_long(self):
        with pytest.raises(ValidationError):
            RFICreate(subject="A" * 501, question="Q?", to_email="e@t.com")


# ---------------------------------------------------------------------------
# RFIUpdate
# ---------------------------------------------------------------------------
class TestRFIUpdate:
    def test_all_none(self):
        obj = RFIUpdate()
        assert obj.subject is None

    def test_partial_update(self):
        obj = RFIUpdate(subject="New Subject")
        assert obj.subject == "New Subject"


# ---------------------------------------------------------------------------
# RFIStatusUpdate
# ---------------------------------------------------------------------------
class TestRFIStatusUpdate:
    def test_valid_statuses(self):
        for status in ["draft", "open", "waiting_response", "answered", "closed", "cancelled"]:
            obj = RFIStatusUpdate(status=status)
            assert obj.status == status

    def test_invalid_status(self):
        with pytest.raises(ValidationError):
            RFIStatusUpdate(status="invalid_status")

    def test_case_insensitive(self):
        obj = RFIStatusUpdate(status="OPEN")
        assert obj.status == "open"


# ---------------------------------------------------------------------------
# RFIResponseCreate
# ---------------------------------------------------------------------------
class TestRFIResponseCreate:
    def test_valid(self):
        obj = RFIResponseCreate(response_text="The mix should be C30/37")
        assert obj.response_text == "The mix should be C30/37"

    def test_missing_text(self):
        with pytest.raises(ValidationError):
            RFIResponseCreate()

    def test_empty_text(self):
        with pytest.raises(ValidationError):
            RFIResponseCreate(response_text="")

    def test_xss_sanitization(self):
        obj = RFIResponseCreate(response_text='<script>x</script>Answer')
        assert "<script>" not in obj.response_text


# ---------------------------------------------------------------------------
# RFISummaryResponse
# ---------------------------------------------------------------------------
class TestRFISummaryResponse:
    def test_valid(self):
        obj = RFISummaryResponse(
            total_rfis=10, draft_count=2, open_count=3, waiting_response_count=1,
            answered_count=2, closed_count=1, overdue_count=1,
            by_priority={"high": 3}, by_category={"design": 5},
        )
        assert obj.total_rfis == 10


# ---------------------------------------------------------------------------
# ApprovalAction
# ---------------------------------------------------------------------------
class TestApprovalAction:
    def test_valid(self):
        obj = ApprovalAction(comments="Approved")
        assert obj.comments == "Approved"

    def test_none_comments(self):
        obj = ApprovalAction()
        assert obj.comments is None


# ---------------------------------------------------------------------------
# ApprovalStepResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestApprovalStepResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "approval_request_id": VALID_UUID,
            "step_order": 1, "status": "pending", "approver_role": "admin",
        }
        obj = ApprovalStepResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "approvalRequestId" in dumped
        assert "stepOrder" in dumped
        assert "approverRole" in dumped


# ---------------------------------------------------------------------------
# ApprovalRequestResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestApprovalRequestResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID,
            "entity_type": "equipment", "entity_id": VALID_UUID,
            "current_status": "submitted", "created_at": NOW,
        }
        obj = ApprovalRequestResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "entityType" in dumped
        assert "entityId" in dumped
        assert "currentStatus" in dumped
        assert "projectId" in dumped

    def test_steps_default_empty(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID,
            "entity_type": "equipment", "entity_id": VALID_UUID,
            "current_status": "submitted", "created_at": NOW,
        }
        obj = ApprovalRequestResponse(**data)
        assert obj.steps == []


# ---------------------------------------------------------------------------
# InspectionCreate
# ---------------------------------------------------------------------------
class TestInspectionCreate:
    def test_valid(self):
        obj = InspectionCreate(consultant_type_id=VALID_UUID, scheduled_date=NOW)
        assert obj.status == "pending"

    def test_missing_consultant_type_id(self):
        with pytest.raises(ValidationError):
            InspectionCreate(scheduled_date=NOW)

    def test_missing_scheduled_date(self):
        with pytest.raises(ValidationError):
            InspectionCreate(consultant_type_id=VALID_UUID)

    def test_optional_fields(self):
        obj = InspectionCreate(consultant_type_id=VALID_UUID, scheduled_date=NOW)
        assert obj.current_stage is None
        assert obj.notes is None

    def test_xss_in_notes(self):
        obj = InspectionCreate(
            consultant_type_id=VALID_UUID, scheduled_date=NOW,
            notes='<script>x</script>Note'
        )
        assert "<script>" not in obj.notes

    def test_notes_too_long(self):
        with pytest.raises(ValidationError):
            InspectionCreate(
                consultant_type_id=VALID_UUID, scheduled_date=NOW,
                notes="A" * 5001,
            )


# ---------------------------------------------------------------------------
# InspectionUpdate
# ---------------------------------------------------------------------------
class TestInspectionUpdate:
    def test_all_none(self):
        obj = InspectionUpdate()
        assert obj.consultant_type_id is None

    def test_partial_update(self):
        obj = InspectionUpdate(status="completed")
        assert obj.status == "completed"


# ---------------------------------------------------------------------------
# InspectionConsultantTypeCreate
# ---------------------------------------------------------------------------
class TestInspectionConsultantTypeCreate:
    def test_valid(self):
        obj = InspectionConsultantTypeCreate(name="Structural Engineer")
        assert obj.name == "Structural Engineer"

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            InspectionConsultantTypeCreate()

    def test_name_too_short(self):
        with pytest.raises(ValidationError):
            InspectionConsultantTypeCreate(name="A")

    def test_optional_description(self):
        obj = InspectionConsultantTypeCreate(name="Architect", description="Building review")
        assert obj.description == "Building review"

    def test_xss_in_name(self):
        obj = InspectionConsultantTypeCreate(name='<script>x</script>Engineer')
        assert "<script>" not in obj.name


# ---------------------------------------------------------------------------
# InspectionStageCreate
# ---------------------------------------------------------------------------
class TestInspectionStageCreate:
    def test_valid(self):
        obj = InspectionStageCreate(name="Foundation Check", order=0)
        assert obj.name == "Foundation Check"
        assert obj.order == 0

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            InspectionStageCreate(order=0)

    def test_order_negative(self):
        with pytest.raises(ValidationError):
            InspectionStageCreate(name="Stage", order=-1)

    def test_optional_documentation(self):
        obj = InspectionStageCreate(
            name="Stage", order=1, required_documentation={"docs": ["plan"]}
        )
        assert obj.required_documentation is not None


# ---------------------------------------------------------------------------
# FindingCreate
# ---------------------------------------------------------------------------
class TestFindingCreate:
    def test_valid(self):
        obj = FindingCreate(title="Crack Found", severity="high")
        assert obj.status == "open"

    def test_missing_title(self):
        with pytest.raises(ValidationError):
            FindingCreate(severity="high")

    def test_missing_severity(self):
        with pytest.raises(ValidationError):
            FindingCreate(title="Crack")

    def test_title_too_short(self):
        with pytest.raises(ValidationError):
            FindingCreate(title="A", severity="high")

    def test_xss_in_title(self):
        obj = FindingCreate(title='<script>x</script>Crack', severity="high")
        assert "<script>" not in obj.title

    def test_optional_fields(self):
        obj = FindingCreate(title="Crack", severity="high")
        assert obj.description is None
        assert obj.location is None
        assert obj.photos is None


# ---------------------------------------------------------------------------
# FindingUpdate
# ---------------------------------------------------------------------------
class TestFindingUpdate:
    def test_all_none(self):
        obj = FindingUpdate()
        assert obj.title is None

    def test_partial_update(self):
        obj = FindingUpdate(status="resolved")
        assert obj.status == "resolved"


# ---------------------------------------------------------------------------
# InspectionHistoryEventResponse (CamelCase)
# ---------------------------------------------------------------------------
class TestInspectionHistoryEventResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "inspection_id": VALID_UUID,
            "entity_type": "inspection", "entity_id": VALID_UUID,
            "action": "create", "created_at": NOW,
        }
        obj = InspectionHistoryEventResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "inspectionId" in dumped
        assert "entityType" in dumped
        assert "entityId" in dumped
        assert "oldValues" in dumped
        assert "newValues" in dumped


# ---------------------------------------------------------------------------
# InspectionSummaryResponse
# ---------------------------------------------------------------------------
class TestInspectionSummaryResponse:
    def test_valid(self):
        obj = InspectionSummaryResponse(
            total_inspections=10, pending_count=2, in_progress_count=3,
            completed_count=4, failed_count=1, overdue_count=0,
            findings_by_severity={"high": 5, "low": 2},
        )
        assert obj.total_inspections == 10


# ---------------------------------------------------------------------------
# Checklist schemas (from checklist.py)
# ---------------------------------------------------------------------------
class TestCLTemplateCreate:
    def test_valid(self):
        obj = CLTemplateCreate(name="Safety", level="project", group="Safety")
        assert obj.name == "Safety"

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            CLTemplateCreate(level="project", group="Safety")

    def test_missing_level(self):
        with pytest.raises(ValidationError):
            CLTemplateCreate(name="Safety", group="Safety")

    def test_missing_group(self):
        with pytest.raises(ValidationError):
            CLTemplateCreate(name="Safety", level="project")

    def test_xss_in_name(self):
        obj = CLTemplateCreate(name='<script>x</script>Safety', level="L", group="G")
        assert "<script>" not in obj.name


class TestCLSubCreate:
    def test_valid(self):
        obj = CLSubCreate(name="Section A", order=0)
        assert obj.name == "Section A"

    def test_order_negative(self):
        with pytest.raises(ValidationError):
            CLSubCreate(name="Sec", order=-1)


class TestCLItemCreate:
    def test_valid(self):
        obj = CLItemCreate(name="Check wiring")
        assert obj.must_image is False
        assert obj.must_note is False
        assert obj.must_signature is False

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            CLItemCreate()

    def test_boolean_flags(self):
        obj = CLItemCreate(name="Sig Item", must_signature=True, must_image=True)
        assert obj.must_signature is True
        assert obj.must_image is True


class TestCLInstanceCreate:
    def test_valid(self):
        obj = CLInstanceCreate(
            template_id=VALID_UUID, unit_identifier="Unit-A1", status="pending"
        )
        assert obj.unit_identifier == "Unit-A1"

    def test_missing_template_id(self):
        with pytest.raises(ValidationError):
            CLInstanceCreate(unit_identifier="Unit-A1", status="pending")


class TestCLItemRespCreate:
    def test_valid(self):
        obj = CLItemRespCreate(item_template_id=VALID_UUID, status="pending")
        assert obj.status == "pending"

    def test_missing_item_template_id(self):
        with pytest.raises(ValidationError):
            CLItemRespCreate(status="pending")

    def test_optional_notes(self):
        obj = CLItemRespCreate(
            item_template_id=VALID_UUID, status="approved", notes="Good"
        )
        assert obj.notes == "Good"


# ---------------------------------------------------------------------------
# ChecklistTemplate schemas (from checklist_template.py)
# ---------------------------------------------------------------------------
class TestCTplCreate:
    def test_valid(self):
        obj = CTplCreate(name="Template EN", name_he="Template HE")
        assert obj.is_active is True

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            CTplCreate(name_he="HE")

    def test_missing_name_he(self):
        with pytest.raises(ValidationError):
            CTplCreate(name="EN")

    def test_xss_in_both_names(self):
        obj = CTplCreate(
            name='<script>x</script>EN', name_he='<script>x</script>HE'
        )
        assert "<script>" not in obj.name
        assert "<script>" not in obj.name_he


class TestCTplSubCreate:
    def test_valid(self):
        obj = CTplSubCreate(name="Sub EN", name_he="Sub HE")
        assert obj.order_position == 0

    def test_missing_name_he(self):
        with pytest.raises(ValidationError):
            CTplSubCreate(name="Sub EN")


class TestCTplItemCreate:
    def test_valid(self):
        obj = CTplItemCreate(name="Item EN", name_he="Item HE")
        assert obj.order_position == 0

    def test_missing_names(self):
        with pytest.raises(ValidationError):
            CTplItemCreate()


class TestCTplInstanceCreate:
    def test_valid(self):
        obj = CTplInstanceCreate(project_id=VALID_UUID, template_id=VALID_UUID)
        assert obj.status is None
        assert obj.notes is None


class TestCTplItemRespCreate:
    def test_valid(self):
        obj = CTplItemRespCreate(instance_id=VALID_UUID, item_template_id=VALID_UUID)
        assert obj.is_completed is False

    def test_missing_instance_id(self):
        with pytest.raises(ValidationError):
            CTplItemRespCreate(item_template_id=VALID_UUID)


# ---------------------------------------------------------------------------
# Analytics schemas
# ---------------------------------------------------------------------------
class TestMetricsResponse:
    def test_valid(self):
        obj = MetricsResponse(
            total_projects=5, active_projects=3, total_inspections=10,
            pending_inspections=2, completed_inspections=8,
            total_equipment=20, approved_equipment=15,
            total_materials=30, approved_materials=25,
            total_meetings=5, approval_rate=0.75,
        )
        assert obj.approval_rate == 0.75

    def test_missing_field(self):
        with pytest.raises(ValidationError):
            MetricsResponse(total_projects=5)


class TestTrendDataPoint:
    def test_valid(self):
        obj = TrendDataPoint(
            date="2024-01-01", inspections=5,
            equipment_submissions=3, material_submissions=2,
        )
        assert obj.date == "2024-01-01"


class TestDistributionItem:
    def test_valid(self):
        obj = DistributionItem(label="approved", value=10)
        assert obj.label == "approved"


class TestDistributionsResponse:
    def test_valid(self):
        items = [DistributionItem(label="a", value=1)]
        obj = DistributionsResponse(
            inspection_status=items, equipment_status=items,
            material_status=items, project_status=items,
        )
        assert len(obj.inspection_status) == 1


# ---------------------------------------------------------------------------
# Chat schemas
# ---------------------------------------------------------------------------
class TestChatMessageRequest:
    def test_valid(self):
        obj = ChatMessageRequest(message="Hello")
        assert obj.message == "Hello"
        assert obj.conversation_id is None

    def test_empty_message(self):
        with pytest.raises(ValidationError):
            ChatMessageRequest(message="")

    def test_message_too_long(self):
        with pytest.raises(ValidationError):
            ChatMessageRequest(message="A" * 2001)

    def test_with_conversation_id(self):
        obj = ChatMessageRequest(message="Hi", conversation_id=VALID_UUID)
        assert obj.conversation_id == VALID_UUID


class TestChatMessageResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "conversation_id": VALID_UUID,
            "role": "assistant", "created_at": NOW,
        }
        obj = ChatMessageResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "conversationId" in dumped
        assert "createdAt" in dumped
        assert "toolCalls" in dumped


class TestChatSendResponse:
    def test_camel_case(self):
        msg = {"id": VALID_UUID, "conversation_id": VALID_UUID, "role": "user", "created_at": NOW}
        obj = ChatSendResponse(
            user_message=ChatMessageResponse(**msg),
            assistant_message=ChatMessageResponse(**{**msg, "role": "assistant"}),
            conversation_id=VALID_UUID,
        )
        dumped = obj.model_dump(by_alias=True)
        assert "userMessage" in dumped
        assert "assistantMessage" in dumped
        assert "conversationId" in dumped


class TestConversationListResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "created_at": NOW, "updated_at": NOW,
            "message_count": 5,
        }
        obj = ConversationListResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "messageCount" in dumped
        assert "createdAt" in dumped
        assert "updatedAt" in dumped


class TestConversationDetailResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "created_at": NOW, "updated_at": NOW,
            "messages": [],
        }
        obj = ConversationDetailResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "createdAt" in dumped
        assert obj.messages == []


# ---------------------------------------------------------------------------
# Document Analysis schemas
# ---------------------------------------------------------------------------
class TestDocumentAnalysisCreate:
    def test_valid(self):
        obj = DocumentAnalysisCreate(file_id=VALID_UUID, analysis_type="summarize")
        assert obj.analysis_type == "summarize"

    def test_missing_file_id(self):
        with pytest.raises(ValidationError):
            DocumentAnalysisCreate(analysis_type="summarize")

    def test_empty_analysis_type(self):
        with pytest.raises(ValidationError):
            DocumentAnalysisCreate(file_id=VALID_UUID, analysis_type="")

    def test_analysis_type_too_long(self):
        with pytest.raises(ValidationError):
            DocumentAnalysisCreate(file_id=VALID_UUID, analysis_type="A" * 51)


class TestDocumentAnalysisResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "file_id": VALID_UUID, "project_id": VALID_UUID,
            "analysis_type": "summarize", "model_used": "gemini",
            "status": "completed", "created_at": NOW, "updated_at": NOW,
            "processing_time_ms": 500, "error_message": None,
        }
        obj = DocumentAnalysisResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "fileId" in dumped
        assert "projectId" in dumped
        assert "analysisType" in dumped
        assert "modelUsed" in dumped
        assert "processingTimeMs" in dumped
        assert "errorMessage" in dumped


class TestDocumentAnalysisListResponse:
    def test_camel_case(self):
        obj = DocumentAnalysisListResponse(items=[], total=0)
        dumped = obj.model_dump(by_alias=True)
        assert dumped["total"] == 0


# ---------------------------------------------------------------------------
# Document Review schemas
# ---------------------------------------------------------------------------
class TestDocumentCommentCreate:
    def test_valid(self):
        obj = DocumentCommentCreate(comment_text="Looks good")
        assert obj.comment_text == "Looks good"

    def test_empty_text(self):
        with pytest.raises(ValidationError):
            DocumentCommentCreate(comment_text="")

    def test_xss_in_text(self):
        obj = DocumentCommentCreate(comment_text='<script>x</script>Good')
        assert "<script>" not in obj.comment_text

    def test_with_parent(self):
        obj = DocumentCommentCreate(
            comment_text="Reply", parent_comment_id=VALID_UUID
        )
        assert obj.parent_comment_id == VALID_UUID

    def test_text_too_long(self):
        with pytest.raises(ValidationError):
            DocumentCommentCreate(comment_text="A" * 5001)


class TestDocumentCommentUpdate:
    def test_valid(self):
        obj = DocumentCommentUpdate(is_resolved=True)
        assert obj.is_resolved is True
        assert obj.comment_text is None

    def test_update_text(self):
        obj = DocumentCommentUpdate(comment_text="Updated comment")
        assert obj.comment_text == "Updated comment"


class TestDocumentCommentResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "review_id": VALID_UUID,
            "comment_text": "OK", "created_at": NOW, "updated_at": NOW,
            "created_by_id": VALID_UUID, "is_resolved": False,
        }
        obj = DocumentCommentResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "reviewId" in dumped
        assert "commentText" in dumped
        assert "createdById" in dumped
        assert "isResolved" in dumped
        assert "parentCommentId" in dumped


class TestDocumentReviewCreate:
    def test_valid(self):
        obj = DocumentReviewCreate(document_id=VALID_UUID)
        assert obj.document_id == VALID_UUID
        assert obj.status is None

    def test_missing_document_id(self):
        with pytest.raises(ValidationError):
            DocumentReviewCreate()


class TestDocumentReviewUpdate:
    def test_valid(self):
        obj = DocumentReviewUpdate(status="approved")
        assert obj.status == "approved"

    def test_all_none(self):
        obj = DocumentReviewUpdate()
        assert obj.status is None
        assert obj.reviewed_by_id is None


class TestDocumentReviewResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "project_id": VALID_UUID,
            "document_id": VALID_UUID, "status": "pending",
            "created_at": NOW, "updated_at": NOW,
        }
        obj = DocumentReviewResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "projectId" in dumped
        assert "documentId" in dumped
        assert "createdById" in dumped
        assert "reviewedById" in dumped
        assert "reviewedAt" in dumped


# ---------------------------------------------------------------------------
# ConsultantAssignment schemas
# ---------------------------------------------------------------------------
class TestConsultantAssignmentCreate:
    def test_valid(self):
        obj = ConsultantAssignmentCreate(
            consultant_id=VALID_UUID, project_id=VALID_UUID,
            start_date=TODAY, end_date=TODAY,
        )
        assert obj.status == "pending"

    def test_missing_consultant_id(self):
        with pytest.raises(ValidationError):
            ConsultantAssignmentCreate(
                project_id=VALID_UUID, start_date=TODAY, end_date=TODAY,
            )

    def test_missing_start_date(self):
        with pytest.raises(ValidationError):
            ConsultantAssignmentCreate(
                consultant_id=VALID_UUID, project_id=VALID_UUID, end_date=TODAY,
            )

    def test_end_before_start(self):
        with pytest.raises(ValidationError):
            ConsultantAssignmentCreate(
                consultant_id=VALID_UUID, project_id=VALID_UUID,
                start_date=date(2025, 6, 15), end_date=date(2025, 6, 10),
            )

    def test_status_enum_values(self):
        for status in ["pending", "active", "completed", "cancelled"]:
            obj = ConsultantAssignmentCreate(
                consultant_id=VALID_UUID, project_id=VALID_UUID,
                start_date=TODAY, end_date=TODAY, status=status,
            )
            assert obj.status == status

    def test_invalid_status(self):
        with pytest.raises(ValidationError):
            ConsultantAssignmentCreate(
                consultant_id=VALID_UUID, project_id=VALID_UUID,
                start_date=TODAY, end_date=TODAY, status="bogus",
            )

    def test_optional_notes(self):
        obj = ConsultantAssignmentCreate(
            consultant_id=VALID_UUID, project_id=VALID_UUID,
            start_date=TODAY, end_date=TODAY, notes="Some notes",
        )
        assert obj.notes == "Some notes"

    def test_xss_in_notes(self):
        obj = ConsultantAssignmentCreate(
            consultant_id=VALID_UUID, project_id=VALID_UUID,
            start_date=TODAY, end_date=TODAY,
            notes='<script>x</script>Clean note',
        )
        assert "<script>" not in obj.notes

    def test_notes_too_long(self):
        with pytest.raises(ValidationError):
            ConsultantAssignmentCreate(
                consultant_id=VALID_UUID, project_id=VALID_UUID,
                start_date=TODAY, end_date=TODAY, notes="A" * 5001,
            )


class TestConsultantAssignmentUpdate:
    def test_all_none(self):
        obj = ConsultantAssignmentUpdate()
        assert obj.consultant_id is None
        assert obj.start_date is None

    def test_end_before_start_validation(self):
        with pytest.raises(ValidationError):
            ConsultantAssignmentUpdate(
                start_date=date(2025, 6, 15), end_date=date(2025, 6, 10),
            )

    def test_partial_update(self):
        obj = ConsultantAssignmentUpdate(status="active")
        assert obj.status == "active"

    def test_invalid_status(self):
        with pytest.raises(ValidationError):
            ConsultantAssignmentUpdate(status="bogus")


class TestConsultantAssignmentResponse:
    def test_camel_case(self):
        data = {
            "id": VALID_UUID, "consultant_id": VALID_UUID,
            "project_id": VALID_UUID, "start_date": TODAY,
            "end_date": TODAY, "status": "pending",
            "created_at": NOW, "updated_at": NOW,
            "consultant_type_id": VALID_UUID,
        }
        obj = ConsultantAssignmentResponse(**data)
        dumped = obj.model_dump(by_alias=True)
        assert "consultantId" in dumped
        assert "projectId" in dumped
        assert "startDate" in dumped
        assert "endDate" in dumped
        assert "consultantTypeId" in dumped
        assert "createdAt" in dumped
        assert "updatedAt" in dumped


# ---------------------------------------------------------------------------
# Cross-cutting validator tests
# ---------------------------------------------------------------------------
class TestSanitizationPatterns:
    def test_javascript_protocol(self):
        obj = EquipmentCreate(name='javascript:alert(1)Test Name')
        assert "javascript:" not in obj.name

    def test_onerror_handler(self):
        obj = EquipmentCreate(name='onerror=alert(1) Valid Name')
        assert "onerror=" not in obj.name

    def test_svg_tag(self):
        obj = EquipmentCreate(name='<svg onload=alert(1)>Test</svg>Name')
        assert "<svg" not in obj.name

    def test_object_tag(self):
        obj = EquipmentCreate(name='<object data="evil"></object>Name')
        assert "<object" not in obj.name

    def test_embed_tag(self):
        obj = EquipmentCreate(name='<embed src="evil"></embed>Name')
        assert "<embed" not in obj.name

    def test_link_tag(self):
        obj = EquipmentCreate(name='<link rel="stylesheet" href="evil">Name')
        assert "<link" not in obj.name

    def test_meta_tag(self):
        obj = EquipmentCreate(name='<meta http-equiv="refresh">Name')
        assert "<meta" not in obj.name

    def test_style_tag(self):
        obj = EquipmentCreate(name='<style>body{display:none}</style>Name')
        assert "<style>" not in obj.name

    def test_none_passthrough(self):
        obj = EquipmentUpdate(notes=None)
        assert obj.notes is None


class TestCodeValidation:
    def test_valid_codes(self):
        for code in ["A1", "PRJ-001", "TEST_CODE", "AB"]:
            obj = ProjectCreate(name="Project", code=code)
            assert obj.code == code.upper()

    def test_code_with_spaces_fails(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="Project", code="PRJ 01")

    def test_code_with_special_chars_fails(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="Project", code="PRJ@01")


class TestSpecificationsValidator:
    def test_none_returns_none(self):
        obj = EquipmentCreate(name="Gen", specifications=None)
        assert obj.specifications is None

    def test_empty_dict(self):
        obj = EquipmentCreate(name="Gen", specifications={})
        assert obj.specifications == {}

    def test_xss_in_spec_keys(self):
        obj = EquipmentCreate(
            name="Gen", specifications={'<script>x</script>key': 'value'}
        )
        for key in obj.specifications:
            assert "<script>" not in key

    def test_xss_in_spec_values(self):
        obj = EquipmentCreate(
            name="Gen", specifications={'key': '<script>x</script>value'}
        )
        for val in obj.specifications.values():
            if isinstance(val, str):
                assert "<script>" not in val


# ---------------------------------------------------------------------------
# PaginatedRFIResponse
# ---------------------------------------------------------------------------
class TestPaginatedRFIResponse:
    def test_valid(self):
        obj = PaginatedRFIResponse(
            items=[], total=0, page=1, page_size=20, total_pages=0,
        )
        assert obj.total == 0
        assert obj.page == 1

    def test_missing_field(self):
        with pytest.raises(ValidationError):
            PaginatedRFIResponse(items=[], total=0)


# ---------------------------------------------------------------------------
# Edge cases and type coercion
# ---------------------------------------------------------------------------
class TestEdgeCases:
    def test_uuid_string_coercion(self):
        obj = ProjectMemberCreate(user_id=VALID_UUID_STR, role="admin")
        assert isinstance(obj.user_id, uuid.UUID)

    def test_datetime_string_coercion(self):
        obj = MeetingCreate(title="Meeting", scheduled_date="2024-06-15T10:00:00")
        assert isinstance(obj.scheduled_date, datetime)

    def test_date_string_coercion(self):
        obj = ProjectCreate(name="Proj", code="P01", start_date="2024-06-15")
        assert isinstance(obj.start_date, date)

    def test_decimal_from_int(self):
        obj = MaterialCreate(name="Mat", quantity=100)
        assert obj.quantity == Decimal("100")

    def test_decimal_from_float(self):
        obj = MaterialCreate(name="Mat", quantity=10.5)
        assert obj.quantity == Decimal("10.5")

    def test_boolean_default_false(self):
        obj = ContactCreate(contact_type="sub", contact_name="Jane", email="jane@test.com")
        assert obj.is_primary is False

    def test_empty_string_name_fails(self):
        with pytest.raises(ValidationError):
            EquipmentCreate(name="")

    def test_whitespace_only_name_stripped_then_fails(self):
        with pytest.raises(ValidationError):
            UserRegister(email="a@b.com", password="12345678", full_name="  ")
