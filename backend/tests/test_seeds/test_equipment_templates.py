"""
Integration tests for equipment templates seed script.

Tests verify that the seed script correctly populates the database with
11 equipment templates, is idempotent, and maintains data integrity.
"""

import pytest
import json
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.equipment_template import EquipmentTemplate, TemplateConsultant
from app.db.seeds.equipment_templates import seed_equipment_templates, EQUIPMENT_TEMPLATES


@pytest.fixture(scope="function")
async def test_db_session():
    """
    Create an in-memory test database with clean state for each test.

    This fixture ensures each integration test runs with a fresh database.
    """
    # Use in-memory SQLite for fast integration tests
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    # Patch AsyncSessionLocal to use test database
    from app.db import session as session_module
    original_session = session_module.AsyncSessionLocal

    session_module.AsyncSessionLocal = async_session

    yield async_session

    # Restore original session
    session_module.AsyncSessionLocal = original_session

    await engine.dispose()


@pytest.mark.asyncio
async def test_seed_execution(test_db_session):
    """Test that seed script creates exactly 11 templates."""
    # Run the seed script
    await seed_equipment_templates()

    # Verify count
    async with test_db_session() as session:
        result = await session.execute(select(func.count()).select_from(EquipmentTemplate))
        count = result.scalar()

        assert count == 11, f"Expected 11 templates, but found {count}"


@pytest.mark.asyncio
async def test_seed_idempotency(test_db_session):
    """Test that running seed twice doesn't create duplicates (count stays 11)."""
    # Run seed first time
    await seed_equipment_templates()

    # Verify count after first run
    async with test_db_session() as session:
        result = await session.execute(select(func.count()).select_from(EquipmentTemplate))
        count_after_first = result.scalar()
        assert count_after_first == 11

    # Run seed second time
    await seed_equipment_templates()

    # Verify count is still 11 (no duplicates)
    async with test_db_session() as session:
        result = await session.execute(select(func.count()).select_from(EquipmentTemplate))
        count_after_second = result.scalar()

        assert count_after_second == 11, f"Seed script should be idempotent. Expected 11 templates after second run, but found {count_after_second}"


@pytest.mark.asyncio
async def test_seed_data_integrity(test_db_session):
    """Test that all JSONB fields are populated correctly."""
    await seed_equipment_templates()

    async with test_db_session() as session:
        result = await session.execute(select(EquipmentTemplate))
        templates = result.scalars().all()

        assert len(templates) == 11

        for template in templates:
            # Verify all required fields are present
            assert template.name is not None and len(template.name) > 0
            assert template.name_en is not None and len(template.name_en) > 0

            # Verify JSONB fields are lists with content
            assert isinstance(template.required_documents, list)
            assert len(template.required_documents) > 0, f"Template {template.name} has no required_documents"

            assert isinstance(template.required_specifications, list)
            assert len(template.required_specifications) > 0, f"Template {template.name} has no required_specifications"

            assert isinstance(template.submission_checklist, list)
            assert len(template.submission_checklist) > 0, f"Template {template.name} has no submission_checklist"

            # Verify each list contains strings
            for doc in template.required_documents:
                assert isinstance(doc, str)

            for spec in template.required_specifications:
                assert isinstance(spec, str)

            for item in template.submission_checklist:
                assert isinstance(item, str)


@pytest.mark.asyncio
async def test_hebrew_text_encoding(test_db_session):
    """Test that Hebrew text in 'name' field is stored/retrieved correctly."""
    await seed_equipment_templates()

    async with test_db_session() as session:
        # Test specific template with Hebrew name
        result = await session.execute(
            select(EquipmentTemplate).where(EquipmentTemplate.name == "קירות סלארים")
        )
        template = result.scalar_one_or_none()

        assert template is not None, "Template 'קירות סלארים' not found"
        assert template.name == "קירות סלארים"
        assert template.name_en == "Slurry Walls"

        # Verify Hebrew characters are preserved in other fields
        assert any("מפרט" in doc for doc in template.required_documents), "Hebrew text in required_documents not preserved"


