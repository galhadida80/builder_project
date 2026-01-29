# Equipment Templates Migration Verification Checklist

## Subtask 3-1: Database Verification

This checklist confirms that the Equipment Templates migration (004) has been successfully applied to the database.

---

## ✅ Pre-Verification

- [x] Migration file created: `backend/alembic/versions/004_add_equipment_templates.py`
- [x] Migration includes all 5 tables
- [x] Migration includes all 6 required indexes
- [x] Migration has proper upgrade and downgrade functions
- [ ] Database is running and accessible
- [ ] Migration has been applied: `alembic upgrade head`

---

## ✅ Table Verification

### 1. consultant_types
- [ ] Table exists in database
- [ ] Columns:
  - [ ] `id` (UUID, PRIMARY KEY)
  - [ ] `name` (VARCHAR(100), NOT NULL)
  - [ ] `description` (TEXT)
  - [ ] `created_at` (TIMESTAMP)

### 2. equipment_templates
- [ ] Table exists in database
- [ ] Columns:
  - [ ] `id` (UUID, PRIMARY KEY)
  - [ ] `name` (VARCHAR(255), NOT NULL)
  - [ ] `category` (VARCHAR(100))
  - [ ] `description` (TEXT)
  - [ ] `specifications` (JSONB)
  - [ ] `is_active` (BOOLEAN)
  - [ ] `created_at` (TIMESTAMP)
  - [ ] `updated_at` (TIMESTAMP)
  - [ ] `created_by_id` (UUID, FOREIGN KEY → users.id)

### 3. equipment_template_consultants
- [ ] Table exists in database
- [ ] Columns:
  - [ ] `id` (UUID, PRIMARY KEY)
  - [ ] `template_id` (UUID, FOREIGN KEY → equipment_templates.id, CASCADE DELETE)
  - [ ] `consultant_type_id` (UUID, FOREIGN KEY → consultant_types.id, CASCADE DELETE)
  - [ ] `created_at` (TIMESTAMP)

### 4. equipment_approval_submissions
- [ ] Table exists in database
- [ ] Columns:
  - [ ] `id` (UUID, PRIMARY KEY)
  - [ ] `project_id` (UUID, FOREIGN KEY → projects.id, CASCADE DELETE)
  - [ ] `template_id` (UUID, FOREIGN KEY → equipment_templates.id, NULLABLE)
  - [ ] `equipment_id` (UUID, FOREIGN KEY → equipment.id, NULLABLE)
  - [ ] `status` (VARCHAR(50), NOT NULL)
  - [ ] `submitted_at` (TIMESTAMP)
  - [ ] `submitted_by_id` (UUID, FOREIGN KEY → users.id)
  - [ ] `created_at` (TIMESTAMP)
  - [ ] `updated_at` (TIMESTAMP)

### 5. equipment_approval_decisions
- [ ] Table exists in database
- [ ] Columns:
  - [ ] `id` (UUID, PRIMARY KEY)
  - [ ] `submission_id` (UUID, FOREIGN KEY → equipment_approval_submissions.id, CASCADE DELETE)
  - [ ] `approver_id` (UUID, FOREIGN KEY → users.id)
  - [ ] `decision` (VARCHAR(50), NOT NULL)
  - [ ] `comments` (TEXT)
  - [ ] `decided_at` (TIMESTAMP)
  - [ ] `created_at` (TIMESTAMP)

---

## ✅ Foreign Key Verification

All foreign keys should be defined with proper referential integrity:

- [ ] `equipment_templates.created_by_id` → `users.id`
- [ ] `equipment_template_consultants.template_id` → `equipment_templates.id` (CASCADE)
- [ ] `equipment_template_consultants.consultant_type_id` → `consultant_types.id` (CASCADE)
- [ ] `equipment_approval_submissions.project_id` → `projects.id` (CASCADE)
- [ ] `equipment_approval_submissions.template_id` → `equipment_templates.id`
- [ ] `equipment_approval_submissions.equipment_id` → `equipment.id`
- [ ] `equipment_approval_submissions.submitted_by_id` → `users.id`
- [ ] `equipment_approval_decisions.submission_id` → `equipment_approval_submissions.id` (CASCADE)
- [ ] `equipment_approval_decisions.approver_id` → `users.id`

**Total Expected Foreign Keys: 9**

---

## ✅ Index Verification

