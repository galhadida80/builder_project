from datetime import datetime, date
from decimal import Decimal
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, ChecklistCreate, ChecklistItem
from app.schemas.material import MaterialCreate, MaterialUpdate, MaterialReceive
from app.schemas.equipment_template import (
    EquipmentTemplateCreate, EquipmentTemplateUpdate,
    DocumentDefinition, SpecificationDefinition, ChecklistItemDefinition,
    ConsultantTypeCreate, ConsultantTypeUpdate,
    EquipmentApprovalSubmissionCreate, EquipmentApprovalSubmissionUpdate,
    EquipmentApprovalDecisionCreate,
)
from app.schemas.material_template import MaterialTemplateCreate, MaterialTemplateUpdate
from app.schemas.equipment_submission import EquipmentSubmissionCreate, EquipmentSubmissionUpdate
from app.schemas.approval_decision import ApprovalDecisionCreate
from app.core.validators import (
    sanitize_string, validate_specifications, validate_code,
    MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_NOTES_LENGTH,
    MAX_DESCRIPTION_LENGTH, MAX_SPEC_KEYS, MAX_SPEC_KEY_LENGTH, MAX_SPEC_VALUE_LENGTH,
)


VALID_NAME = "Test Equipment"
VALID_NAME_HE = "ציוד בדיקה"
MIN_VALID_NAME = "AB"
MAX_VALID_NAME = "A" * MAX_NAME_LENGTH


class TestEquipmentCreateValid:

    @pytest.mark.parametrize("data", [
        {"name": "Basic Equipment"},
        {"name": MIN_VALID_NAME},
        {"name": MAX_VALID_NAME},
        {"name": "Full Equipment", "equipment_type": "Crane", "manufacturer": "CAT",
         "model_number": "X100", "serial_number": "SN-001"},
        {"name": "With Specs", "specifications": {"weight": "100kg", "color": "red"}},
        {"name": "With Dates", "installation_date": "2024-01-15T10:00:00",
         "warranty_expiry": "2025-01-15T10:00:00"},
        {"name": "With Notes", "notes": "Some installation notes here"},
        {"name": "All None Optionals", "equipment_type": None, "manufacturer": None,
         "model_number": None, "serial_number": None, "specifications": None,
         "installation_date": None, "warranty_expiry": None, "notes": None},
    ], ids=[
        "minimal", "min_length_name", "max_length_name", "full_data",
        "with_specs", "with_dates", "with_notes", "all_none_optionals",
    ])
    def test_valid_creation(self, data):
        eq = EquipmentCreate(**data)
        assert eq.name == data["name"].strip()

    @pytest.mark.parametrize("field,value,max_len", [
        ("equipment_type", "T" * 100, 100),
        ("manufacturer", "M" * MAX_NAME_LENGTH, MAX_NAME_LENGTH),
        ("model_number", "M" * 100, 100),
        ("serial_number", "S" * 100, 100),
        ("notes", "N" * MAX_NOTES_LENGTH, MAX_NOTES_LENGTH),
    ], ids=["equipment_type_100", "manufacturer_255", "model_100", "serial_100", "notes_5000"])
    def test_optional_field_at_max_length(self, field, value, max_len):
        data = {"name": VALID_NAME, field: value}
        eq = EquipmentCreate(**data)
        assert len(getattr(eq, field)) <= max_len


class TestEquipmentCreateInvalid:

    @pytest.mark.parametrize("name", [
        "",
        "A",
        "A" * 256,
    ], ids=["empty", "one_char", "too_long_256"])
    def test_invalid_name(self, name):
        with pytest.raises(ValidationError):
            EquipmentCreate(name=name)

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            EquipmentCreate()

    @pytest.mark.parametrize("field,value", [
        ("equipment_type", "T" * 101),
        ("manufacturer", "M" * 256),
        ("model_number", "M" * 101),
        ("serial_number", "S" * 101),
        ("notes", "N" * 5001),
    ], ids=["equipment_type_101", "manufacturer_256", "model_101", "serial_101", "notes_5001"])
    def test_optional_field_too_long(self, field, value):
        with pytest.raises(ValidationError):
            EquipmentCreate(name=VALID_NAME, **{field: value})


class TestEquipmentUpdate:

    def test_all_none_is_valid(self):
        eu = EquipmentUpdate()
        assert eu.name is None

    @pytest.mark.parametrize("field,value", [
        ("name", "Updated Name"),
        ("equipment_type", "Excavator"),
        ("manufacturer", "Volvo"),
        ("model_number", "EC350"),
        ("serial_number", "SN-999"),
        ("notes", "Updated notes"),
        ("installation_date", "2024-06-01T08:00:00"),
        ("warranty_expiry", "2026-06-01T08:00:00"),
        ("specifications", {"power": "200hp"}),
    ], ids=["name", "equipment_type", "manufacturer", "model_number",
            "serial_number", "notes", "installation_date", "warranty_expiry", "specifications"])
    def test_partial_update(self, field, value):
        eu = EquipmentUpdate(**{field: value})
        assert getattr(eu, field) is not None

    @pytest.mark.parametrize("name", [
        "A",
        "X" * 256,
    ], ids=["too_short", "too_long"])
    def test_invalid_name(self, name):
        with pytest.raises(ValidationError):
            EquipmentUpdate(name=name)


class TestMaterialCreateValid:

    @pytest.mark.parametrize("data", [
        {"name": "Concrete Mix"},
        {"name": MIN_VALID_NAME},
        {"name": MAX_VALID_NAME},
        {"name": "Full Material", "material_type": "Concrete", "manufacturer": "LafargeHolcim",
         "model_number": "C30", "quantity": Decimal("100"), "unit": "m3",
         "storage_location": "Warehouse A", "notes": "Handle with care"},
        {"name": "With Delivery", "expected_delivery": "2024-06-01", "actual_delivery": "2024-06-03"},
        {"name": "With Specs", "specifications": {"grade": "C30", "slump": "100mm"}},
        {"name": "All None", "material_type": None, "manufacturer": None, "model_number": None,
         "quantity": None, "unit": None, "specifications": None, "expected_delivery": None,
         "actual_delivery": None, "storage_location": None, "notes": None},
    ], ids=["minimal", "min_name", "max_name", "full_data", "with_delivery", "with_specs", "all_none"])
    def test_valid_creation(self, data):
        mat = MaterialCreate(**data)
        assert mat.name == data["name"].strip()


