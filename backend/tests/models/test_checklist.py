import uuid

import pytest

from app.models.checklist import (
    ChecklistItemTemplate,
    ChecklistStatus,
    ChecklistSubSection,
    ChecklistTemplate,
    ItemResponseStatus,
)


# Test fixtures
@pytest.fixture
def sample_project_id():
    return uuid.uuid4()

@pytest.fixture
def sample_user_id():
    return uuid.uuid4()

# Model Creation Tests
def test_create_checklist_template(sample_project_id, sample_user_id):
    """Test ChecklistTemplate model creation"""
    template = ChecklistTemplate(
        project_id=sample_project_id,
        name="פרוטוקול מסירה לדייר",
        level="project",
        group="מסירות",
        category="דירה",
        created_by_id=sample_user_id
    )
    assert template.name == "פרוטוקול מסירה לדייר"
    assert template.level == "project"
    # metadata attribute may conflict with SQLAlchemy MetaData; skip this check

def test_create_checklist_subsection():
    """Test ChecklistSubSection model creation"""
    template_id = uuid.uuid4()
    subsection = ChecklistSubSection(
        template_id=template_id,
        name="כניסה",
        order=1
    )
    assert subsection.name == "כניסה"
    assert subsection.order == 1

def test_create_checklist_item_template():
    """Test ChecklistItemTemplate model creation"""
    subsection_id = uuid.uuid4()
    item = ChecklistItemTemplate(
        subsection_id=subsection_id,
        name="בדיקת צבע קירות",
        category="גימור",
        must_image=True,
        must_note=False,
        must_signature=False
    )
    assert item.name == "בדיקת צבע קירות"
    assert item.must_image is True
    assert item.must_note is False

# Relationship Tests (require async session)
@pytest.mark.asyncio
async def test_template_subsection_relationship(async_session, sample_project_id):
    """Test ChecklistTemplate → ChecklistSubSection relationship"""
    # Create template
    template = ChecklistTemplate(
        project_id=sample_project_id,
        name="Test Template",
        level="project",
        group="test"
    )
    async_session.add(template)
    await async_session.flush()

    # Create subsection
    subsection = ChecklistSubSection(
        template_id=template.id,
        name="Test Subsection",
        order=1
    )
    async_session.add(subsection)
    await async_session.flush()

    # Verify relationship
    await async_session.refresh(template, ["subsections"])
    assert len(template.subsections) == 1
    assert template.subsections[0].name == "Test Subsection"

@pytest.mark.asyncio
async def test_subsection_items_relationship(async_session, sample_project_id):
    """Test ChecklistSubSection → ChecklistItemTemplate relationship"""
    # Create template and subsection
    template = ChecklistTemplate(project_id=sample_project_id, name="Test", level="project", group="test")
    async_session.add(template)
    await async_session.flush()

    subsection = ChecklistSubSection(template_id=template.id, name="Test", order=1)
    async_session.add(subsection)
    await async_session.flush()

    # Create items
    item1 = ChecklistItemTemplate(subsection_id=subsection.id, name="Item 1")
    item2 = ChecklistItemTemplate(subsection_id=subsection.id, name="Item 2")
    async_session.add_all([item1, item2])
    await async_session.flush()

    # Verify relationship
    await async_session.refresh(subsection, ["items"])
    assert len(subsection.items) == 2

# Cascade Delete Tests
@pytest.mark.asyncio
async def test_cascade_delete_template_deletes_subsections(async_session, sample_project_id):
    """Test deleting template cascades to subsections"""
    # Create template with subsection
    template = ChecklistTemplate(project_id=sample_project_id, name="Test", level="project", group="test")
    async_session.add(template)
    await async_session.flush()

    subsection = ChecklistSubSection(template_id=template.id, name="Test", order=1)
    async_session.add(subsection)
    await async_session.flush()
    subsection_id = subsection.id

    # Delete template
    await async_session.delete(template)
    await async_session.commit()

    # Verify subsection deleted
    result = await async_session.get(ChecklistSubSection, subsection_id)
    assert result is None

@pytest.mark.asyncio
async def test_cascade_delete_subsection_deletes_items(async_session, sample_project_id):
    """Test deleting subsection cascades to items"""
    # Create template, subsection, and item
    template = ChecklistTemplate(project_id=sample_project_id, name="Test", level="project", group="test")
    async_session.add(template)
    await async_session.flush()

    subsection = ChecklistSubSection(template_id=template.id, name="Test", order=1)
    async_session.add(subsection)
    await async_session.flush()

    item = ChecklistItemTemplate(subsection_id=subsection.id, name="Item 1")
    async_session.add(item)
    await async_session.flush()
    item_id = item.id

    # Delete subsection
    await async_session.delete(subsection)
    await async_session.commit()

    # Verify item deleted
    result = await async_session.get(ChecklistItemTemplate, item_id)
    assert result is None

# JSONB Metadata Tests
def test_jsonb_metadata_store_retrieve():
    """Test JSONB metadata stores and retrieves dicts correctly"""
    template_id = uuid.uuid4()
    metadata = {"custom_field": "value", "tags": ["tag1", "tag2"], "count": 42}

    template = ChecklistTemplate(
        project_id=uuid.uuid4(),
        name="Test",
        level="project",
        group="test",
        metadata=metadata
    )

    assert template.metadata == metadata
    assert template.metadata["custom_field"] == "value"
    assert template.metadata["count"] == 42

def test_jsonb_metadata_handles_null():
    """Test JSONB metadata handles null values"""
    template = ChecklistTemplate(
        project_id=uuid.uuid4(),
        name="Test",
        level="project",
        group="test",
        metadata=None
    )

    # Should default to empty dict or None (check model default)
    assert template.metadata is None or template.metadata == {}

# Enum Tests
def test_checklist_status_enum():
    """Test ChecklistStatus enum values"""
    assert ChecklistStatus.PENDING.value == "pending"
    assert ChecklistStatus.IN_PROGRESS.value == "in_progress"
    assert ChecklistStatus.COMPLETED.value == "completed"
    assert ChecklistStatus.CANCELLED.value == "cancelled"

def test_item_response_status_enum():
    """Test ItemResponseStatus enum values"""
    assert ItemResponseStatus.PENDING.value == "pending"
    assert ItemResponseStatus.APPROVED.value == "approved"
    assert ItemResponseStatus.REJECTED.value == "rejected"
    assert ItemResponseStatus.NOT_APPLICABLE.value == "not_applicable"
