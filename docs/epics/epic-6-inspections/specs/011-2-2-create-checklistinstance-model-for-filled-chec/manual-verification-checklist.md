# Manual Verification Checklist for Database Schema

This checklist should be completed when the database is accessible to verify that the migration created the correct schema.

## Prerequisites

- [ ] Database is running and accessible
- [ ] Migration 002 has been applied (`alembic upgrade head`)
- [ ] PostgreSQL connection is available

## Quick Command Reference

```bash
# Connect to database
psql $DATABASE_URL

# Or via docker
docker-compose exec db psql -U postgres -d builder_db
```

## Verification Steps

### 1. Table Existence

```sql
-- List all checklist tables
\dt checklist*
```

**Expected Output:**
- checklist_templates
- checklist_sub_sections
- checklist_item_templates
- checklist_instances
- checklist_item_responses

- [ ] All 5 tables exist

### 2. checklist_instances Schema

```sql
\d checklist_instances
```

**Verify Column Count:**
- [ ] Table has exactly 12 columns

**Verify Each Column:**
- [ ] `id` - uuid, PRIMARY KEY
- [ ] `project_id` - uuid, NOT NULL, FK to projects
- [ ] `template_id` - uuid, NOT NULL, FK to checklist_templates
- [ ] `area_id` - uuid, NULLABLE, FK to construction_areas
- [ ] `unit_identifier` - varchar(255), NULLABLE
- [ ] `status` - varchar(50), DEFAULT 'not_started'
- [ ] `started_at` - timestamp, DEFAULT now()
- [ ] `completed_at` - timestamp, NULLABLE
- [ ] `completed_by` - uuid, NOT NULL, FK to users
- [ ] `additional_data` - jsonb, DEFAULT '{}'
- [ ] `created_at` - timestamp, DEFAULT now()
- [ ] `updated_at` - timestamp, DEFAULT now()

**Verify Foreign Keys:**
- [ ] FK: project_id → projects.id (ON DELETE CASCADE)
- [ ] FK: template_id → checklist_templates.id (ON DELETE CASCADE)
- [ ] FK: area_id → construction_areas.id (ON DELETE SET NULL)
- [ ] FK: completed_by → users.id (ON DELETE RESTRICT)

**Total:** 4 foreign keys

### 3. checklist_item_responses Schema

```sql
\d checklist_item_responses
```

**Verify Column Count:**
- [ ] Table has exactly 10 columns

**Verify Each Column:**
- [ ] `id` - uuid, PRIMARY KEY
- [ ] `instance_id` - uuid, NOT NULL, FK to checklist_instances
- [ ] `item_template_id` - uuid, NOT NULL, FK to checklist_item_templates
- [ ] `status` - varchar(50), DEFAULT 'pending'
- [ ] `note` - text, NULLABLE
- [ ] `image_file_ids` - jsonb, DEFAULT '[]'
- [ ] `signature_file_id` - uuid, NULLABLE
- [ ] `responded_by` - uuid, NOT NULL, FK to users
- [ ] `responded_at` - timestamp, DEFAULT now()
- [ ] `additional_data` - jsonb, DEFAULT '{}'

**Verify Foreign Keys:**
- [ ] FK: instance_id → checklist_instances.id (ON DELETE CASCADE)
- [ ] FK: item_template_id → checklist_item_templates.id (ON DELETE CASCADE)
- [ ] FK: responded_by → users.id (ON DELETE RESTRICT)

**Total:** 3 foreign keys

### 4. Data Type Verification

```sql
-- Check UUID columns
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('checklist_instances', 'checklist_item_responses')
    AND data_type = 'uuid'
ORDER BY table_name, ordinal_position;
```

**checklist_instances UUID columns:**
- [ ] id
- [ ] project_id
- [ ] template_id
- [ ] area_id
- [ ] completed_by

**checklist_item_responses UUID columns:**
- [ ] id
- [ ] instance_id
- [ ] item_template_id
- [ ] signature_file_id
- [ ] responded_by