class TestMaterialCreateInvalid:

    @pytest.mark.parametrize("name", [
        "",
        "A",
        "A" * 256,
    ], ids=["empty", "one_char", "too_long"])
    def test_invalid_name(self, name):
        with pytest.raises(ValidationError):
            MaterialCreate(name=name)

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            MaterialCreate()

    @pytest.mark.parametrize("field,value", [
        ("material_type", "T" * 101),
        ("manufacturer", "M" * 256),
        ("model_number", "M" * 101),
        ("unit", "U" * 51),
        ("storage_location", "S" * 256),
        ("notes", "N" * 5001),
    ], ids=["material_type", "manufacturer", "model_number", "unit", "storage_location", "notes"])
    def test_optional_field_too_long(self, field, value):
        with pytest.raises(ValidationError):
            MaterialCreate(name=VALID_NAME, **{field: value})


class TestMaterialQuantity:

    @pytest.mark.parametrize("quantity,should_pass", [
        (Decimal("0"), True),
        (Decimal("0.01"), True),
        (Decimal("1"), True),
        (Decimal("999999999"), True),
        (None, True),
        (Decimal("-1"), False),
        (Decimal("-0.01"), False),
        (Decimal("1000000000"), False),
        (Decimal("9999999999"), False),
    ], ids=["zero", "small_positive", "one", "max_boundary", "none",
            "negative_one", "negative_small", "over_max", "way_over_max"])
    def test_quantity_validation(self, quantity, should_pass):
        if should_pass:
            mat = MaterialCreate(name=VALID_NAME, quantity=quantity)
            assert mat.quantity == quantity
        else:
            with pytest.raises(ValidationError):
                MaterialCreate(name=VALID_NAME, quantity=quantity)


class TestMaterialUpdate:

    def test_all_none_is_valid(self):
        mu = MaterialUpdate()
        assert mu.name is None

    @pytest.mark.parametrize("field,value", [
        ("name", "Updated Material"),
        ("material_type", "Steel"),
        ("quantity", Decimal("50.5")),
        ("unit", "kg"),
        ("expected_delivery", "2024-07-01"),
        ("actual_delivery", "2024-07-02"),
        ("storage_location", "Bay 3"),
        ("notes", "Partial shipment"),
    ], ids=["name", "material_type", "quantity", "unit",
            "expected_delivery", "actual_delivery", "storage_location", "notes"])
    def test_partial_update(self, field, value):
        mu = MaterialUpdate(**{field: value})
        assert getattr(mu, field) is not None


class TestMaterialReceive:

    @pytest.mark.parametrize("qty,should_pass", [
        (Decimal("0.01"), True),
        (Decimal("1"), True),
        (Decimal("999999999"), True),
        (Decimal("500.75"), True),
        (Decimal("0"), False),
        (Decimal("-1"), False),
        (Decimal("1000000000"), False),
    ], ids=["small_positive", "one", "max_boundary", "decimal",
            "zero_invalid", "negative_invalid", "over_max_invalid"])
    def test_quantity_received(self, qty, should_pass):
        if should_pass:
            mr = MaterialReceive(quantity_received=qty)
            assert mr.quantity_received == qty
        else:
            with pytest.raises(ValidationError):
                MaterialReceive(quantity_received=qty)

    def test_with_notes(self):
        mr = MaterialReceive(quantity_received=Decimal("10"), notes="Received in good condition")
        assert mr.notes == "Received in good condition"

    def test_notes_too_long(self):
        with pytest.raises(ValidationError):
            MaterialReceive(quantity_received=Decimal("10"), notes="N" * 5001)

    def test_missing_quantity(self):
        with pytest.raises(ValidationError):
            MaterialReceive()


class TestDocumentDefinition:

    @pytest.mark.parametrize("source", [
        "consultant",
        "project_manager",
        "contractor",
    ])
    def test_valid_source(self, source):
        doc = DocumentDefinition(
            name="Test Doc", name_he="מסמך בדיקה", source=source
        )
        assert doc.source == source

    @pytest.mark.parametrize("source", [
        "invalid_source",
        "admin",
        "owner",
        "",
        "CONSULTANT",
    ], ids=["invalid", "admin", "owner", "empty", "uppercase"])
    def test_invalid_source(self, source):
        with pytest.raises(ValidationError):
            DocumentDefinition(name="Test Doc", name_he="מסמך בדיקה", source=source)

    def test_valid_with_description(self):
        doc = DocumentDefinition(
            name="Doc Name", name_he="שם מסמך",
            source="consultant", description="A document", required=False
        )
        assert doc.description == "A document"
        assert doc.required is False

    def test_default_required_is_true(self):
        doc = DocumentDefinition(name="Doc", name_he="מסמך", source="contractor")
        assert doc.required is True

    def test_description_too_long(self):
        with pytest.raises(ValidationError):
            DocumentDefinition(
                name="Doc", name_he="מסמך", source="consultant",
                description="D" * (MAX_DESCRIPTION_LENGTH + 1)
            )

    @pytest.mark.parametrize("field", ["name", "name_he"])
    def test_missing_required_field(self, field):
        data = {"name": "Doc", "name_he": "מסמך", "source": "consultant"}
        del data[field]
        with pytest.raises(ValidationError):
            DocumentDefinition(**data)

    @pytest.mark.parametrize("field", ["name", "name_he"])
    def test_name_too_short(self, field):
        data = {"name": "Doc", "name_he": "מסמך", "source": "consultant", field: "A"}
        with pytest.raises(ValidationError):
            DocumentDefinition(**data)


