# JSONB Mutation Tracking Integration Test

## Purpose

This test verifies that JSONB mutation tracking works correctly for InspectionStageTemplate models. Specifically, it tests whether SQLAlchemy can detect and persist in-place mutations to JSONB fields.

## Background

### The JSONB Mutation Problem

When using PostgreSQL JSONB columns with SQLAlchemy, in-place mutations (like `dict['key'] = value` or `list.append()`) are not automatically tracked by default. This means changes might not persist to the database.

**Example Problem:**
```python
template.stage_definitions["stages"].append(new_stage)
await session.commit()  # Change might NOT persist!
```

### Solutions

1. **MutableDict Wrapper (Recommended):**
   ```python
   from sqlalchemy.ext.mutable import MutableDict
   from sqlalchemy.dialects.postgresql import JSONB

   stage_definitions: Mapped[dict] = mapped_column(
       MutableDict.as_mutable(JSONB),
       default=dict
   )
   ```

2. **flag_modified() (Manual):**
   ```python
   from sqlalchemy.orm import flag_modified

   template.stage_definitions["stages"].append(new_stage)
   flag_modified(template, 'stage_definitions')
   await session.commit()  # Now it will persist
   ```

## Test Coverage

### Test 1: Create Template with JSONB Stages
- Creates a ConsultantType and InspectionStageTemplate
- Initializes stage_definitions with 3 stages
- Verifies the JSONB data is stored correctly

**Verification:**
- Template created with correct consultant_type_id
- stage_definitions contains expected structure
- All 3 initial stages are present

### Test 2: Update JSONB Field (In-Place Mutation)
- Performs in-place mutations on stage_definitions:
  - Updates an existing stage name
  - Appends a new stage to the array
- Commits changes without explicitly calling flag_modified()
- Tests if MutableDict wrapper auto-detects changes

**Key Test:** This is the critical test that verifies MutableDict tracking works.

### Test 3: Verify Changes Persisted
- Closes the session and creates a fresh one
- Re-loads the template from the database
- Verifies all mutations from Test 2 persisted correctly

**Verification:**
- Stage 1 name was updated
- New stage 4 was added
- Total stage count is now 4

### Test 4: Update with flag_modified()
- Demonstrates the alternative approach using flag_modified()
- Updates a stage name
- Explicitly calls flag_modified() before commit
- Verifies changes persist in a new session

**Purpose:** Shows that flag_modified() works as a fallback if MutableDict isn't configured.

## Running the Test

### Prerequisites
- PostgreSQL database running (default: localhost:5432)
- Database credentials configured in backend/.env
- All dependencies installed (sqlalchemy, asyncpg, etc.)

### Command
```bash
cd backend
python tests/integration/test_jsonb_mutation_tracking.py
```

### Expected Output
```
============================================================
JSONB Mutation Tracking Tests
============================================================

=== Test 1: Create Inspection Stage Template with JSONB ===
✓ Created test consultant type: <uuid>
✓ Created test template: <uuid>
✓ Template created with correct JSONB data

=== Test 2: Update JSONB Field (In-Place Mutation) ===
✓ Loaded template with 3 stages
✓ Modified JSONB field in-place:
  - Updated stage 1 name to: Updated Initial Survey
  - Added new stage 4: New Stage
✓ Committed changes

=== Test 3: Verify Changes Persisted ===
✓ Changes persisted correctly:
  - Stage 1 name updated to: Updated Initial Survey
  - New stage 4 added: New Stage
  - Total stages: 4
✓ JSONB mutation tracking verified - MutableDict wrapper is working!

=== Test 4: Update with flag_modified() ===
✓ Loaded template with 4 stages
✓ Modified JSONB field and called flag_modified()
  - Updated stage 2 name to: Updated Foundation Check
✓ Committed changes with flag_modified()
✓ Changes persisted with flag_modified(): Updated Foundation Check

============================================================
✓ All tests passed!
============================================================

Key Findings:
- JSONB fields support in-place mutations
- Changes persist correctly after commit/refresh
- Both MutableDict and flag_modified() approaches work
- SQLAlchemy properly tracks JSONB changes
```

## Test Failure Scenarios

### If Test 2 or Test 3 Fails

**Symptom:** Changes don't persist to database after commit.

**Likely Causes:**
1. MutableDict.as_mutable(JSONB) not configured in model
2. JSONB column defined as plain `JSONB` instead of `MutableDict.as_mutable(JSONB)`

**Fix:**
```python
# In app/models/inspection.py
from sqlalchemy.ext.mutable import MutableDict

class InspectionStageTemplate(Base):
    # Change from:
    stage_definitions: Mapped[dict | None] = mapped_column(JSONB, default=dict)

    # To:
    stage_definitions: Mapped[dict | None] = mapped_column(
        MutableDict.as_mutable(JSONB),
        default=dict
    )
```

### If Only Test 4 Passes

**Symptom:** Test 2/3 fail, but Test 4 succeeds.

**Interpretation:**
- MutableDict is NOT configured (automatic tracking doesn't work)
- flag_modified() approach still works (manual tracking)

**Action Required:** Add MutableDict wrapper to the model.

## Integration with Spec Requirements

This test verifies requirement from spec.md:

> **Edge Cases:**
> - **JSONB Mutation Tracking** - Use MutableDict wrapper to detect in-place changes to stage templates

And from patterns:

> **Key Points:**
> - Use `Mapped[type]` with `mapped_column()` for SQLAlchemy 2.0 syntax
> - JSONB columns MUST use `MutableDict.as_mutable(JSONB)` for change tracking

## Related Files

- **Model:** `backend/app/models/inspection.py` (InspectionStageTemplate)
- **Migration:** `backend/alembic/versions/003_add_supervision_inspections.py`
- **Spec:** `.auto-claude/specs/019-epic-3-senior-supervision-inspection-system/spec.md`

## Cleanup

The test automatically cleans up all created test data:
- Deletes created InspectionStageTemplate
- Deletes created ConsultantType
- Handles cleanup even if tests fail

No manual cleanup required.

## Notes for QA

✅ **Pass Criteria:**
- All 4 tests complete successfully
- Changes persist across session boundaries
- Both MutableDict and flag_modified() approaches work

⚠️ **Warning Signs:**
- Tests fail intermittently → Check database connection stability
- Test 2/3 fail consistently → MutableDict not configured in model
- All tests fail → Database not accessible or migration not applied

## Technical Details

### Why This Test Matters

JSONB mutation tracking is critical for this feature because:

1. **Stage Templates are Dynamic:** Inspection stage definitions change frequently as consultants update requirements
2. **Data Integrity:** Without proper tracking, template updates might silently fail
3. **Audit Trail:** Need to ensure all changes are captured for audit logging
4. **User Experience:** Users expect template changes to save immediately

### SQLAlchemy Internals

- SQLAlchemy's ORM tracks changes to mapped attributes
- For mutable objects (dicts, lists), changes aren't auto-detected
- MutableDict wraps the dict and fires change events when mutated
- flag_modified() manually marks an attribute as changed

### Alternative Approaches (Not Recommended)

1. **Replace entire dict:**
   ```python
   template.stage_definitions = {**template.stage_definitions, "new_key": "value"}
   ```
   Works but inefficient for large JSONB objects.

2. **Use JSON instead of JSONB:**
   Less performant, loses PostgreSQL's JSONB benefits.

3. **Store as TEXT:**
   Manual JSON serialization, no query support.

## Conclusion

This test ensures that the InspectionStageTemplate model correctly implements JSONB mutation tracking, allowing users to safely update stage definitions without data loss.
