import pytest
from pydantic import ValidationError
from app.schemas.checklist import (
    ChecklistTemplateCreate, ChecklistTemplateUpdate, ChecklistTemplateResponse,
    ChecklistSubSectionCreate, ChecklistSubSectionUpdate,
    ChecklistItemTemplateCreate, ChecklistItemTemplateUpdate,
    ChecklistInstanceCreate, ChecklistInstanceUpdate,
    ChecklistItemResponseCreate, ChecklistItemResponseUpdate
)

# Template Schema Tests
def test_template_create_validates_hebrew_text():
    """Test ChecklistTemplateCreate accepts Hebrew text"""
    data = ChecklistTemplateCreate(
        name="פרוטוקול מסירה לדייר",
        level="project",
        group="מסירות",
        category="דירה"
    )
    assert data.name == "פרוטוקול מסירה לדייר"
    assert data.group == "מסירות"

def test_template_create_requires_name():
    """Test ChecklistTemplateCreate requires name field"""
    with pytest.raises(ValidationError) as exc_info:
        ChecklistTemplateCreate(
            level="project",
            group="test"
        )
    assert "name" in str(exc_info.value)

def test_template_create_enforces_name_length():
    """Test ChecklistTemplateCreate enforces min/max length on name"""
    # Too short (< MIN_NAME_LENGTH which is 2)
    with pytest.raises(ValidationError):
        ChecklistTemplateCreate(
            name="x",
            level="project",
            group="test"
        )

    # Too long (> MAX_NAME_LENGTH which is 255)
    with pytest.raises(ValidationError):
        ChecklistTemplateCreate(
            name="x" * 256,
            level="project",
            group="test"
        )

def test_template_update_all_fields_optional():
    """Test ChecklistTemplateUpdate has all optional fields"""
    # Should not raise error with no fields
    data = ChecklistTemplateUpdate()
    assert data.name is None

    # Should work with partial fields
    data = ChecklistTemplateUpdate(name="Updated Name")
    assert data.name == "Updated Name"
    assert data.level is None

def test_template_create_sanitizes_text():
    """Test ChecklistTemplateCreate sanitizes text fields"""
    data = ChecklistTemplateCreate(
        name="  Test Name  ",  # with whitespace
        level="  project  ",
        group="test"
    )
    # sanitize_string() should strip whitespace
    assert data.name == "Test Name"
    assert data.level == "project"

def test_template_create_removes_dangerous_patterns():
    """Test ChecklistTemplateCreate removes XSS patterns"""
    data = ChecklistTemplateCreate(
        name="Test<script>alert('xss')</script>Name",
        level="project",
        group="test"
    )
    # sanitize_string() should remove script tags
    assert "<script>" not in data.name
    assert "alert" not in data.name

# SubSection Schema Tests
def test_subsection_create_validates_order_ge_zero():
    """Test ChecklistSubSectionCreate enforces order >= 0"""
    # Valid: order >= 0
    data = ChecklistSubSectionCreate(name="Test", order=0)
    assert data.order == 0

    data = ChecklistSubSectionCreate(name="Test", order=5)
    assert data.order == 5

    # Invalid: order < 0
    with pytest.raises(ValidationError) as exc_info:
        ChecklistSubSectionCreate(name="Test", order=-1)
    assert "order" in str(exc_info.value)

def test_subsection_create_validates_hebrew_text():
    """Test ChecklistSubSectionCreate accepts Hebrew text"""
    data = ChecklistSubSectionCreate(
        name="כניסה",
        order=1
    )
    assert data.name == "כניסה"

# ItemTemplate Schema Tests
def test_item_template_create_boolean_flags():
    """Test ChecklistItemTemplateCreate handles boolean flags"""
    data = ChecklistItemTemplateCreate(
        name="Test",
        must_image=True,
        must_note=False,
        must_signature=True
    )
    assert data.must_image is True
    assert data.must_note is False
    assert data.must_signature is True

def test_item_template_create_default_boolean_flags():
    """Test ChecklistItemTemplateCreate defaults boolean flags to False"""
    data = ChecklistItemTemplateCreate(name="Test")
    assert data.must_image is False
    assert data.must_note is False
    assert data.must_signature is False

def test_item_template_create_description_max_length():
    """Test ChecklistItemTemplateCreate enforces description max length"""
    # MAX_DESCRIPTION_LENGTH is 2000
    valid_desc = "x" * 2000
    data = ChecklistItemTemplateCreate(name="Test", description=valid_desc)
    assert len(data.description) == 2000

    # Too long
    with pytest.raises(ValidationError):
        ChecklistItemTemplateCreate(name="Test", description="x" * 2001)

# Instance Schema Tests
def test_instance_create_requires_template_id():
    """Test ChecklistInstanceCreate requires template_id"""
    import uuid
    template_id = uuid.uuid4()

    data = ChecklistInstanceCreate(
        template_id=template_id,
        unit_identifier="דירה 12, קומה 3",
        status="pending"
    )
    assert data.template_id == template_id
    assert data.unit_identifier == "דירה 12, קומה 3"

def test_instance_create_validates_hebrew_unit_identifier():
    """Test ChecklistInstanceCreate accepts Hebrew in unit_identifier"""
    import uuid
    data = ChecklistInstanceCreate(
        template_id=uuid.uuid4(),
        unit_identifier="דירה 12, קומה 3",
        status="pending"
    )
    assert "דירה" in data.unit_identifier

# ItemResponse Schema Tests
def test_item_response_create_sanitizes_notes():
    """Test ChecklistItemResponseCreate sanitizes notes field"""
    import uuid
    data = ChecklistItemResponseCreate(
        item_template_id=uuid.uuid4(),
        status="approved",
        notes="  Test notes  "
    )
    assert data.notes == "Test notes"

def test_item_response_update_all_fields_optional():
    """Test ChecklistItemResponseUpdate has all optional fields"""
    data = ChecklistItemResponseUpdate()
    assert data.item_template_id is None
    assert data.status is None
    assert data.notes is None

def test_item_response_create_notes_max_length():
    """Test ChecklistItemResponseCreate enforces notes max length"""
    import uuid
    # MAX_NOTES_LENGTH is 5000
    valid_notes = "x" * 5000
    data = ChecklistItemResponseCreate(
        item_template_id=uuid.uuid4(),
        status="approved",
        notes=valid_notes
    )
    assert len(data.notes) == 5000

    # Too long
    with pytest.raises(ValidationError):
        ChecklistItemResponseCreate(
            item_template_id=uuid.uuid4(),
            status="approved",
            notes="x" * 5001
        )