class TestSpecificationDefinition:

    @pytest.mark.parametrize("field_type", [
        "text",
        "number",
        "boolean",
        "select",
        "file",
    ])
    def test_valid_field_types(self, field_type):
        kwargs = {"name": "Spec", "name_he": "מפרט", "field_type": field_type}
        if field_type == "select":
            kwargs["options"] = ["opt1", "opt2"]
        spec = SpecificationDefinition(**kwargs)
        assert spec.field_type == field_type

    @pytest.mark.parametrize("field_type", [
        "invalid",
        "dropdown",
        "checkbox",
        "TEXT",
        "",
    ], ids=["invalid", "dropdown", "checkbox", "uppercase", "empty"])
    def test_invalid_field_types(self, field_type):
        with pytest.raises(ValidationError):
            SpecificationDefinition(name="Spec", name_he="מפרט", field_type=field_type)

    def test_select_requires_options(self):
        with pytest.raises(ValidationError):
            SpecificationDefinition(
                name="Spec", name_he="מפרט", field_type="select", options=None
            )

    def test_select_requires_non_empty_options(self):
        with pytest.raises(ValidationError):
            SpecificationDefinition(
                name="Spec", name_he="מפרט", field_type="select", options=[]
            )

    @pytest.mark.parametrize("field_type", ["text", "number", "boolean", "file"])
    def test_non_select_must_not_have_options(self, field_type):
        with pytest.raises(ValidationError):
            SpecificationDefinition(
                name="Spec", name_he="מפרט", field_type=field_type,
                options=["a", "b"]
            )

    def test_select_with_valid_options(self):
        spec = SpecificationDefinition(
            name="Color", name_he="צבע", field_type="select",
            options=["red", "blue", "green"]
        )
        assert len(spec.options) == 3

    def test_with_unit(self):
        spec = SpecificationDefinition(
            name="Weight", name_he="משקל", field_type="number", unit="kg"
        )
        assert spec.unit == "kg"

    def test_unit_too_long(self):
        with pytest.raises(ValidationError):
            SpecificationDefinition(
                name="Weight", name_he="משקל", field_type="number", unit="U" * 51
            )

    def test_default_required_is_true(self):
        spec = SpecificationDefinition(name="Spec", name_he="מפרט", field_type="text")
        assert spec.required is True

    def test_required_false(self):
        spec = SpecificationDefinition(
            name="Spec", name_he="מפרט", field_type="text", required=False
        )
        assert spec.required is False


class TestChecklistItemDefinition:

    def test_valid_item(self):
        item = ChecklistItemDefinition(name="Check bolts", name_he="בדוק ברגים")
        assert item.name == "Check bolts"
        assert item.requires_file is False

    def test_requires_file_true(self):
        item = ChecklistItemDefinition(
            name="Upload photo", name_he="העלה תמונה", requires_file=True
        )
        assert item.requires_file is True

    def test_requires_file_false(self):
        item = ChecklistItemDefinition(
            name="Visual check", name_he="בדיקה חזותית", requires_file=False
        )
        assert item.requires_file is False

    @pytest.mark.parametrize("field", ["name", "name_he"])
    def test_missing_required(self, field):
        data = {"name": "Item", "name_he": "פריט"}
        del data[field]
        with pytest.raises(ValidationError):
            ChecklistItemDefinition(**data)

    @pytest.mark.parametrize("field", ["name", "name_he"])
    def test_name_too_short(self, field):
        data = {"name": "Item", "name_he": "פריט", field: "A"}
        with pytest.raises(ValidationError):
            ChecklistItemDefinition(**data)

    @pytest.mark.parametrize("field", ["name", "name_he"])
    def test_name_too_long(self, field):
        data = {"name": "Item", "name_he": "פריט", field: "X" * 256}
        with pytest.raises(ValidationError):
            ChecklistItemDefinition(**data)


class TestEquipmentTemplateCreate:

    def test_valid_minimal(self):
        et = EquipmentTemplateCreate(name=VALID_NAME, name_he=VALID_NAME_HE)
        assert et.name == VALID_NAME
        assert et.required_documents == []
        assert et.required_specifications == []
        assert et.submission_checklist == []

    def test_valid_with_all_nested(self):
        et = EquipmentTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE,
            category="HVAC", description="Template for HVAC equipment",
            required_documents=[
                DocumentDefinition(name="Cert", name_he="אישור", source="consultant")
            ],
            required_specifications=[
                SpecificationDefinition(name="Power", name_he="הספק", field_type="number", unit="kW")
            ],
            submission_checklist=[
                ChecklistItemDefinition(name="Verify", name_he="אמת")
            ],
        )
        assert len(et.required_documents) == 1
        assert len(et.required_specifications) == 1
        assert len(et.submission_checklist) == 1

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            EquipmentTemplateCreate(name_he=VALID_NAME_HE)

    def test_missing_name_he(self):
        with pytest.raises(ValidationError):
            EquipmentTemplateCreate(name=VALID_NAME)

    def test_category_is_optional(self):
        et = EquipmentTemplateCreate(name=VALID_NAME, name_he=VALID_NAME_HE, category=None)
        assert et.category is None

    def test_description_too_long(self):
        with pytest.raises(ValidationError):
            EquipmentTemplateCreate(
                name=VALID_NAME, name_he=VALID_NAME_HE,
                description="D" * (MAX_DESCRIPTION_LENGTH + 1)
            )

    @pytest.mark.parametrize("field", ["name", "name_he"])
    def test_name_too_short(self, field):
        data = {"name": VALID_NAME, "name_he": VALID_NAME_HE, field: "A"}
        with pytest.raises(ValidationError):
            EquipmentTemplateCreate(**data)

    @pytest.mark.parametrize("field", ["name", "name_he"])
    def test_name_too_long(self, field):
        data = {"name": VALID_NAME, "name_he": VALID_NAME_HE, field: "X" * 256}
        with pytest.raises(ValidationError):
            EquipmentTemplateCreate(**data)


class TestEquipmentTemplateUpdate:

    def test_all_none_is_valid(self):
        etu = EquipmentTemplateUpdate()
        assert etu.name is None

    @pytest.mark.parametrize("field,value", [
        ("name", "Updated Template"),
        ("name_he", "תבנית מעודכנת"),
        ("category", "Electrical"),
        ("description", "Updated description"),
    ], ids=["name", "name_he", "category", "description"])
    def test_partial_update(self, field, value):
        etu = EquipmentTemplateUpdate(**{field: value})
        assert getattr(etu, field) == value

    def test_update_with_documents(self):
        etu = EquipmentTemplateUpdate(
            required_documents=[
                DocumentDefinition(name="New Doc", name_he="מסמך חדש", source="contractor")
            ]
        )
        assert len(etu.required_documents) == 1

    def test_update_with_specifications(self):
        etu = EquipmentTemplateUpdate(
            required_specifications=[
                SpecificationDefinition(
                    name="Height", name_he="גובה", field_type="number", unit="m"
                )
            ]
        )
        assert len(etu.required_specifications) == 1


