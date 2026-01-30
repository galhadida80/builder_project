# Consultant Types Seeding Documentation

## Overview

This directory contains scripts to seed the database with 21 consultant types required for the supervision inspection system.

## Seeding Script

**Location:** `scripts/seed_consultant_types.py`

The seeding script:
- Loads 21 consultant types with Hebrew names
- Supports Excel file parsing (if file `פיקוחים עליונים - כמות בדיקות.xlsx` is available)
- Falls back to hardcoded data (21 types with 1-7 inspection stages each)
- Skips existing records to prevent duplicates
- Uses proper database transactions

## Running the Seeding

### Option 1: Using Helper Script (Recommended)

```bash
# Start database first
docker-compose up -d db

# Run seeding with verification
cd backend
./run_seeding.sh
```

### Option 2: Direct Python Script

```bash
cd backend
source venv/bin/activate

# Run seeding
python scripts/seed_consultant_types.py

# Verify count
python verify_seeding.py
```

### Option 3: Dry-Run Mode (No Database Required)

```bash
cd backend
source venv/bin/activate
python scripts/seed_consultant_types.py --dry-run
```

This will print all 21 consultant types without inserting into the database.

## Verification

### Using Python Script

```bash
cd backend
source venv/bin/activate
python verify_seeding.py
```

This will:
1. Check database connection
2. Run the seeding script
3. Verify 21 consultant types exist in the database

### Using psql (if available)

```bash
psql -h localhost -U postgres -d builder_db -c "SELECT COUNT(*) FROM consultant_types;"
```

Expected output: `21`

## Consultant Types

The following 21 consultant types are seeded:

| # | Hebrew Name              | English Name                | Stages |
|---|--------------------------|----------------------------|--------|
| 1 | אגרונום                  | Agronomist                 | 3      |
| 2 | מהנדס קרקע               | Soil Engineer              | 4      |
| 3 | הידרולוג                 | Hydrologist                | 2      |
| 4 | איטום                    | Waterproofing              | 5      |
| 5 | מהנדס קונסטרוקציה        | Structural Engineer        | 7      |
| 6 | אדריכל                   | Architect                  | 6      |
| 7 | מהנדס חשמל               | Electrical Engineer        | 5      |
| 8 | מהנדס אינסטלציה          | Plumbing Engineer          | 4      |
| 9 | מהנדס מיזוג אוויר        | HVAC Engineer              | 4      |
| 10 | מהנדס בטיחות            | Safety Engineer            | 5      |
| 11 | יועץ נגישות              | Accessibility Consultant   | 3      |
| 12 | מהנדס תנועה              | Traffic Engineer           | 3      |
| 13 | מתכנן תאורה              | Lighting Designer          | 3      |
| 14 | יועץ שילוט               | Signage Consultant         | 2      |
| 15 | בטיחות קרינה             | Radiation Safety           | 2      |
| 16 | מומחה אלומיניום          | Aluminum Specialist        | 3      |
| 17 | מהנדס אקוסטיקה           | Acoustics Engineer         | 3      |
| 18 | יועץ בנייה ירוקה         | Green Building Consultant  | 4      |
| 19 | מפקח פיתוח               | Development Supervisor     | 5      |
| 20 | מעצב פנים                | Interior Designer          | 4      |
| 21 | מהנדס מעליות             | Elevator Engineer          | 4      |

## Database Requirements

- PostgreSQL 9.4+ (for JSONB support)
- Database: `builder_db`
- User: `postgres`
- Password: `postgres`
- Host: `localhost`
- Port: `5432`

## Troubleshooting

### Database Connection Failed

If you see:
```
connection to server at "localhost" (127.0.0.1), port 5432 failed: Connection refused
```

**Solution:**
```bash
# Start PostgreSQL via Docker
docker-compose up -d db

# Wait for database to be ready
docker-compose ps db
```

### Module Not Found

If you see:
```
ModuleNotFoundError: No module named 'sqlalchemy'
```

**Solution:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Migration Not Applied

If you see:
```
relation "consultant_types" does not exist
```

**Solution:**
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

## Environment Constraints

This seeding script is designed to work in environments where:
- Docker may not be available
- psql command-line tool may not be available
- Direct database access may be limited

The script provides:
- **Dry-run mode** for verification without database
- **Python-based verification** instead of requiring psql
- **Helper scripts** for easy execution
- **Clear error messages** when database is unavailable

## Files

- `scripts/seed_consultant_types.py` - Main seeding script
- `verify_seeding.py` - Verification script (Python-based)
- `run_seeding.sh` - Helper script for running seeding and verification
- `SEEDING_README.md` - This documentation

## Next Steps

After seeding is complete:
1. Verify count: `python verify_seeding.py`
2. Test API: `curl http://localhost:8000/api/v1/consultant-types`
3. Check API docs: http://localhost:8000/docs
4. Create inspection templates for consultant types as needed