```sql
-- Check JSONB columns
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('checklist_instances', 'checklist_item_responses')
    AND data_type = 'jsonb'
ORDER BY table_name, ordinal_position;
```

**JSONB columns:**
- [ ] checklist_instances.additional_data (default: '{}')
- [ ] checklist_item_responses.image_file_ids (default: '[]')
- [ ] checklist_item_responses.additional_data (default: '{}')

### 5. Constraint Verification

```sql
-- List all foreign keys for checklist_instances
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'checklist_instances';
```

**Verify ON DELETE behaviors:**
- [ ] project_id: CASCADE
- [ ] template_id: CASCADE
- [ ] area_id: SET NULL
- [ ] completed_by: RESTRICT (or NO ACTION)

```sql
-- List all foreign keys for checklist_item_responses
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'checklist_item_responses';
```

**Verify ON DELETE behaviors:**
- [ ] instance_id: CASCADE
- [ ] item_template_id: CASCADE
- [ ] responded_by: RESTRICT (or NO ACTION)

### 6. Nullable Columns Verification

```sql
-- Check nullable columns
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_name IN ('checklist_instances', 'checklist_item_responses')
ORDER BY table_name, ordinal_position;
```

**checklist_instances - Should be NULLABLE:**
- [ ] area_id
- [ ] unit_identifier
- [ ] completed_at

**checklist_item_responses - Should be NULLABLE:**
- [ ] note
- [ ] signature_file_id

### 7. Default Values Verification

```sql
-- Check default values
SELECT table_name, column_name, column_default
FROM information_schema.columns
WHERE table_name IN ('checklist_instances', 'checklist_item_responses')
    AND column_default IS NOT NULL
ORDER BY table_name, ordinal_position;
```

**Verify defaults:**
- [ ] checklist_instances.status: 'not_started'
- [ ] checklist_instances.started_at: now()
- [ ] checklist_instances.additional_data: '{}'::jsonb
- [ ] checklist_instances.created_at: now()
- [ ] checklist_instances.updated_at: now()
- [ ] checklist_item_responses.status: 'pending'
- [ ] checklist_item_responses.image_file_ids: '[]'::jsonb
- [ ] checklist_item_responses.responded_at: now()
- [ ] checklist_item_responses.additional_data: '{}'::jsonb

### 8. Test Insert (Optional)

If you want to test that the tables work correctly:

```sql
-- This will fail with FK constraint errors if dependencies don't exist,
-- but it validates the table structure
BEGIN;

-- Create a test checklist instance (will fail on FK constraints)
INSERT INTO checklist_instances (
    id,
    project_id,
    template_id,
    completed_by
) VALUES (
    gen_random_uuid(),
    gen_random_uuid(),  -- Will fail if project doesn't exist
    gen_random_uuid(),  -- Will fail if template doesn't exist
    gen_random_uuid()   -- Will fail if user doesn't exist
);

-- Rollback - don't actually insert
ROLLBACK;
```

- [ ] Insert statement syntax is correct (even if FK constraints fail)

## Automated Verification

Instead of manual verification, you can run:

```bash
# From the spec directory
./.auto-claude/specs/011-2-2-create-checklistinstance-model-for-filled-chec/verify-schema.sh
```

This will automatically check all the above criteria.

## Final Sign-off

When all checks pass:

- [ ] All tables exist with correct names
- [ ] All columns present with correct names and types
- [ ] All foreign keys defined with correct references
- [ ] All nullable/not-nullable constraints correct
- [ ] All default values correct
- [ ] All ON DELETE behaviors correct
- [ ] JSONB columns use correct defaults
- [ ] UUID columns use uuid type

**Verified By:** _______________
**Date:** _______________
**Database Version:** PostgreSQL _______________
**Migration Status:** Successfully Applied

## Notes

Add any observations or issues encountered:

---