class TestMaterialTemplateCreate:

    def test_valid_minimal(self):
        mt = MaterialTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, category="Concrete"
        )
        assert mt.category == "Concrete"
        assert mt.is_active is True

    def test_category_is_required(self):
        with pytest.raises(ValidationError):
            MaterialTemplateCreate(name=VALID_NAME, name_he=VALID_NAME_HE)

    def test_category_too_short(self):
        with pytest.raises(ValidationError):
            MaterialTemplateCreate(name=VALID_NAME, name_he=VALID_NAME_HE, category="A")

    def test_category_too_long(self):
        with pytest.raises(ValidationError):
            MaterialTemplateCreate(
                name=VALID_NAME, name_he=VALID_NAME_HE, category="C" * 256
            )

    def test_is_active_default_true(self):
        mt = MaterialTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, category="Steel"
        )
        assert mt.is_active is True

    def test_is_active_false(self):
        mt = MaterialTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, category="Steel", is_active=False
        )
        assert mt.is_active is False

    def test_with_all_nested(self):
        mt = MaterialTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, category="Piping",
            required_documents=[
                DocumentDefinition(name="Spec Sheet", name_he="דף מפרט", source="project_manager")
            ],
            required_specifications=[
                SpecificationDefinition(
                    name="Diameter", name_he="קוטר", field_type="number", unit="mm"
                )
            ],
            submission_checklist=[
                ChecklistItemDefinition(name="Measure", name_he="מדוד")
            ],
        )
        assert len(mt.required_documents) == 1

    @pytest.mark.parametrize("field", ["name", "name_he"])
    def test_missing_name_fields(self, field):
        data = {"name": VALID_NAME, "name_he": VALID_NAME_HE, "category": "Test"}
        del data[field]
        with pytest.raises(ValidationError):
            MaterialTemplateCreate(**data)


class TestMaterialTemplateUpdate:

    def test_all_none_is_valid(self):
        mtu = MaterialTemplateUpdate()
        assert mtu.name is None
        assert mtu.is_active is None

    @pytest.mark.parametrize("field,value", [
        ("name", "New Material"),
        ("name_he", "חומר חדש"),
        ("category", "Updated Cat"),
        ("is_active", False),
    ], ids=["name", "name_he", "category", "is_active"])
    def test_partial_update(self, field, value):
        mtu = MaterialTemplateUpdate(**{field: value})
        assert getattr(mtu, field) == value

    def test_category_too_short(self):
        with pytest.raises(ValidationError):
            MaterialTemplateUpdate(category="A")


class TestEquipmentSubmissionCreate:

    def test_valid(self):
        tid = uuid4()
        es = EquipmentSubmissionCreate(name=VALID_NAME, template_id=tid)
        assert es.template_id == tid

    def test_with_all_fields(self):
        es = EquipmentSubmissionCreate(
            name=VALID_NAME, template_id=uuid4(),
            description="Test submission", specifications={"key": "val"},
            notes="Test notes"
        )
        assert es.description == "Test submission"

    def test_missing_name(self):
        with pytest.raises(ValidationError):
            EquipmentSubmissionCreate(template_id=uuid4())

    def test_missing_template_id(self):
        with pytest.raises(ValidationError):
            EquipmentSubmissionCreate(name=VALID_NAME)

    def test_name_too_short(self):
        with pytest.raises(ValidationError):
            EquipmentSubmissionCreate(name="A", template_id=uuid4())

    def test_name_too_long(self):
        with pytest.raises(ValidationError):
            EquipmentSubmissionCreate(name="X" * 256, template_id=uuid4())

    def test_description_too_long(self):
        with pytest.raises(ValidationError):
            EquipmentSubmissionCreate(
                name=VALID_NAME, template_id=uuid4(),
                description="D" * (MAX_DESCRIPTION_LENGTH + 1)
            )

    def test_notes_too_long(self):
        with pytest.raises(ValidationError):
            EquipmentSubmissionCreate(
                name=VALID_NAME, template_id=uuid4(),
                notes="N" * (MAX_NOTES_LENGTH + 1)
            )


class TestEquipmentSubmissionUpdate:

    def test_all_none(self):
        esu = EquipmentSubmissionUpdate()
        assert esu.name is None

    @pytest.mark.parametrize("field,value", [
        ("name", "Updated Submission"),
        ("description", "Updated desc"),
        ("notes", "Updated notes"),
        ("specifications", {"new_key": "new_val"}),
    ], ids=["name", "description", "notes", "specifications"])
    def test_partial_update(self, field, value):
        esu = EquipmentSubmissionUpdate(**{field: value})
        assert getattr(esu, field) is not None


class TestApprovalDecisionCreate:

    @pytest.mark.parametrize("decision", [
        "approved",
        "rejected",
        "pending",
        "any_string",
    ], ids=["approved", "rejected", "pending", "any_string"])
    def test_valid_decisions(self, decision):
        ad = ApprovalDecisionCreate(decision=decision)
        assert ad.decision == decision

    def test_with_comments(self):
        ad = ApprovalDecisionCreate(decision="approved", comments="Looks good")
        assert ad.comments == "Looks good"

    def test_comments_none(self):
        ad = ApprovalDecisionCreate(decision="rejected", comments=None)
        assert ad.comments is None

    def test_missing_decision(self):
        with pytest.raises(ValidationError):
            ApprovalDecisionCreate()