All required indexes should exist for query performance:

- [ ] `ix_equipment_templates_name` on `equipment_templates(name)`
- [ ] `ix_equipment_templates_category` on `equipment_templates(category)`
- [ ] `ix_equipment_approval_submissions_project_id` on `equipment_approval_submissions(project_id)`
- [ ] `ix_equipment_approval_submissions_template_id` on `equipment_approval_submissions(template_id)`
- [ ] `ix_equipment_approval_submissions_status` on `equipment_approval_submissions(status)`
- [ ] `ix_equipment_approval_decisions_submission_id` on `equipment_approval_decisions(submission_id)`

**Total Expected Indexes: 6**

---

## ✅ Alembic Migration Status

- [ ] `alembic current` shows revision: `004`
- [ ] `alembic history` shows migration chain: `001 → 004`
- [ ] No errors in migration logs

---

## ✅ Cascade Delete Behavior

Test cascade deletes work correctly:

### Test 1: equipment_template_consultants cascade
```sql
-- Insert test data
INSERT INTO consultant_types (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Test Consultant');
INSERT INTO equipment_templates (id, name, is_active) VALUES ('00000000-0000-0000-0000-000000000002', 'Test Template', true);
INSERT INTO equipment_template_consultants (id, template_id, consultant_type_id)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

-- Delete template (should cascade to junction table)
DELETE FROM equipment_templates WHERE id = '00000000-0000-0000-0000-000000000002';

-- Verify junction record was deleted
SELECT COUNT(*) FROM equipment_template_consultants WHERE id = '00000000-0000-0000-0000-000000000003';
-- Expected: 0

-- Cleanup
DELETE FROM consultant_types WHERE id = '00000000-0000-0000-0000-000000000001';
```

- [ ] Cascade delete works for equipment_template_consultants

### Test 2: equipment_approval_decisions cascade
```sql
-- Insert test data (assuming project and user exist)
INSERT INTO equipment_approval_submissions (id, project_id, status, submitted_by_id)
VALUES ('00000000-0000-0000-0000-000000000004', '<project_id>', 'pending', '<user_id>');
INSERT INTO equipment_approval_decisions (id, submission_id, decision)
VALUES ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'approved');

-- Delete submission (should cascade to decisions)
DELETE FROM equipment_approval_submissions WHERE id = '00000000-0000-0000-0000-000000000004';

-- Verify decision was deleted
SELECT COUNT(*) FROM equipment_approval_decisions WHERE id = '00000000-0000-0000-0000-000000000005';
-- Expected: 0
```

- [ ] Cascade delete works for equipment_approval_decisions

---

## ✅ Automated Verification

Run the automated verification scripts:

### Python Script
```bash
cd backend
python verify_equipment_templates_migration.py
```
- [ ] All checks pass (tables, foreign keys, indexes, migration version)

### SQL Script
```bash
psql -h localhost -U postgres -d builder_db -f backend/verify_equipment_templates_schema.sql
```
- [ ] Shows 5 tables created
- [ ] Shows 6 indexes created
- [ ] Shows 9 foreign keys created

---

## ✅ Final Verification Summary

**Expected Results:**
- **Tables Created:** 5
- **Foreign Keys:** 9
- **Indexes:** 6
- **Migration Version:** 004

**Actual Results:**
- Tables Created: _____
- Foreign Keys: _____
- Indexes: _____
- Migration Version: _____

---

## 🎯 Sign-Off

- [ ] All tables exist with correct structure
- [ ] All columns have correct data types
- [ ] All foreign keys are properly defined
- [ ] All indexes are created
- [ ] Cascade deletes work as expected
- [ ] Migration version is correct (004)
- [ ] No errors or warnings in migration logs
- [ ] Automated verification scripts pass

**Verified By:** _______________
**Date:** _______________
**Notes:** _______________

---

## 📋 How to Run Verification

1. **Ensure database is running:**
   ```bash
   docker compose up -d db
   ```

2. **Apply migration if not already applied:**
   ```bash
   cd backend
   alembic upgrade head
   ```

3. **Run automated verification:**
   ```bash
   # Python verification (recommended)
   python verify_equipment_templates_migration.py

   # OR SQL verification
   psql -h localhost -U postgres -d builder_db -f verify_equipment_templates_schema.sql
   ```

4. **Check results and mark checkboxes above**

5. **Sign off when all checks pass**
