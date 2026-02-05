# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-29T19:45:00Z
**QA Session**: 1

## Critical Issues to Fix

### 1. Fix EquipmentApprovalDecision Field Names to Match Spec

**Problem**: The model uses different field names than specified in the requirements document.

**Location**: `backend/app/models/equipment_template.py` lines 51-58

**Current Implementation** (WRONG):
```python
reviewer_id: Mapped[uuid.UUID | None]  # Should be: approver_id
decision_type: Mapped[str]              # Should be: decision
created_at: Mapped[datetime]            # Should be: decided_at
reviewer_role: Mapped[str]              # Should be: consultant_type_id (UUID FK, not string!)
```

**Required Fix**:
Replace the EquipmentApprovalDecision class with:
```python
class EquipmentApprovalDecision(Base):
    __tablename__ = "equipment_approval_decisions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("equipment_approval_submissions.id", ondelete="CASCADE"))
    # TODO: consultant_type_id depends on ConsultantType model (to be created in separate task)
    consultant_type_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("consultant_types.id", ondelete="SET NULL"))
    approver_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    comments: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    submission = relationship("EquipmentApprovalSubmission", back_populates="decisions")
    approver = relationship("User", foreign_keys=[approver_id])
```

**Verification**: Field names must exactly match the spec (lines 200-204):
- ✓ `consultant_type_id` - FK to ConsultantType (nullable, with TODO comment)
- ✓ `approver_id` - FK to User
- ✓ `decision` - enum field
- ✓ `decided_at` - datetime

---

### 2. Update Migration to Match Corrected Model

**Problem**: Migration creates columns with wrong names (reviewer_id, decision_type, reviewer_role, created_at)

**Location**: `backend/alembic/versions/002_add_equipment_approval_models.py` lines 42-47

**Required Fix**:
Replace the equipment_approval_decisions table creation with:
```python
op.create_table(
    'equipment_approval_decisions',
    sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
    sa.Column('submission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('equipment_approval_submissions.id', ondelete='CASCADE'), nullable=False),
    # TODO: Add FK constraint to consultant_types.id when ConsultantType model is created
    sa.Column('consultant_type_id', postgresql.UUID(as_uuid=True)),
    sa.Column('approver_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
    sa.Column('decision', sa.String(50), nullable=False),
    sa.Column('comments', sa.Text()),
    sa.Column('decided_at', sa.DateTime(), server_default=sa.func.now()),
)
```

**Verification**: Run `alembic upgrade head` and verify table schema has correct column names

---

### 3. Add Missing Relationship to Project Model

**Problem**: EquipmentApprovalSubmission references `back_populates="equipment_approval_submissions"` but Project model doesn't have this relationship. This will cause a runtime error.

**Location**: `backend/app/models/project.py`

**Required Fix**:
Add this line to the Project model's relationships section (after line 27, with other relationships like `equipment`, `materials`, etc.):
```python
equipment_approval_submissions = relationship("EquipmentApprovalSubmission", back_populates="project", cascade="all, delete-orphan")
```

**Verification**: Import both models and verify no AttributeError when accessing the relationship

---

### 4. Create Unit Tests

**Problem**: QA Acceptance Criteria requires unit tests at `backend/tests/test_models/test_equipment_template.py` but they don't exist

**Location**: Create `backend/tests/test_models/test_equipment_template.py`

**Required Fix**:
1. Create directory structure:
   ```bash
   mkdir -p backend/tests/test_models
   touch backend/tests/__init__.py
   touch backend/tests/test_models/__init__.py
   ```

2. Create `backend/tests/test_models/test_equipment_template.py` with at minimum:
   - Test for SubmissionStatus enum values (draft, pending_review, approved, rejected)
   - Test for DecisionType enum values (approved, rejected, revision_requested)
   - Test for EquipmentApprovalSubmission model instantiation
   - Test for EquipmentApprovalDecision model instantiation
   - Test for JSONB field defaults (specifications, documents, checklist_responses, additional_data)

**Verification**: Run `pytest backend/tests/test_models/test_equipment_template.py -v` - all tests must pass

---

### 5. Create Integration Tests

**Problem**: QA Acceptance Criteria requires integration tests at `backend/tests/integration/test_equipment_approval.py` but they don't exist

**Location**: Create `backend/tests/integration/test_equipment_approval.py`

**Required Fix**:
1. Create directory:
   ```bash
   mkdir -p backend/tests/integration
   touch backend/tests/integration/__init__.py
   ```

2. Create `backend/tests/integration/test_equipment_approval.py` with at minimum:
   - Test that tables exist in database (equipment_approval_submissions, equipment_approval_decisions)
   - Test that columns match spec requirements
   - Test CASCADE delete behavior (deleting submission removes decisions)
   - Test foreign key constraints work correctly

**Verification**: Run `pytest backend/tests/integration/test_equipment_approval.py -v` - all tests must pass

---

### 6. Verify Corrected Column Names in Decisions Table

**Problem**: Need to ensure the database schema matches the spec after fixes

**Required Fix**:
After updating the model and migration, verify the decisions table has these exact columns:
- id (UUID)
- submission_id (UUID, FK to equipment_approval_submissions.id)
- consultant_type_id (UUID, nullable, no FK constraint yet)
- approver_id (UUID, FK to users.id)
- decision (VARCHAR(50))
- comments (TEXT)
- decided_at (TIMESTAMP)

**Verification**: Query the database or check migration output to confirm column names

---

## After Fixes

Once all fixes are complete:

1. **Verify all field names match spec exactly** - No "reviewer" terminology, use "approver"
2. **Run unit tests** - `pytest backend/tests/test_models/test_equipment_template.py -v`
3. **Run integration tests** - `pytest backend/tests/integration/test_equipment_approval.py -v`
4. **Verify migration** - Check that schema matches spec requirements
5. **Commit changes** with message: `fix: correct EquipmentApprovalDecision field names and add tests (qa-requested)`
6. **QA will automatically re-run** - The validation loop will continue until all issues are resolved

## Summary of Changes Required

| File | Change Type | Description |
|------|-------------|-------------|
| `backend/app/models/equipment_template.py` | MODIFY | Fix EquipmentApprovalDecision field names |
| `backend/alembic/versions/002_add_equipment_approval_models.py` | MODIFY | Update migration column names |
| `backend/app/models/project.py` | MODIFY | Add equipment_approval_submissions relationship |
| `backend/tests/test_models/test_equipment_template.py` | CREATE | Add unit tests |
| `backend/tests/integration/test_equipment_approval.py` | CREATE | Add integration tests |

## Important Notes

- **Priority**: All 6 issues are CRITICAL and must be fixed before QA approval
- **Field Names**: Must match spec exactly - no variations or "similar" names
- **consultant_type_id**: Must be a UUID FK field (nullable), NOT a string field
- **Tests**: Are mandatory per QA Acceptance Criteria - cannot skip
- **Commit Message**: Use the exact format specified for tracking

## Reference: Spec Requirements (Lines 196-209)

The spec clearly defines EquipmentApprovalDecision fields as:
- `consultant_type_id`: FK to ConsultantType (if exists, otherwise nullable)
- `approver_id`: FK to User
- `decision`: enum - Approval decision
- `comments`: Text - Optional decision notes
- `decided_at`: datetime - When decision was made

Edge Case #1 (line 223): "Make `consultant_type_id` nullable and add a TODO comment indicating dependency"