class TestEquipmentApprovalSubmissionCreate:

    def test_valid(self):
        eid = uuid4()
        eas = EquipmentApprovalSubmissionCreate(equipment_id=eid)
        assert eas.equipment_id == eid

    def test_with_comments(self):
        eas = EquipmentApprovalSubmissionCreate(
            equipment_id=uuid4(), comments="Please review"
        )
        assert eas.comments == "Please review"

    def test_missing_equipment_id(self):
        with pytest.raises(ValidationError):
            EquipmentApprovalSubmissionCreate()


class TestEquipmentApprovalSubmissionUpdate:

    def test_valid(self):
        easu = EquipmentApprovalSubmissionUpdate(comments="Updated comment")
        assert easu.comments == "Updated comment"

    def test_comments_none(self):
        easu = EquipmentApprovalSubmissionUpdate(comments=None)
        assert easu.comments is None

    def test_comments_too_long(self):
        with pytest.raises(ValidationError):
            EquipmentApprovalSubmissionUpdate(comments="C" * (MAX_NOTES_LENGTH + 1))


class TestEquipmentApprovalDecisionCreate:

    @pytest.mark.parametrize("decision", ["approved", "rejected"])
    def test_valid_decisions(self, decision):
        sid = uuid4()
        ead = EquipmentApprovalDecisionCreate(submission_id=sid, decision=decision)
        assert ead.decision == decision

    @pytest.mark.parametrize("decision", ["pending", "invalid", "APPROVED", ""], ids=[
        "pending", "invalid", "uppercase", "empty"
    ])
    def test_invalid_decisions(self, decision):
        with pytest.raises(ValidationError):
            EquipmentApprovalDecisionCreate(submission_id=uuid4(), decision=decision)

    def test_with_comments(self):
        ead = EquipmentApprovalDecisionCreate(
            submission_id=uuid4(), decision="approved", comments="Approved with conditions"
        )
        assert ead.comments == "Approved with conditions"

    def test_missing_submission_id(self):
        with pytest.raises(ValidationError):
            EquipmentApprovalDecisionCreate(decision="approved")


class TestConsultantTypeCreate:

    def test_valid(self):
        ct = ConsultantTypeCreate(
            name="Structural", name_he="קונסטרוקטור", category="Engineering"
        )
        assert ct.name == "Structural"

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    def test_missing_required(self, field):
        data = {"name": "Test", "name_he": "בדיקה", "category": "Cat"}
        del data[field]
        with pytest.raises(ValidationError):
            ConsultantTypeCreate(**data)

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    def test_too_short(self, field):
        data = {"name": "Test", "name_he": "בדיקה", "category": "Cat"}
        data[field] = "A"
        with pytest.raises(ValidationError):
            ConsultantTypeCreate(**data)

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    def test_too_long(self, field):
        data = {"name": "Test", "name_he": "בדיקה", "category": "Cat"}
        data[field] = "X" * 256
        with pytest.raises(ValidationError):
            ConsultantTypeCreate(**data)


class TestConsultantTypeUpdate:

    def test_all_none(self):
        ctu = ConsultantTypeUpdate()
        assert ctu.name is None

    @pytest.mark.parametrize("field,value", [
        ("name", "Updated"),
        ("name_he", "מעודכן"),
        ("category", "New Cat"),
    ], ids=["name", "name_he", "category"])
    def test_partial_update(self, field, value):
        ctu = ConsultantTypeUpdate(**{field: value})
        assert getattr(ctu, field) == value

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    def test_too_short(self, field):
        with pytest.raises(ValidationError):
            ConsultantTypeUpdate(**{field: "A"})


class TestChecklistItem:

    def test_valid(self):
        ci = ChecklistItem(id="chk-1", label="Check wiring")
        assert ci.is_completed is False
        assert ci.completed_at is None

    def test_completed(self):
        ci = ChecklistItem(
            id="chk-2", label="Inspect bolts", is_completed=True,
            completed_at="2024-06-01T10:00:00", notes="All good"
        )
        assert ci.is_completed is True

    def test_label_too_short(self):
        with pytest.raises(ValidationError):
            ChecklistItem(id="chk-1", label="")

    def test_label_too_long(self):
        with pytest.raises(ValidationError):
            ChecklistItem(id="chk-1", label="L" * 256)

    def test_id_too_long(self):
        with pytest.raises(ValidationError):
            ChecklistItem(id="X" * 101, label="Valid")

    def test_notes_too_long(self):
        with pytest.raises(ValidationError):
            ChecklistItem(id="chk-1", label="Valid", notes="N" * 5001)


class TestChecklistCreate:

    def test_valid(self):
        cc = ChecklistCreate(
            checklist_name="Install Checklist",
            items=[ChecklistItem(id="c1", label="Step 1")]
        )
        assert cc.checklist_name == "Install Checklist"

    def test_name_too_short(self):
        with pytest.raises(ValidationError):
            ChecklistCreate(
                checklist_name="A",
                items=[ChecklistItem(id="c1", label="Step 1")]
            )

    def test_name_too_long(self):
        with pytest.raises(ValidationError):
            ChecklistCreate(
                checklist_name="N" * 256,
                items=[ChecklistItem(id="c1", label="Step 1")]
            )

    def test_too_many_items(self):
        items = [ChecklistItem(id=f"c{i}", label=f"Step {i}") for i in range(101)]
        with pytest.raises(ValidationError):
            ChecklistCreate(checklist_name="Test", items=items)


