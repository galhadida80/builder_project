# QA Fix Request

**Status**: REJECTED
**Date**: 2026-01-29T01:40:00Z
**QA Session**: 1

---

## Overview

The implementation of InspectionTemplate models is **incomplete**. Three critical issues were found during QA validation that must be fixed before sign-off can be granted.

All issues are in the file: `backend/app/models/inspection_template.py`

---

## Critical Issues to Fix

### 1. Add Missing JSONB Fields to InspectionStageTemplate

**Problem**:
The `InspectionStageTemplate` model is missing two required JSONB fields specified in the spec:
- `trigger_conditions`
- `required_documents`

**Location**: `backend/app/models/inspection_template.py`, InspectionStageTemplate class

**Evidence**:
- Spec line 189: "Model created with... JSONB fields for trigger_conditions and required_documents"
- Spec line 259: Success criteria explicitly includes these fields
- Implementation plan line 62: Lists both fields with types

**Required Fix**:
Add these two field definitions to the InspectionStageTemplate class (insert after the `description` field, before where `stage_order` will be):

```python
trigger_conditions: Mapped[dict | None] = mapped_column(JSONB, default=dict)
required_documents: Mapped[dict | None] = mapped_column(JSONB, default=dict)
```

**Pattern Reference**: Follow the JSONB pattern from `backend/app/models/equipment.py:34` and `backend/app/models/material.py:24`

**Verification After Fix**:
The model should have these fields in this order:
1. id
2. consultant_type_id
3. name
4. name_he
5. description
6. trigger_conditions ← ADD THIS
7. required_documents ← ADD THIS
8. stage_order (rename from sequence_order)
9. is_active
10. created_at
11. updated_at

---

### 2. Rename Field: sequence_order → stage_order

**Problem**:
The field is currently named `sequence_order` but the spec consistently requires `stage_order`.

**Location**: `backend/app/models/inspection_template.py:49`

**Current Code**:
```python
sequence_order: Mapped[int] = mapped_column(Integer, default=0)
```

**Required Code**:
```python
stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
```

**Evidence**:
- Spec line 189: "stage_order for sequencing"
- Spec line 207: "stage_order should be an integer"
- Spec line 219: "Set nullable=False only for required fields (...stage_order)"
- Spec line 259: Success criteria lists "stage_order" not "sequence_order"

**Additional Change**: Remove `default=0` and add `nullable=False` to make this a required field as per spec requirements.

**Required Fix**:
1. Find the line with `sequence_order` (line 49)
2. Replace it with the required code above
3. This makes stage_order a required field with no default value

**Verification After Fix**:
```bash
grep -n "stage_order" backend/app/models/inspection_template.py
# Should show the field definition
grep -n "sequence_order" backend/app/models/inspection_template.py
# Should show NO results (only in docstring if mentioned)
```

---

### 3. Update Docstring with JSONB Schema Examples

**Problem**:
The InspectionStageTemplate docstring does not include example schemas for the JSONB fields as explicitly required by the spec.

**Location**: `backend/app/models/inspection_template.py:33-41`

**Evidence**:
- Spec line 217: "Define JSONB field structures in model docstrings (example schemas...)"
- Spec line 265: QA acceptance: "JSONB field schemas documented"
- Implementation plan line 66: Provides specific examples to include

**Current Docstring** (lines 33-41):
```python
"""
Represents a template for an inspection stage performed by a specific consultant type.

Each stage is linked to a consultant type (e.g., "Foundation Inspection" for Structural Engineer).
Stages define the workflow steps within an inspection process.

Supports bilingual content (English/Hebrew), ordering via sequence_order, and soft deletion.
"""
```

**Required Docstring**:
```python
"""
Represents a template for an inspection stage performed by a specific consultant type.

Each stage is linked to a consultant type (e.g., "Foundation Inspection" for Structural Engineer).
Stages define the workflow steps within an inspection process.

Supports bilingual content (English/Hebrew), ordering via stage_order, and soft deletion.

JSONB Field Schemas:
--------------------
trigger_conditions (dict): Conditional logic for when this stage should be triggered
    Example: {
        "construction_stage": "foundation",
        "min_days_elapsed": 7,
        "previous_stage_completed": true
    }

required_documents (list): List of document requirements for this inspection stage
    Example: [
        {
            "type": "plan",
            "name": "Structural plans",
            "name_he": "תוכניות קונסטרוקציה",
            "mandatory": true
        },
        {
            "type": "report",
            "name": "Soil test report",
            "name_he": "דוח בדיקת קרקע",
            "mandatory": false
        }
    ]
"""
```

**Required Fix**:
1. Replace the entire docstring (lines 33-41)
2. Keep the first three lines unchanged
3. Change "sequence_order" to "stage_order" in the description
4. Add the "JSONB Field Schemas:" section with both examples

**Verification After Fix**:
```bash
grep -A30 "class InspectionStageTemplate" backend/app/models/inspection_template.py | grep -E "trigger_conditions|required_documents|JSONB Field Schemas"
# Should show the JSONB schema section
```

