# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-29
**QA Session**: 2
**Previous Session**: 1 (also REJECTED)

---

## ⚠️ CRITICAL ISSUE: NO FIXES APPLIED FROM SESSION 1

**QA Session 2 Finding**: The Coder Agent has NOT implemented any of the 4 critical fixes requested in QA Session 1.

**Evidence**:
- ✗ Unit test files still do not exist (test_models/test_checklist.py, test_schemas/test_checklist.py)
- ✗ Integration test file still does not exist (test_api/test_checklists.py)
- ✗ Audit logging still missing from SubSection, ItemTemplate, ItemResponse endpoints
- ✗ Authentication still missing from same endpoints

**Next Action**: Coder Agent MUST implement ALL 4 fixes below before QA Session 3.

---

## Critical Issues to Fix (SAME AS SESSION 1)

### 1. Missing Unit Tests (**HIGHEST PRIORITY**)

**Problem**: Required unit test files do not exist. QA Acceptance Criteria explicitly requires unit tests for models and schemas.

**Location**: `backend/tests/`

**Required Fix**: Create the following test files:

#### File 1: `backend/tests/test_models/test_checklist.py`

Create comprehensive unit tests for the 5 checklist models:

```python
import pytest
import uuid
from datetime import datetime
from app.models.checklist import (
    ChecklistTemplate, ChecklistSubSection, ChecklistItemTemplate,
    ChecklistInstance, ChecklistItemResponse,
    ChecklistStatus, ItemResponseStatus
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
    assert template.metadata == {}  # default value

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
```

**Note**: You'll need to create a `conftest.py` in `backend/tests/` with async session fixtures if it doesn't exist.

---

#### File 2: `backend/tests/test_schemas/test_checklist.py`

Create comprehensive schema validation tests:

```python
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
```

**Verification**: Run these commands and ensure all tests pass:
```bash
pytest backend/tests/test_models/test_checklist.py -v
pytest backend/tests/test_schemas/test_checklist.py -v
```

---

### 2. Missing Integration Tests

**Problem**: Required integration test file does not exist. QA Acceptance Criteria explicitly requires API integration tests.

**Location**: `backend/tests/test_api/test_checklists.py` - DOES NOT EXIST

**Required Fix**: Create `backend/tests/test_api/test_checklists.py` with comprehensive API integration tests:

```python
import pytest
from httpx import AsyncClient
from app.main import app

# Template CRUD Tests
@pytest.mark.asyncio
async def test_create_template_returns_201(async_client: AsyncClient, test_project_id):
    """Test POST /projects/{id}/checklist-templates returns 201"""
    response = await async_client.post(
        f"/api/v1/projects/{test_project_id}/checklist-templates",
        json={
            "name": "פרוטוקול מסירה לדייר",
            "level": "project",
            "group": "מסירות",
            "category": "דירה"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "פרוטוקול מסירה לדייר"
    assert "id" in data

@pytest.mark.asyncio
async def test_get_template_returns_full_hierarchy(async_client: AsyncClient, test_template_with_subsections):
    """Test GET template returns subsections and items"""
    template_id, project_id = test_template_with_subsections
    response = await async_client.get(
        f"/api/v1/projects/{project_id}/checklist-templates/{template_id}"
    )
    assert response.status_code == 200
    data = response.json()
    assert "subsections" in data
    assert len(data["subsections"]) > 0

@pytest.mark.asyncio
async def test_update_template_returns_updated_data(async_client: AsyncClient, test_template):
    """Test PUT template updates and returns new data"""
    template_id, project_id = test_template
    response = await async_client.put(
        f"/api/v1/projects/{project_id}/checklist-templates/{template_id}",
        json={"name": "Updated Name"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"

@pytest.mark.asyncio
async def test_delete_template_cascades_to_subsections(async_client: AsyncClient, async_session, test_template_with_subsections):
    """Test DELETE template deletes subsections via cascade"""
    template_id, project_id = test_template_with_subsections

    # Delete template
    response = await async_client.delete(
        f"/api/v1/projects/{project_id}/checklist-templates/{template_id}"
    )
    assert response.status_code == 200

    # Verify subsections deleted
    from app.models.checklist import ChecklistSubSection
    result = await async_session.execute(
        select(ChecklistSubSection).where(ChecklistSubSection.template_id == template_id)
    )
    assert result.scalar_one_or_none() is None

# SubSection Tests
@pytest.mark.asyncio
async def test_create_subsection_under_template(async_client: AsyncClient, test_template):
    """Test POST subsection under template"""
    template_id, project_id = test_template
    response = await async_client.post(
        f"/api/v1/checklist-templates/{template_id}/subsections",
        json={"name": "כניסה", "order": 1}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "כניסה"
    assert data["templateId"] == str(template_id)

# ItemTemplate Tests
@pytest.mark.asyncio
async def test_create_item_template_with_must_flags(async_client: AsyncClient, test_subsection):
    """Test POST item template with must_image=True"""
    subsection_id = test_subsection
    response = await async_client.post(
        f"/api/v1/subsections/{subsection_id}/items",
        json={
            "name": "בדיקת צבע קירות",
            "must_image": True,
            "must_note": False,
            "must_signature": False
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["mustImage"] is True

# Audit Logging Tests
@pytest.mark.asyncio
async def test_template_create_generates_audit_log(async_client: AsyncClient, async_session, test_project_id):
    """Test creating template generates audit log entry"""
    response = await async_client.post(
        f"/api/v1/projects/{test_project_id}/checklist-templates",
        json={"name": "Test", "level": "project", "group": "test"}
    )
    template_id = response.json()["id"]

    # Check audit log
    from app.models.audit import AuditLog
    result = await async_session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "checklist_template",
            AuditLog.entity_id == template_id,
            AuditLog.action == "CREATE"
        )
    )
    log = result.scalar_one_or_none()
    assert log is not None

# Error Handling Tests
@pytest.mark.asyncio
async def test_get_template_nonexistent_returns_404(async_client: AsyncClient, test_project_id):
    """Test GET nonexistent template returns 404"""
    import uuid
    fake_id = uuid.uuid4()
    response = await async_client.get(
        f"/api/v1/projects/{test_project_id}/checklist-templates/{fake_id}"
    )
    assert response.status_code == 404
```