class TestSanitizeString:

    @pytest.mark.parametrize("input_val,expected_empty_or_cleaned", [
        ("<script>alert('xss')</script>", True),
        ("javascript:alert(1)", True),
        ("<img src=x onerror=alert(1)>", True),
        ("<iframe src=\"evil.com\">", True),
        ("<svg onload=alert(1)>test</svg>", True),
        ("<object data=evil></object>", True),
        ("<embed src=evil>", True),
        ("<link rel=stylesheet href=evil>", True),
        ("<meta http-equiv=refresh>", True),
        ("<style>body{display:none}</style>", True),
    ], ids=[
        "script_tag", "javascript_protocol", "img_onerror", "iframe",
        "svg_onload", "object_tag", "embed_tag", "link_tag", "meta_tag", "style_tag",
    ])
    def test_xss_patterns_removed(self, input_val, expected_empty_or_cleaned):
        result = sanitize_string(input_val)
        assert "<script" not in result.lower()
        assert "javascript:" not in result.lower()
        assert "<iframe" not in result.lower()
        assert "<img" not in result.lower()
        assert "<svg" not in result.lower()
        assert "<object" not in result.lower()
        assert "<embed" not in result.lower()
        assert "<link" not in result.lower()
        assert "<meta" not in result.lower()
        assert "<style" not in result.lower()

    @pytest.mark.parametrize("input_val,expected", [
        ("Normal text", "Normal text"),
        ("Hello World", "Hello World"),
        ("Test 123 !@#$%", "Test 123 !@#$%"),
        ("Unicode: אבגד", "Unicode: אבגד"),
    ], ids=["normal", "hello", "special_chars", "unicode"])
    def test_safe_text_unchanged(self, input_val, expected):
        assert sanitize_string(input_val) == expected

    def test_none_returns_none(self):
        assert sanitize_string(None) is None

    @pytest.mark.parametrize("input_val,expected", [
        ("  leading spaces", "leading spaces"),
        ("trailing spaces  ", "trailing spaces"),
        ("  both sides  ", "both sides"),
    ], ids=["leading", "trailing", "both"])
    def test_whitespace_trimmed(self, input_val, expected):
        assert sanitize_string(input_val) == expected

    def test_mixed_safe_and_dangerous(self):
        result = sanitize_string("Hello <script>evil()</script> World")
        assert "Hello" in result
        assert "World" in result
        assert "<script" not in result

    def test_on_event_handler(self):
        result = sanitize_string('some text onclick="evil()" more text')
        assert 'onclick=' not in result


class TestValidateSpecifications:

    def test_none_returns_none(self):
        assert validate_specifications(None) is None

    def test_empty_dict(self):
        assert validate_specifications({}) == {}

    @pytest.mark.parametrize("specs", [
        {"weight": "100kg"},
        {"color": "red", "size": "large"},
        {"a": "b", "c": "d", "e": "f"},
    ], ids=["single_key", "two_keys", "three_keys"])
    def test_valid_string_values(self, specs):
        result = validate_specifications(specs)
        assert len(result) == len(specs)

    @pytest.mark.parametrize("key,value,expected_type", [
        ("count", 42, int),
        ("ratio", 3.14, float),
        ("active", True, bool),
        ("active", False, bool),
        ("note", None, type(None)),
    ], ids=["int", "float", "bool_true", "bool_false", "null"])
    def test_valid_value_types(self, key, value, expected_type):
        result = validate_specifications({key: value})
        assert isinstance(result[key], expected_type)

    def test_mixed_value_types(self):
        specs = {"name": "Test", "count": 5, "ratio": 1.5, "active": True, "note": None}
        result = validate_specifications(specs)
        assert len(result) == 5

    def test_too_many_keys(self):
        specs = {f"key_{i}": f"val_{i}" for i in range(MAX_SPEC_KEYS + 1)}
        with pytest.raises(ValueError, match="cannot have more than"):
            validate_specifications(specs)

    def test_exactly_max_keys(self):
        specs = {f"key_{i}": f"val_{i}" for i in range(MAX_SPEC_KEYS)}
        result = validate_specifications(specs)
        assert len(result) == MAX_SPEC_KEYS

    def test_key_too_long(self):
        specs = {"k" * (MAX_SPEC_KEY_LENGTH + 1): "value"}
        with pytest.raises(ValueError, match="key cannot exceed"):
            validate_specifications(specs)

    def test_key_at_max_length(self):
        specs = {"k" * MAX_SPEC_KEY_LENGTH: "value"}
        result = validate_specifications(specs)
        assert len(result) == 1

    def test_value_too_long(self):
        specs = {"key": "v" * (MAX_SPEC_VALUE_LENGTH + 1)}
        with pytest.raises(ValueError, match="value cannot exceed"):
            validate_specifications(specs)

    def test_value_at_max_length(self):
        specs = {"key": "v" * MAX_SPEC_VALUE_LENGTH}
        result = validate_specifications(specs)
        assert len(result["key"]) <= MAX_SPEC_VALUE_LENGTH

    @pytest.mark.parametrize("bad_value", [
        [1, 2, 3],
        {"nested": "dict"},
        (1, 2),
    ], ids=["list", "dict", "tuple"])
    def test_invalid_value_types(self, bad_value):
        with pytest.raises(ValueError, match="must be string, number, boolean, or null"):
            validate_specifications({"key": bad_value})

    def test_non_dict_input(self):
        with pytest.raises(ValueError, match="must be a JSON object"):
            validate_specifications("not a dict")

    def test_sanitizes_keys(self):
        result = validate_specifications({"<script>evil</script>key": "value"})
        for key in result:
            assert "<script" not in key

    def test_sanitizes_string_values(self):
        result = validate_specifications({"key": "<script>alert(1)</script>safe"})
        assert "<script" not in result["key"]


class TestValidateCode:

    @pytest.mark.parametrize("code,expected", [
        ("ABC", "ABC"),
        ("abc", "ABC"),
        ("A1", "A1"),
        ("PROJECT-001", "PROJECT-001"),
        ("TWR_ALPHA", "TWR_ALPHA"),
        ("A1B2C3", "A1B2C3"),
        ("X-Y-Z", "X-Y-Z"),
        ("AB", "AB"),
    ], ids=["uppercase", "lowercase_to_upper", "alphanumeric", "with_hyphen",
            "with_underscore", "mixed", "multi_hyphen", "min_length"])
    def test_valid_codes(self, code, expected):
        assert validate_code(code) == expected

    @pytest.mark.parametrize("code", [
        "A B C",
        "AB@CD",
        "TEST!",
        "code.name",
        "",
        "-START",
    ], ids=["spaces", "at_sign", "exclamation", "dot", "empty", "leading_hyphen"])
    def test_invalid_codes(self, code):
        with pytest.raises(ValueError, match="must contain only"):
            validate_code(code)

    def test_strips_whitespace(self):
        assert validate_code("  ABC  ") == "ABC"


