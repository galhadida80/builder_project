# Database Schema Verification for ChecklistInstance Models

## Overview

This document provides the verification steps for confirming that the database tables for `ChecklistInstance` and `ChecklistItemResponse` models were created correctly by the Alembic migration `002_add_checklist_models.py`.

## Migration Status

- **Migration File**: `backend/alembic/versions/002_add_checklist_models.py`
- **Revision ID**: 002
- **Depends On**: 001
- **Tables Created**: 5 tables (checklist_templates, checklist_sub_sections, checklist_item_templates, checklist_instances, checklist_item_responses)

## Verification Steps

### Step 1: Apply Migration

Before verifying, ensure the migration has been applied:

```bash
cd backend
python3 -m alembic upgrade head
```

Expected output: Migration 002 applies successfully without errors.

### Step 2: Connect to PostgreSQL

```bash
# Using psql
psql $DATABASE_URL

# Or if using docker-compose
docker-compose exec db psql -U postgres -d builder_db
```

### Step 3: Verify Tables Exist

Run the following SQL commands:

```sql
-- Check if checklist_instances table exists
\dt checklist_instances

-- Check if checklist_item_responses table exists
\dt checklist_item_responses
```

**Expected**: Both tables should be listed.

### Step 4: Verify checklist_instances Schema

Run:
```sql
\d checklist_instances
```

**Expected Schema (12 columns)**:

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| project_id | uuid | NOT NULL, FOREIGN KEY → projects.id (ON DELETE CASCADE) |
| template_id | uuid | NOT NULL, FOREIGN KEY → checklist_templates.id (ON DELETE CASCADE) |
| area_id | uuid | NULLABLE, FOREIGN KEY → construction_areas.id (ON DELETE SET NULL) |
| unit_identifier | character varying(255) | NULLABLE |
| status | character varying(50) | DEFAULT 'not_started' |
| started_at | timestamp without time zone | DEFAULT now() |
| completed_at | timestamp without time zone | NULLABLE |
| completed_by | uuid | NOT NULL, FOREIGN KEY → users.id (ON DELETE RESTRICT) |
| additional_data | jsonb | DEFAULT '{}' |
| created_at | timestamp without time zone | DEFAULT now() |
| updated_at | timestamp without time zone | DEFAULT now() |

**Total**: 12 columns ✓

**Foreign Key Count**: 4 FKs (project_id, template_id, area_id, completed_by)

### Step 5: Verify checklist_item_responses Schema

Run:
```sql
\d checklist_item_responses
```

**Expected Schema (10 columns)**:

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PRIMARY KEY |
| instance_id | uuid | NOT NULL, FOREIGN KEY → checklist_instances.id (ON DELETE CASCADE) |
| item_template_id | uuid | NOT NULL, FOREIGN KEY → checklist_item_templates.id (ON DELETE CASCADE) |
| status | character varying(50) | DEFAULT 'pending' |
| note | text | NULLABLE |
| image_file_ids | jsonb | DEFAULT '[]' |
| signature_file_id | uuid | NULLABLE |
| responded_by | uuid | NOT NULL, FOREIGN KEY → users.id (ON DELETE RESTRICT) |
| responded_at | timestamp without time zone | DEFAULT now() |
| additional_data | jsonb | DEFAULT '{}' |

**Total**: 10 columns ✓

**Foreign Key Count**: 3 FKs (instance_id, item_template_id, responded_by)

### Step 6: Verify Foreign Key Constraints

Run:
```sql
-- Check all FK constraints for checklist_instances
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'checklist_instances';
```

**Expected Constraints**:
1. project_id → projects.id (ON DELETE CASCADE)
2. template_id → checklist_templates.id (ON DELETE CASCADE)
3. area_id → construction_areas.id (ON DELETE SET NULL)
4. completed_by → users.id (ON DELETE RESTRICT)

Run for checklist_item_responses:
```sql
-- Check all FK constraints for checklist_item_responses
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'checklist_item_responses';
```

**Expected Constraints**:
1. instance_id → checklist_instances.id (ON DELETE CASCADE)
2. item_template_id → checklist_item_templates.id (ON DELETE CASCADE)
3. responded_by → users.id (ON DELETE RESTRICT)

### Step 7: Verify JSONB Column Types

Run:
```sql
-- Verify JSONB columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('checklist_instances', 'checklist_item_responses')
    AND data_type = 'jsonb';
```

**Expected**:
- checklist_instances.additional_data: jsonb (default: '{}')
- checklist_item_responses.image_file_ids: jsonb (default: '[]')
- checklist_item_responses.additional_data: jsonb (default: '{}')

## Verification Checklist

Use this checklist when performing verification:

- [ ] Migration 002 applied successfully
- [ ] checklist_instances table exists
- [ ] checklist_item_responses table exists
- [ ] checklist_instances has exactly 12 columns
- [ ] checklist_item_responses has exactly 10 columns
- [ ] All 4 foreign keys present in checklist_instances
- [ ] All 3 foreign keys present in checklist_item_responses
- [ ] Foreign key ON DELETE behaviors correct (CASCADE, SET NULL, RESTRICT)
- [ ] JSONB columns configured correctly
- [ ] Default values set for status columns
- [ ] Timestamp columns have server defaults
- [ ] UUID columns use uuid type
- [ ] Nullable columns are marked correctly

## Automated Verification Script

For automated verification, see `verify-schema.sh` in this directory.

## Troubleshooting

### Migration Fails
- Check that migration 001 was applied first
- Verify referenced tables exist (projects, users, construction_areas)
- Check database user has CREATE TABLE permissions

### Tables Don't Exist
- Run `alembic current` to check current revision
- Run `alembic history` to see migration history
- Try `alembic upgrade head` again

### Foreign Key Errors
- Ensure referenced tables exist first
- Check that column types match (UUID → UUID)
- Verify ON DELETE behavior is supported

## Success Criteria

✅ **All checks pass** when:
1. Both tables exist with correct names
2. Column counts match (12 and 10)
3. All foreign keys are present and correct
4. JSONB columns configured properly
5. Default values are set correctly
6. No errors when querying tables

## Notes

This verification was performed on: [DATE TO BE FILLED]
By: [QA Agent or Manual Tester]
Database Version: PostgreSQL [VERSION]
Migration Applied: Successfully / With Issues