**Note**: You'll need test fixtures in `conftest.py` for `test_project_id`, `test_template`, `test_template_with_subsections`, etc.

**Verification**: Run this command and ensure all tests pass:
```bash
pytest backend/tests/test_api/test_checklists.py -v
```

---

### 3. Incomplete Audit Logging

**Problem**: Only ChecklistTemplate and ChecklistInstance endpoints have audit logging. ChecklistSubSection, ChecklistItemTemplate, and ChecklistItemResponse endpoints are missing audit logs.

**Location**: `backend/app/api/v1/checklists.py`

**Required Fix**: Add audit logging to mutation endpoints for SubSection, ItemTemplate, and ItemResponse

#### 3.1: ChecklistSubSection Endpoints

Add audit logging and authentication to:

1. **create_checklist_subsection** (around line 118-134):
```python
@router.post("/checklist-templates/{template_id}/subsections", response_model=ChecklistSubSectionResponse)
async def create_checklist_subsection(
    template_id: UUID,
    data: ChecklistSubSectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ADD THIS
):
    # Verify template exists
    result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")

    subsection = ChecklistSubSection(**data.model_dump(), template_id=template_id)
    db.add(subsection)
    await db.flush()

    # ADD AUDIT LOGGING HERE
    await create_audit_log(db, current_user, "checklist_subsection", subsection.id, AuditAction.CREATE,
                          project_id=template.project_id, new_values=get_model_dict(subsection))

    await db.refresh(subsection, ["items"])
    return subsection
```

2. **update_checklist_subsection** (around line 168-187):
```python
@router.put("/checklist-templates/{template_id}/subsections/{subsection_id}", response_model=ChecklistSubSectionResponse)
async def update_checklist_subsection(
    template_id: UUID,
    subsection_id: UUID,
    data: ChecklistSubSectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ADD THIS
):
    result = await db.execute(
        select(ChecklistSubSection)
        .where(ChecklistSubSection.id == subsection_id, ChecklistSubSection.template_id == template_id)
    )
    subsection = result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")

    # ADD AUDIT LOGGING HERE
    old_values = get_model_dict(subsection)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(subsection, key, value)

    # Get template for project_id
    template_result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = template_result.scalar_one()

    await create_audit_log(db, current_user, "checklist_subsection", subsection.id, AuditAction.UPDATE,
                          project_id=template.project_id, old_values=old_values, new_values=get_model_dict(subsection))

    await db.refresh(subsection, ["items"])
    return subsection
```