class TestEquipmentCreateSanitization:

    @pytest.mark.parametrize("field", [
        "name", "equipment_type", "manufacturer", "model_number", "serial_number", "notes"
    ])
    def test_xss_sanitized_on_fields(self, field):
        value = "<script>alert(1)</script>Safe Text"
        data = {"name": VALID_NAME}
        data[field] = value
        eq = EquipmentCreate(**data)
        result = getattr(eq, field)
        assert "<script" not in result

    def test_specifications_sanitized(self):
        eq = EquipmentCreate(
            name=VALID_NAME,
            specifications={"<script>key</script>safe": "<img src=x>value"}
        )
        for key in eq.specifications:
            assert "<script" not in key
        for val in eq.specifications.values():
            if isinstance(val, str):
                assert "<img" not in val


class TestMaterialCreateSanitization:

    @pytest.mark.parametrize("field", [
        "name", "material_type", "manufacturer", "model_number",
        "unit", "storage_location", "notes"
    ])
    def test_xss_sanitized_on_fields(self, field):
        value = "<iframe src=evil>Safe Text"
        data = {"name": VALID_NAME}
        data[field] = value
        mat = MaterialCreate(**data)
        result = getattr(mat, field)
        assert "<iframe" not in result


class TestDateFields:

    @pytest.mark.parametrize("date_str", [
        "2024-01-15T10:00:00",
        "2024-12-31T23:59:59",
        "2025-06-15T00:00:00",
    ], ids=["mid_jan", "end_dec", "mid_jun"])
    def test_valid_equipment_dates(self, date_str):
        eq = EquipmentCreate(name=VALID_NAME, installation_date=date_str)
        assert eq.installation_date is not None

    def test_none_dates(self):
        eq = EquipmentCreate(
            name=VALID_NAME, installation_date=None, warranty_expiry=None
        )
        assert eq.installation_date is None
        assert eq.warranty_expiry is None

    @pytest.mark.parametrize("date_str", [
        "2024-06-15",
        "2024-12-31",
        "2025-01-01",
    ], ids=["mid_year", "end_year", "new_year"])
    def test_valid_material_dates(self, date_str):
        mat = MaterialCreate(name=VALID_NAME, expected_delivery=date_str)
        assert mat.expected_delivery is not None

    def test_both_delivery_dates(self):
        mat = MaterialCreate(
            name=VALID_NAME,
            expected_delivery="2024-06-01",
            actual_delivery="2024-06-05"
        )
        assert mat.actual_delivery > mat.expected_delivery


class TestSpecsOnEquipmentSchemas:

    @pytest.mark.parametrize("specs", [
        {"key": "value"},
        {"num": 42, "text": "hello", "flag": True},
        {"nullable": None},
        {},
    ], ids=["simple", "mixed_types", "with_null", "empty"])
    def test_valid_specs_on_create(self, specs):
        eq = EquipmentCreate(name=VALID_NAME, specifications=specs)
        assert eq.specifications is not None

    def test_specs_with_list_value_fails(self):
        with pytest.raises(ValidationError):
            EquipmentCreate(name=VALID_NAME, specifications={"key": [1, 2]})

    def test_specs_too_many_keys_fails(self):
        big_specs = {f"k{i}": f"v{i}" for i in range(51)}
        with pytest.raises(ValidationError):
            EquipmentCreate(name=VALID_NAME, specifications=big_specs)

    def test_specs_key_too_long_fails(self):
        with pytest.raises(ValidationError):
            EquipmentCreate(name=VALID_NAME, specifications={"k" * 101: "val"})

    def test_specs_value_too_long_fails(self):
        with pytest.raises(ValidationError):
            EquipmentCreate(name=VALID_NAME, specifications={"key": "v" * 501})


class TestSpecsOnMaterialSchemas:

    @pytest.mark.parametrize("specs", [
        {"grade": "C30"},
        {"strength": 40, "slump": "100mm", "admixture": True},
    ], ids=["single", "mixed"])
    def test_valid_specs(self, specs):
        mat = MaterialCreate(name=VALID_NAME, specifications=specs)
        assert mat.specifications is not None

    def test_specs_with_nested_dict_fails(self):
        with pytest.raises(ValidationError):
            MaterialCreate(name=VALID_NAME, specifications={"key": {"nested": "val"}})


class TestEdgeCases:

    def test_equipment_name_exactly_min_length(self):
        eq = EquipmentCreate(name="AB")
        assert len(eq.name) == MIN_NAME_LENGTH

    def test_equipment_name_exactly_max_length(self):
        eq = EquipmentCreate(name="A" * MAX_NAME_LENGTH)
        assert len(eq.name) == MAX_NAME_LENGTH

    def test_material_name_exactly_min_length(self):
        mat = MaterialCreate(name="AB")
        assert len(mat.name) == MIN_NAME_LENGTH

    def test_material_quantity_zero_boundary(self):
        mat = MaterialCreate(name=VALID_NAME, quantity=Decimal("0"))
        assert mat.quantity == Decimal("0")

    def test_material_quantity_max_boundary(self):
        mat = MaterialCreate(name=VALID_NAME, quantity=Decimal("999999999"))
        assert mat.quantity == Decimal("999999999")

    def test_specification_definition_select_with_one_option(self):
        spec = SpecificationDefinition(
            name="Choice", name_he="בחירה", field_type="select", options=["only_one"]
        )
        assert len(spec.options) == 1

    def test_document_definition_all_sources(self):
        for source in ["consultant", "project_manager", "contractor"]:
            doc = DocumentDefinition(name="Doc", name_he="מסמך", source=source)
            assert doc.source == source

    def test_equipment_template_empty_lists(self):
        et = EquipmentTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE,
            required_documents=[], required_specifications=[], submission_checklist=[]
        )
        assert et.required_documents == []

    def test_material_template_category_at_min_length(self):
        mt = MaterialTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, category="AB"
        )
        assert len(mt.category) == MIN_NAME_LENGTH

    def test_material_receive_smallest_valid(self):
        mr = MaterialReceive(quantity_received=Decimal("0.001"))
        assert mr.quantity_received > 0

    def test_checklist_item_definition_all_variations(self):
        for requires_file in [True, False]:
            item = ChecklistItemDefinition(
                name="Test", name_he="בדיקה", requires_file=requires_file
            )
            assert item.requires_file is requires_file

    def test_equipment_update_specs_none(self):
        eu = EquipmentUpdate(specifications=None)
        assert eu.specifications is None

    def test_material_update_specs_none(self):
        mu = MaterialUpdate(specifications=None)
        assert mu.specifications is None


