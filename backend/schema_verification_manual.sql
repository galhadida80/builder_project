-- ============================================================================
-- DATABASE SCHEMA VERIFICATION FOR EQUIPMENT APPROVAL MODELS
-- ============================================================================
-- This script contains SQL queries to manually verify the database schema
-- created by migration 002_add_equipment_approval_models.py
--
-- Run these commands in psql or your PostgreSQL client:
--   psql -U postgres -d builder_db -f schema_verification_manual.sql
-- ============================================================================

\echo '============================================================================'
\echo 'EQUIPMENT APPROVAL MODELS - SCHEMA VERIFICATION'
\echo '============================================================================'

-- [1] Check if equipment_approval_submissions table exists
\echo ''
\echo '[1] Checking if equipment_approval_submissions table exists...'
SELECT
    CASE
        WHEN EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'equipment_approval_submissions'
        )
        THEN '✓ equipment_approval_submissions table EXISTS'
        ELSE '✗ equipment_approval_submissions table NOT FOUND'
    END AS result;

-- [2] List all columns in equipment_approval_submissions
\echo ''
\echo '[2] Columns in equipment_approval_submissions:'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment_approval_submissions'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid, NOT NULL, PRIMARY KEY)
-- project_id (uuid, NOT NULL, FK to projects)
-- template_id (uuid, nullable)
-- name (varchar(255), NOT NULL)
-- specifications (jsonb)
-- documents (jsonb)
-- checklist_responses (jsonb)
-- additional_data (jsonb)
-- status (varchar(50), default 'draft')
-- submitted_by_id (uuid, FK to users)
-- submitted_at (timestamp, nullable)
-- created_at (timestamp, default now())
-- updated_at (timestamp, default now())

-- [3] Check foreign keys for equipment_approval_submissions
\echo ''
\echo '[3] Foreign keys in equipment_approval_submissions:'
SELECT
    tc.constraint_name,
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
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'equipment_approval_submissions';

-- Expected foreign keys:
-- project_id -> projects.id (CASCADE on delete)
-- submitted_by_id -> users.id (no action or null)

-- [4] Check if equipment_approval_decisions table exists
\echo ''
\echo '[4] Checking if equipment_approval_decisions table exists...'
SELECT
    CASE
        WHEN EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'equipment_approval_decisions'
        )
        THEN '✓ equipment_approval_decisions table EXISTS'
        ELSE '✗ equipment_approval_decisions table NOT FOUND'
    END AS result;

-- [5] List all columns in equipment_approval_decisions
\echo ''
\echo '[5] Columns in equipment_approval_decisions:'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment_approval_decisions'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid, NOT NULL, PRIMARY KEY)
-- submission_id (uuid, NOT NULL, FK to equipment_approval_submissions)
-- decision_type (varchar(50), NOT NULL)
-- reviewer_id (uuid, FK to users)
-- reviewer_role (varchar(50), NOT NULL)
-- comments (text, nullable)
-- created_at (timestamp, default now())

-- [6] Check foreign keys for equipment_approval_decisions
\echo ''
\echo '[6] Foreign keys in equipment_approval_decisions:'
SELECT
    tc.constraint_name,
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
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'equipment_approval_decisions';

-- Expected foreign keys:
-- submission_id -> equipment_approval_submissions.id (CASCADE on delete)
-- reviewer_id -> users.id (no action or null)

-- [7] Verify CASCADE delete behavior
\echo ''
\echo '[7] Verifying CASCADE delete constraints:'
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('equipment_approval_submissions', 'equipment_approval_decisions')
    AND rc.delete_rule = 'CASCADE';

-- Expected CASCADE constraints:
-- equipment_approval_submissions.project_id -> projects.id (CASCADE)
-- equipment_approval_decisions.submission_id -> equipment_approval_submissions.id (CASCADE)

-- [8] Summary check
\echo ''
\echo '============================================================================'
\echo 'VERIFICATION SUMMARY'
\echo '============================================================================'
\echo ''
\echo 'Expected Results:'
\echo '  [1] equipment_approval_submissions table should exist'
\echo '  [2] Should have 13 columns (id, project_id, template_id, name, specifications,'
\echo '      documents, checklist_responses, additional_data, status, submitted_by_id,'
\echo '      submitted_at, created_at, updated_at)'
\echo '  [3] Should have 2 foreign keys:'
\echo '      - project_id -> projects.id (CASCADE)'
\echo '      - submitted_by_id -> users.id'
\echo '  [4] equipment_approval_decisions table should exist'
\echo '  [5] Should have 7 columns (id, submission_id, decision_type, reviewer_id,'
\echo '      reviewer_role, comments, created_at)'
\echo '  [6] Should have 2 foreign keys:'
\echo '      - submission_id -> equipment_approval_submissions.id (CASCADE)'
\echo '      - reviewer_id -> users.id'
\echo '  [7] Should have 2 CASCADE delete constraints'
\echo ''
\echo '============================================================================'