3. **delete_checklist_subsection** (around line 190-205):
```python
@router.delete("/checklist-templates/{template_id}/subsections/{subsection_id}")
async def delete_checklist_subsection(
    template_id: UUID,
    subsection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ADD THIS
):
    result = await db.execute(
        select(ChecklistSubSection)
        .where(ChecklistSubSection.id == subsection_id, ChecklistSubSection.template_id == template_id)
    )
    subsection = result.scalar_one_or_none()
    if not subsection:
        raise HTTPException(status_code=404, detail="Checklist subsection not found")

    # Get template for project_id
    template_result = await db.execute(select(ChecklistTemplate).where(ChecklistTemplate.id == template_id))
    template = template_result.scalar_one()

    # ADD AUDIT LOGGING HERE
    await create_audit_log(db, current_user, "checklist_subsection", subsection.id, AuditAction.DELETE,
                          project_id=template.project_id, old_values=get_model_dict(subsection))

    await db.delete(subsection)
    return {"message": "Checklist subsection deleted"}
```

#### 3.2: ChecklistItemTemplate Endpoints

Similarly add audit logging and authentication to:
- `create_checklist_item_template` (line ~208)
- `update_checklist_item_template` (line ~256)
- `delete_checklist_item_template` (line ~278)

Use entity_type: `"checklist_item_template"`

#### 3.3: ChecklistItemResponse Endpoints

Similarly add audit logging to:
- `create_checklist_item_response` (line ~391)
- `update_checklist_item_response` (line ~440)
- `delete_checklist_item_response` (line ~467)

Use entity_type: `"checklist_item_response"`

**Verification**: After mutations, check audit_log table:
```sql
SELECT entity_type, action, COUNT(*)
FROM audit_log
WHERE entity_type IN ('checklist_subsection', 'checklist_item_template', 'checklist_item_response')
GROUP BY entity_type, action;
```

---

### 4. Missing Authentication on Mutation Endpoints

**Problem**: SubSection, ItemTemplate, and some ItemResponse endpoints don't require authentication.

**Location**: Same endpoints as Fix #3

**Required Fix**: Add `current_user: User = Depends(get_current_user)` parameter to all mutation endpoints that don't have it.

This is already covered in Fix #3 above - the authentication dependency should be added at the same time as audit logging.

**Verification**: Try calling endpoints without Authorization header:
```bash
curl -X POST http://localhost:8000/api/v1/checklist-templates/{id}/subsections \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "order": 1}'
# Should return 401 Unauthorized
```

---

## After Fixes

Once all fixes are complete:

1. **Commit each fix separately** with format:
   ```bash
   git add backend/tests/test_models/test_checklist.py
   git commit -m "fix: add unit tests for checklist models (qa-requested)"

   git add backend/tests/test_schemas/test_checklist.py
   git commit -m "fix: add unit tests for checklist schemas (qa-requested)"

   git add backend/tests/test_api/test_checklists.py
   git commit -m "fix: add integration tests for checklist API (qa-requested)"

   git add backend/app/api/v1/checklists.py
   git commit -m "fix: add audit logging and auth to all checklist endpoints (qa-requested)"
   ```

2. **Run all tests**:
   ```bash
   pytest backend/tests/test_models/test_checklist.py -v
   pytest backend/tests/test_schemas/test_checklist.py -v
   pytest backend/tests/test_api/test_checklists.py -v
   ```

3. **Verify in Docker environment** (if available):
   ```bash
   docker compose up -d db redis backend
   cd backend && alembic upgrade head
   ./run_e2e_verification.sh
   ```

4. **QA will automatically re-run** after you complete fixes and commit.

---

## Summary of Required Changes

**Files to CREATE**:
- `backend/tests/test_models/test_checklist.py` (unit tests for models)
- `backend/tests/test_schemas/test_checklist.py` (unit tests for schemas)
- `backend/tests/test_api/test_checklists.py` (integration tests for API)

**Files to MODIFY**:
- `backend/app/api/v1/checklists.py` (add audit logging + auth to 11 endpoints)

**Expected Test Coverage**:
- Models: 10+ tests (relationships, cascade deletes, JSONB, enums)
- Schemas: 15+ tests (validation, Hebrew text, field constraints)
- API: 20+ tests (CRUD operations, error handling, audit logs)

**Total Estimated LOC**: ~800-1000 lines of test code

---

## Questions?

If you need clarification on any fix, refer to:
- Full QA report: `qa_report.md`
- Reference patterns: `backend/app/api/v1/equipment.py` for audit logging examples
- Spec file: `.auto-claude/specs/020-epic-2-apartment-checklist-template-system/spec.md`
