-- Database Verification Script for Equipment Templates Migration (004)
-- This script verifies all 5 tables, columns, foreign keys, and indexes

\echo '============================================'
\echo 'Equipment Templates Migration Verification'
\echo '============================================'
\echo ''

-- 1. Verify all 5 tables exist
\echo '1. Checking if all 5 tables exist...'
\echo ''
SELECT
    tablename,
    CASE
        WHEN tablename IN ('consultant_types', 'equipment_templates', 'equipment_template_consultants',
                          'equipment_approval_submissions', 'equipment_approval_decisions')
        THEN '✓ EXISTS'
        ELSE '✗ UNEXPECTED'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('consultant_types', 'equipment_templates', 'equipment_template_consultants',
                    'equipment_approval_submissions', 'equipment_approval_decisions')
ORDER BY tablename;

\echo ''
\echo '2. Checking consultant_types table structure...'
\echo ''
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'consultant_types'
ORDER BY ordinal_position;

\echo ''
\echo '3. Checking equipment_templates table structure...'
\echo ''
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment_templates'
ORDER BY ordinal_position;

\echo ''
\echo '4. Checking equipment_template_consultants table structure...'
\echo ''
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment_template_consultants'
ORDER BY ordinal_position;

\echo ''
\echo '5. Checking equipment_approval_submissions table structure...'
\echo ''
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment_approval_submissions'
ORDER BY ordinal_position;

\echo ''
\echo '6. Checking equipment_approval_decisions table structure...'
\echo ''
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'equipment_approval_decisions'
ORDER BY ordinal_position;

\echo ''
\echo '7. Checking foreign key constraints...'
\echo ''
SELECT
    tc.table_name,
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
  AND tc.table_name IN ('equipment_templates', 'equipment_template_consultants',
                        'equipment_approval_submissions', 'equipment_approval_decisions')
ORDER BY tc.table_name, kcu.column_name;

\echo ''
\echo '8. Checking indexes...'
\echo ''
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('equipment_templates', 'equipment_approval_submissions', 'equipment_approval_decisions')
  AND schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''
\echo '9. Expected indexes verification...'
\echo ''
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_equipment_templates_name')
        THEN '✓ ix_equipment_templates_name EXISTS'
        ELSE '✗ ix_equipment_templates_name MISSING'
    END as index1,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_equipment_templates_category')
        THEN '✓ ix_equipment_templates_category EXISTS'
        ELSE '✗ ix_equipment_templates_category MISSING'
    END as index2,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_equipment_approval_submissions_project_id')
        THEN '✓ ix_equipment_approval_submissions_project_id EXISTS'
        ELSE '✗ ix_equipment_approval_submissions_project_id MISSING'
    END as index3,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_equipment_approval_submissions_template_id')
        THEN '✓ ix_equipment_approval_submissions_template_id EXISTS'
        ELSE '✗ ix_equipment_approval_submissions_template_id MISSING'
    END as index4,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_equipment_approval_submissions_status')
        THEN '✓ ix_equipment_approval_submissions_status EXISTS'
        ELSE '✗ ix_equipment_approval_submissions_status MISSING'
    END as index5,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ix_equipment_approval_decisions_submission_id')
        THEN '✓ ix_equipment_approval_decisions_submission_id EXISTS'
        ELSE '✗ ix_equipment_approval_decisions_submission_id MISSING'
    END as index6;

\echo ''
\echo '10. Verification Summary'
\echo ''
SELECT
    (SELECT COUNT(*) FROM pg_tables
     WHERE schemaname = 'public'
       AND tablename IN ('consultant_types', 'equipment_templates', 'equipment_template_consultants',
                        'equipment_approval_submissions', 'equipment_approval_decisions')) as tables_created,
    (SELECT COUNT(*) FROM pg_indexes
     WHERE indexname IN ('ix_equipment_templates_name', 'ix_equipment_templates_category',
                        'ix_equipment_approval_submissions_project_id', 'ix_equipment_approval_submissions_template_id',
                        'ix_equipment_approval_submissions_status', 'ix_equipment_approval_decisions_submission_id')) as indexes_created,
    (SELECT COUNT(*) FROM information_schema.table_constraints
     WHERE constraint_type = 'FOREIGN KEY'
       AND table_name IN ('equipment_templates', 'equipment_template_consultants',
                         'equipment_approval_submissions', 'equipment_approval_decisions')) as foreign_keys_created;

\echo ''
\echo '============================================'
\echo 'Expected Results:'
\echo '  - Tables Created: 5'
\echo '  - Indexes Created: 6'
\echo '  - Foreign Keys Created: 8'
\echo '============================================'