---

## Complete Fixed Code Reference

For reference, here's how the complete InspectionStageTemplate class should look after all fixes:

```python
class InspectionStageTemplate(Base):
    """
    Represents a template for an inspection stage performed by a specific consultant type.

    Each stage is linked to a consultant type (e.g., "Foundation Inspection" for Structural Engineer).
    Stages define the workflow steps within an inspection process.

    Supports bilingual content (English/Hebrew), ordering via stage_order, and soft deletion.

    JSONB Field Schemas:
    --------------------
    trigger_conditions (dict): Conditional logic for when this stage should be triggered
        Example: {
            "construction_stage": "foundation",
            "min_days_elapsed": 7,
            "previous_stage_completed": true
        }

    required_documents (list): List of document requirements for this inspection stage
        Example: [
            {
                "type": "plan",
                "name": "Structural plans",
                "name_he": "תוכניות קונסטרוקציה",
                "mandatory": true
            },
            {
                "type": "report",
                "name": "Soil test report",
                "name_he": "דוח בדיקת קרקע",
                "mandatory": false
            }
        ]
    """
    __tablename__ = "inspection_stage_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultant_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("inspection_consultant_types.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_he: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    trigger_conditions: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    required_documents: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    consultant_type = relationship("InspectionConsultantType", back_populates="inspection_stages")
```

---

## Implementation Steps

1. **Open the file**: `backend/app/models/inspection_template.py`

2. **Fix Issue 1 - Add JSONB fields**:
   - Locate line 48 (after `description` field)
   - Add the two JSONB field definitions:
     ```python
     trigger_conditions: Mapped[dict | None] = mapped_column(JSONB, default=dict)
     required_documents: Mapped[dict | None] = mapped_column(JSONB, default=dict)
     ```

3. **Fix Issue 2 - Rename field**:
   - Find line 49 (the `sequence_order` line)
   - Replace with:
     ```python
     stage_order: Mapped[int] = mapped_column(Integer, nullable=False)
     ```

4. **Fix Issue 3 - Update docstring**:
   - Find the InspectionStageTemplate docstring (lines 33-41)
   - Replace the entire docstring with the complete version provided above
   - Make sure to change "sequence_order" to "stage_order" in the text
   - Add the JSONB Field Schemas section

5. **Verify syntax**:
   ```bash
   cd backend && python3 -m py_compile app/models/inspection_template.py
   ```

6. **Commit the changes**:
   ```bash
   git add backend/app/models/inspection_template.py
   git commit -m "fix: add missing JSONB fields and correct field naming (qa-requested)"
   ```

---

## Verification Checklist

After implementing all fixes, verify:

- [ ] File `backend/app/models/inspection_template.py` has been modified
- [ ] InspectionStageTemplate has `trigger_conditions: Mapped[dict | None]` field
- [ ] InspectionStageTemplate has `required_documents: Mapped[dict | None]` field
- [ ] Both JSONB fields use `default=dict`
- [ ] Field is named `stage_order` (not `sequence_order`)
- [ ] `stage_order` has `nullable=False` (no default value)
- [ ] Docstring includes "JSONB Field Schemas:" section
- [ ] Docstring has `trigger_conditions` example
- [ ] Docstring has `required_documents` example
- [ ] Docstring mentions "stage_order" (not "sequence_order")
- [ ] Python syntax check passes: `python3 -m py_compile`
- [ ] Changes committed with "(qa-requested)" in message

---

## What NOT to Change

**DO NOT modify**:
- ✓ InspectionConsultantType class (it's correct as-is)
- ✓ Relationship definitions (they're correct)
- ✓ Import statements (they're correct)
- ✓ Table names (they're correct)
- ✓ Other field definitions (id, name, name_he, description, is_active, timestamps)
- ✓ The `__init__.py` exports (already correct)
- ✓ Any other model files

**ONLY modify**:
- ❌ InspectionStageTemplate class definition in `inspection_template.py`
  - Add 2 JSONB fields
  - Rename 1 field
  - Update 1 docstring

---

## After Fixes Complete

Once you've implemented all three fixes:

1. **Commit** with message: `fix: add missing JSONB fields and correct field naming (qa-requested)`
2. **QA will automatically re-run** to validate the fixes
3. **Loop continues** until all issues are resolved

The QA Agent will verify:
- All three critical issues are resolved
- No new issues were introduced
- Implementation matches spec requirements
- Code quality standards maintained

---

## Questions?

If you need clarification:
- Reference the spec: `.auto-claude/specs/006-3-1-create-inspectiontemplate-models-for-supervisi/spec.md`
- Check the full QA report: `.auto-claude/specs/006-3-1-create-inspectiontemplate-models-for-supervisi/qa_report.md`
- Review patterns from: `backend/app/models/equipment.py`, `backend/app/models/material.py`

---

**Status**: Awaiting fixes from Coder Agent
**Next Action**: Implement the 3 critical fixes and commit