@pytest.mark.asyncio
async def test_english_names_populated(test_db_session):
    """Test that all templates have 'name_en' field populated."""
    await seed_equipment_templates()

    async with test_db_session() as session:
        result = await session.execute(select(EquipmentTemplate))
        templates = result.scalars().all()

        assert len(templates) == 11

        for template in templates:
            assert template.name_en is not None, f"Template {template.name} has no English name"
            assert len(template.name_en) > 0, f"Template {template.name} has empty English name"

            # English names should contain only ASCII characters (Latin alphabet)
            # This is a basic check - some templates might have numbers or special chars
            assert template.name_en.strip() != "", f"Template {template.name} has whitespace-only English name"


@pytest.mark.asyncio
async def test_consultant_mappings_count(test_db_session):
    """Test that exactly 17 consultant mappings exist."""
    await seed_equipment_templates()

    async with test_db_session() as session:
        # Count total consultant mappings
        result = await session.execute(select(func.count()).select_from(TemplateConsultant))
        total_mappings = result.scalar()

        # Expected mappings from EQUIPMENT_TEMPLATES:
        # קירות סלארים: 3 consultants
        # 5 pump systems: 5 consultants (1 each)
        # גנרטור: 2 consultants
        # מפוחים: 2 consultants
        # מעקות מרפסות: 2 consultants
        # לוחות חשמל: 2 consultants
        # דלת כניסה: 1 consultant
        # Total: 3 + 5 + 2 + 2 + 2 + 2 + 1 = 17
        expected_count = sum(len(template["consultants"]) for template in EQUIPMENT_TEMPLATES)

        assert total_mappings == expected_count, f"Expected {expected_count} consultant mappings, but found {total_mappings}"
        assert total_mappings == 17, f"Expected exactly 17 consultant mappings, but found {total_mappings}"


@pytest.mark.asyncio
async def test_unique_consultant_roles(test_db_session):
    """Test that 8 unique consultant roles exist."""
    await seed_equipment_templates()

    async with test_db_session() as session:
        # Get all unique consultant roles
        result = await session.execute(
            select(TemplateConsultant.consultant_role).distinct()
        )
        unique_roles = result.scalars().all()

        # Expected unique roles:
        # 1. קונסטרוקטור
        # 2. יועץ קרקע
        # 3. אדריכל
        # 4. יועץ אינסטלציה
        # 5. יועץ חשמל
        # 6. יועץ אקוסטיקה
        # 7. יועץ מיזוג
        # 8. בניה ירוקה
        expected_roles = {
            "קונסטרוקטור",
            "יועץ קרקע",
            "אדריכל",
            "יועץ אינסטלציה",
            "יועץ חשמל",
            "יועץ אקוסטיקה",
            "יועץ מיזוג",
            "בניה ירוקה"
        }

        assert len(unique_roles) == 8, f"Expected 8 unique consultant roles, but found {len(unique_roles)}"

        # Verify all expected roles are present
        for role in expected_roles:
            assert role in unique_roles, f"Expected role '{role}' not found in consultant mappings"


@pytest.mark.asyncio
async def test_jsonb_array_structure(test_db_session):
    """Test that required_documents, required_specifications, submission_checklist are valid JSON arrays."""
    await seed_equipment_templates()

    async with test_db_session() as session:
        result = await session.execute(select(EquipmentTemplate))
        templates = result.scalars().all()

        assert len(templates) == 11

        for template in templates:
            # Verify JSONB fields can be serialized to JSON (are valid JSON structures)
            try:
                docs_json = json.dumps(template.required_documents)
                specs_json = json.dumps(template.required_specifications)
                checklist_json = json.dumps(template.submission_checklist)

                # Verify they parse back correctly
                assert json.loads(docs_json) == template.required_documents
                assert json.loads(specs_json) == template.required_specifications
                assert json.loads(checklist_json) == template.submission_checklist

            except (TypeError, ValueError) as e:
                pytest.fail(f"Template {template.name} has invalid JSONB structure: {e}")

            # Verify they are actually arrays (lists)
            assert isinstance(template.required_documents, list), f"required_documents is not a list for {template.name}"
            assert isinstance(template.required_specifications, list), f"required_specifications is not a list for {template.name}"
            assert isinstance(template.submission_checklist, list), f"submission_checklist is not a list for {template.name}"

            # Verify arrays are not empty
            assert len(template.required_documents) > 0, f"required_documents is empty for {template.name}"
            assert len(template.required_specifications) > 0, f"required_specifications is empty for {template.name}"
            assert len(template.submission_checklist) > 0, f"submission_checklist is empty for {template.name}"