class TestTemplateLists:

    def test_equipment_template_max_documents(self):
        docs = [
            DocumentDefinition(name=f"Doc {i}", name_he=f"מסמך {i}", source="consultant")
            for i in range(100)
        ]
        et = EquipmentTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, required_documents=docs
        )
        assert len(et.required_documents) == 100

    def test_equipment_template_too_many_documents(self):
        docs = [
            DocumentDefinition(name=f"Doc {i}", name_he=f"מסמך {i}", source="consultant")
            for i in range(101)
        ]
        with pytest.raises(ValidationError):
            EquipmentTemplateCreate(
                name=VALID_NAME, name_he=VALID_NAME_HE, required_documents=docs
            )

    def test_equipment_template_max_specifications(self):
        specs = [
            SpecificationDefinition(name=f"Spec {i}", name_he=f"מפרט {i}", field_type="text")
            for i in range(100)
        ]
        et = EquipmentTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, required_specifications=specs
        )
        assert len(et.required_specifications) == 100

    def test_equipment_template_too_many_specifications(self):
        specs = [
            SpecificationDefinition(name=f"Spec {i}", name_he=f"מפרט {i}", field_type="text")
            for i in range(101)
        ]
        with pytest.raises(ValidationError):
            EquipmentTemplateCreate(
                name=VALID_NAME, name_he=VALID_NAME_HE, required_specifications=specs
            )

    def test_equipment_template_max_checklist(self):
        items = [
            ChecklistItemDefinition(name=f"Item {i}", name_he=f"פריט {i}")
            for i in range(100)
        ]
        et = EquipmentTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, submission_checklist=items
        )
        assert len(et.submission_checklist) == 100

    def test_equipment_template_too_many_checklist(self):
        items = [
            ChecklistItemDefinition(name=f"Item {i}", name_he=f"פריט {i}")
            for i in range(101)
        ]
        with pytest.raises(ValidationError):
            EquipmentTemplateCreate(
                name=VALID_NAME, name_he=VALID_NAME_HE, submission_checklist=items
            )

    def test_material_template_max_documents(self):
        docs = [
            DocumentDefinition(name=f"Doc {i}", name_he=f"מסמך {i}", source="contractor")
            for i in range(100)
        ]
        mt = MaterialTemplateCreate(
            name=VALID_NAME, name_he=VALID_NAME_HE, category="Test",
            required_documents=docs
        )
        assert len(mt.required_documents) == 100

    def test_material_template_too_many_documents(self):
        docs = [
            DocumentDefinition(name=f"Doc {i}", name_he=f"מסמך {i}", source="contractor")
            for i in range(101)
        ]
        with pytest.raises(ValidationError):
            MaterialTemplateCreate(
                name=VALID_NAME, name_he=VALID_NAME_HE, category="Test",
                required_documents=docs
            )


class TestTemplateSanitization:

    @pytest.mark.parametrize("field", ["name", "name_he", "category", "description"])
    def test_equipment_template_sanitization(self, field):
        data = {"name": VALID_NAME, "name_he": VALID_NAME_HE}
        data[field] = "<script>evil</script>Clean"
        et = EquipmentTemplateCreate(**data)
        result = getattr(et, field)
        if result is not None:
            assert "<script" not in result

    @pytest.mark.parametrize("field", ["name", "name_he", "category"])
    def test_material_template_sanitization(self, field):
        data = {"name": VALID_NAME, "name_he": VALID_NAME_HE, "category": "SafeCat"}
        data[field] = "<iframe src=x>Clean"
        mt = MaterialTemplateCreate(**data)
        result = getattr(mt, field)
        assert "<iframe" not in result

    def test_document_definition_sanitization(self):
        doc = DocumentDefinition(
            name="<script>x</script>Doc", name_he="<img src=x>מסמך",
            source="consultant", description="<style>body{}</style>Desc"
        )
        assert "<script" not in doc.name
        assert "<img" not in doc.name_he
        assert "<style" not in doc.description

    def test_specification_definition_sanitization(self):
        spec = SpecificationDefinition(
            name="<script>x</script>Spec", name_he="<embed src=x>מפרט",
            field_type="number", unit="<link href=x>kg"
        )
        assert "<script" not in spec.name
        assert "<embed" not in spec.name_he
        assert "<link" not in spec.unit

    def test_specification_options_sanitized(self):
        spec = SpecificationDefinition(
            name="Choice", name_he="בחירה", field_type="select",
            options=["<script>evil</script>safe", "normal"]
        )
        assert "<script" not in spec.options[0]

    def test_checklist_item_definition_sanitization(self):
        item = ChecklistItemDefinition(
            name="<object data=x>Check", name_he="<meta charset=x>בדיקה"
        )
        assert "<object" not in item.name
        assert "<meta" not in item.name_he

    def test_consultant_type_sanitization(self):
        ct = ConsultantTypeCreate(
            name="<script>x</script>Engineer",
            name_he="<iframe>x</iframe>מהנדס",
            category="<img src=x>Structural"
        )
        assert "<script" not in ct.name
        assert "<iframe" not in ct.name_he
        assert "<img" not in ct.category

    def test_equipment_submission_sanitization(self):
        es = EquipmentSubmissionCreate(
            name="<script>x</script>Submission", template_id=uuid4(),
            description="<iframe>x</iframe>Desc", notes="<img src=x>Notes"
        )
        assert "<script" not in es.name
        assert "<iframe" not in es.description
        assert "<img" not in es.notes

    def test_approval_submission_sanitization(self):
        eas = EquipmentApprovalSubmissionCreate(
            equipment_id=uuid4(), comments="<script>x</script>Comments"
        )
        assert "<script" not in eas.comments

    def test_approval_decision_sanitization(self):
        ead = EquipmentApprovalDecisionCreate(
            submission_id=uuid4(), decision="approved",
            comments="<script>x</script>Approved"
        )
        assert "<script" not in ead.comments
