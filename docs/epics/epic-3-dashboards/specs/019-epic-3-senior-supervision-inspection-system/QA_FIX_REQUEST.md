# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-29
**QA Session**: 1

## Critical Issues to Fix

### 1. Missing MutableDict Wrapper for JSONB Columns

**Problem**: All 3 JSONB columns in models do NOT use `MutableDict.as_mutable(JSONB)` wrapper as explicitly required by the spec.

**Location**: `backend/app/models/inspection.py` (lines ~45, ~60, ~80)

**Current Code**:
```python
# InspectionStageTemplate
stage_definitions: Mapped[dict | None] = mapped_column(JSONB, default=dict)

# ProjectInspection
template_snapshot: Mapped[dict | None] = mapped_column(JSONB, default=dict)

# InspectionResult
attachments: Mapped[dict | None] = mapped_column(JSONB, default=dict)
```

**Required Fix**:
```python
from sqlalchemy.ext.mutable import MutableDict

# InspectionStageTemplate
stage_definitions: Mapped[dict | None] = mapped_column(
    MutableDict.as_mutable(JSONB),
    default=dict
)

# ProjectInspection
template_snapshot: Mapped[dict | None] = mapped_column(
    MutableDict.as_mutable(JSONB),
    default=dict
)

# InspectionResult
attachments: Mapped[dict | None] = mapped_column(
    MutableDict.as_mutable(JSONB),
    default=dict
)
```

**Why This is Critical**:
- Spec explicitly requires this at lines 116, 124, 149, 319, 338
- Marked as "Critical Gotcha" in spec
- Without MutableDict: in-place mutations (dict updates, list appends) won't be tracked
- Results in silent data loss - changes won't persist to database
- Violates core spec requirement: "JSONB columns MUST use MutableDict.as_mutable(JSONB) for change tracking"

**Verification**:
After fixing, run:
```bash
cd backend
pytest tests/integration/test_jsonb_mutation_tracking.py -v
```

Expected output should show: "✓ JSONB mutation tracking verified - MutableDict wrapper is working!"

---

### 2. Missing Unit Tests File

**Problem**: Required unit tests file `backend/tests/test_inspections.py` does not exist.

**Location**: Should be at `backend/tests/test_inspections.py`

**Required Tests** (from spec QA Acceptance Criteria):
1. `test_consultant_type_crud` - Create, read, update, delete consultant types
2. `test_jsonb_mutation_tracking` - JSONB field changes are detected and persisted
3. `test_inspection_status_transitions` - Status changes follow scheduled → completed → approved flow
4. `test_template_validation` - JSONB stage templates validate structure
5. `test_duplicate_inspection_prevention` - Cannot create duplicate inspections for same consultant/area

**Required Fix**:
Create `backend/tests/test_inspections.py` with all 5 unit tests.

**Example Structure**:
```python
import pytest
from uuid import uuid4
from sqlalchemy import select
from app.models.inspection import (
    ConsultantType, InspectionStageTemplate,
    ProjectInspection, InspectionResult,
    InspectionStatus, ResultStatus
)

@pytest.mark.asyncio
async def test_consultant_type_crud(db_session):
    """Test create, read, update, delete consultant types."""
    # Create
    consultant = ConsultantType(
        name=f"Test {uuid4().hex[:8]}",
        description="Test description",
        stage_count=3,
        is_active=True
    )
    db_session.add(consultant)
    await db_session.flush()

    # Read
    result = await db_session.execute(
        select(ConsultantType).where(ConsultantType.id == consultant.id)
    )
    found = result.scalar_one()
    assert found.name == consultant.name

    # Update
    found.description = "Updated description"
    await db_session.flush()

    # Delete
    await db_session.delete(found)
    await db_session.flush()

@pytest.mark.asyncio
async def test_jsonb_mutation_tracking(db_session):
    """Test JSONB field changes are detected and persisted."""
    # Create consultant type
    consultant = ConsultantType(
        name=f"Test JSONB {uuid4().hex[:8]}",
        stage_count=3
    )
    db_session.add(consultant)
    await db_session.flush()

    # Create template with JSONB
    template = InspectionStageTemplate(
        consultant_type_id=consultant.id,
        stage_definitions={
            "stages": [
                {"stage_number": 1, "stage_name": "Initial"}
            ]
        }
    )
    db_session.add(template)
    await db_session.flush()
    template_id = template.id

    # Perform in-place mutation
    template.stage_definitions["stages"][0]["stage_name"] = "Updated"
    await db_session.commit()

    # Verify persistence
    result = await db_session.execute(
        select(InspectionStageTemplate).where(InspectionStageTemplate.id == template_id)
    )
    loaded = result.scalar_one()
    assert loaded.stage_definitions["stages"][0]["stage_name"] == "Updated"

@pytest.mark.asyncio
async def test_inspection_status_transitions(db_session):
    """Test status changes follow scheduled → completed → approved flow."""
    # Setup: create consultant, project, inspection
    # Test: scheduled → completed (valid)
    # Test: completed → approved (valid)
    # Test: scheduled → approved (should be prevented or warned)
    pass

@pytest.mark.asyncio
async def test_template_validation(db_session):
    """Test JSONB stage templates validate structure."""
    # Test valid structures are accepted
    # Test flexible schema (1-7 stages)
    pass

@pytest.mark.asyncio
async def test_duplicate_inspection_prevention(db_session):
    """Test cannot create duplicate inspections for same consultant/area."""
    # Create first inspection for consultant/area combo
    # Attempt to create duplicate
    # Verify prevention mechanism
    pass
```

**Why This is Critical**:
- Spec explicitly requires these tests for sign-off (spec line 451: "All unit tests pass")
- Cannot verify business logic without unit tests
- Integration tests exist but unit tests are missing

**Verification**:
After creating, run:
```bash
cd backend
pytest tests/test_inspections.py -v
```

All 5 tests should pass.

---

## After Fixes

Once both fixes are complete:

1. **Commit the changes**:
```bash
git add backend/app/models/inspection.py
git commit -m "fix: Add MutableDict wrapper for JSONB mutation tracking (qa-requested)"

git add backend/tests/test_inspections.py
git commit -m "test: Add required unit tests for inspection system (qa-requested)"
```

2. **Set up environment** (if not already done):
```bash
docker-compose up -d
cd backend
alembic upgrade head
./run_seeding.sh
docker-compose restart backend
```

3. **Run tests**:
```bash
# Unit tests
pytest backend/tests/test_inspections.py -v

# Integration tests
pytest backend/tests/integration/ -v

# Verify all pass
```

4. **Verify API docs**:
Visit: http://localhost:8000/api/v1/docs
Confirm all 18 endpoints are visible

5. **QA will automatically re-run**

---

## QA Re-run Checklist

After fixes, QA will verify:

- [ ] MutableDict import added to `backend/app/models/inspection.py`
- [ ] All 3 JSONB columns use `MutableDict.as_mutable(JSONB)` wrapper
- [ ] File `backend/tests/test_inspections.py` exists
- [ ] All 5 required unit tests implemented
- [ ] Unit tests pass: `pytest backend/tests/test_inspections.py -v`
- [ ] Integration tests pass: `pytest backend/tests/integration/ -v`
- [ ] JSONB mutation tracking test passes (validates MutableDict fix)
- [ ] API documentation shows all 18 endpoints at /docs
- [ ] No regressions in existing APIs
- [ ] Code follows all spec patterns

---

**Priority**: CRITICAL - These issues block production deployment

**Estimated Fix Time**: 30-60 minutes

**Next QA Session**: Will run automatically after commits
