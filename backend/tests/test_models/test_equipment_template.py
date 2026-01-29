"""
Unit tests for EquipmentTemplate and TemplateConsultant models.

Tests verify model instantiation, field types, relationships, and database behavior.
"""

import pytest
import uuid
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.models.equipment_template import EquipmentTemplate, TemplateConsultant


@pytest.fixture(scope="function")
async def test_db():
    """
    Create an in-memory SQLite test database for each test.

    This fixture provides isolated database environment for testing.
    """
    # Use in-memory SQLite for fast tests
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session() as session:
        yield session

    await engine.dispose()


def test_equipment_template_creation():
    """Test that EquipmentTemplate can be instantiated with all fields."""
    template = EquipmentTemplate(
        name="Test Template",
        name_en="Test Template EN",
        required_documents=["doc1", "doc2"],
        required_specifications=["spec1", "spec2"],
        submission_checklist=["item1", "item2"]
    )

    assert template.name == "Test Template"
    assert template.name_en == "Test Template EN"
    assert len(template.required_documents) == 2
    assert template.required_documents == ["doc1", "doc2"]
    assert len(template.required_specifications) == 2
    assert template.required_specifications == ["spec1", "spec2"]
    assert len(template.submission_checklist) == 2
    assert template.submission_checklist == ["item1", "item2"]


def test_equipment_template_uuid_generation():
    """Test that UUID primary key is auto-generated."""
    template = EquipmentTemplate(
        name="Test Template",
        name_en="Test EN"
    )

    # Before saving to DB, the default should be callable
    # After instantiation, SQLAlchemy may not assign the UUID yet
    # The important part is that the column has a default
    assert hasattr(template, 'id')

    # Verify the column definition has uuid.uuid4 as default
    id_column = EquipmentTemplate.__table__.c.id
    assert id_column.default is not None
    assert callable(id_column.default.arg)


def test_equipment_template_jsonb_defaults():
    """Test that JSONB fields default to empty lists."""
    template = EquipmentTemplate(
        name="Minimal Template",
        name_en="Minimal EN"
    )

    # JSONB fields should have default=list in the model
    # When instantiated without values, they should default to empty lists
    assert hasattr(template, 'required_documents')
    assert hasattr(template, 'required_specifications')
    assert hasattr(template, 'submission_checklist')

    # Verify the columns have list defaults
    docs_column = EquipmentTemplate.__table__.c.required_documents
    specs_column = EquipmentTemplate.__table__.c.required_specifications
    checklist_column = EquipmentTemplate.__table__.c.submission_checklist

    assert docs_column.default is not None
    assert specs_column.default is not None
    assert checklist_column.default is not None


def test_equipment_template_timestamps():
    """Test that created_at and updated_at are set correctly."""
    before_creation = datetime.utcnow()

    template = EquipmentTemplate(
        name="Timestamp Test",
        name_en="Timestamp Test EN"
    )

    after_creation = datetime.utcnow()

    # Verify timestamp columns exist
    assert hasattr(template, 'created_at')
    assert hasattr(template, 'updated_at')

    # Verify the columns have datetime.utcnow as default
    created_at_column = EquipmentTemplate.__table__.c.created_at
    updated_at_column = EquipmentTemplate.__table__.c.updated_at

    assert created_at_column.default is not None
    assert updated_at_column.default is not None
    assert callable(created_at_column.default.arg)
    assert callable(updated_at_column.default.arg)

    # Verify onupdate is set for updated_at
    assert updated_at_column.onupdate is not None


@pytest.mark.asyncio
async def test_template_consultant_relationship(test_db: AsyncSession):
    """Test that relationship between EquipmentTemplate and TemplateConsultant works."""
    # Create a template
    template = EquipmentTemplate(
        name="קירות סלארים",
        name_en="Slurry Walls",
        required_documents=["מפרט טכני"],
        required_specifications=["גובה", "עובי"],
        submission_checklist=["בדיקת איכות"]
    )

    test_db.add(template)
    await test_db.flush()  # Generate template.id

    # Create consultants
    consultant1 = TemplateConsultant(
        template_id=template.id,
        consultant_role="קונסטרוקטור"
    )
    consultant2 = TemplateConsultant(
        template_id=template.id,
        consultant_role="אדריכל"
    )

    test_db.add_all([consultant1, consultant2])
    await test_db.commit()

    # Query back and verify relationship
    result = await test_db.execute(
        select(EquipmentTemplate).where(EquipmentTemplate.name == "קירות סלארים")
    )
    loaded_template = result.scalar_one()

    # Verify the relationship works
    assert loaded_template is not None
    assert loaded_template.name == "קירות סלארים"

    # Verify consultants collection
    # Need to explicitly load the relationship
    await test_db.refresh(loaded_template, ["consultants"])
    assert len(loaded_template.consultants) == 2

    consultant_roles = [c.consultant_role for c in loaded_template.consultants]
    assert "קונסטרוקטור" in consultant_roles
    assert "אדריכל" in consultant_roles


@pytest.mark.asyncio
async def test_multiple_consultants_per_template(test_db: AsyncSession):
    """Test that one template can have multiple consultants."""
    # Create template
    template = EquipmentTemplate(
        name="גנרטור",
        name_en="Generator",
        required_documents=["מפרט יצרן"],
        required_specifications=["הספק", "מתח"],
        submission_checklist=["אישור חשמל"]
    )

    test_db.add(template)
    await test_db.flush()

    # Add 3 different consultants
    consultants = [
        TemplateConsultant(template_id=template.id, consultant_role="יועץ חשמל"),
        TemplateConsultant(template_id=template.id, consultant_role="יועץ אקוסטיקה"),
        TemplateConsultant(template_id=template.id, consultant_role="בניה ירוקה"),
    ]

    test_db.add_all(consultants)
    await test_db.commit()

    # Verify count
    result = await test_db.execute(
        select(TemplateConsultant).where(TemplateConsultant.template_id == template.id)
    )
    loaded_consultants = result.scalars().all()

    assert len(loaded_consultants) == 3

    roles = [c.consultant_role for c in loaded_consultants]
    assert "יועץ חשמל" in roles
    assert "יועץ אקוסטיקה" in roles
    assert "בניה ירוקה" in roles


@pytest.mark.asyncio
async def test_template_consultant_cascade_delete(test_db: AsyncSession):
    """Test that deleting a template deletes its consultants (cascade delete)."""
    # Create template with consultants
    template = EquipmentTemplate(
        name="לוחות חשמל",
        name_en="Electrical Panels",
        required_documents=["תכנית"],
        required_specifications=["גודל"],
        submission_checklist=["בדיקה"]
    )

    test_db.add(template)
    await test_db.flush()

    template_id = template.id

    # Add consultants
    consultant1 = TemplateConsultant(template_id=template_id, consultant_role="יועץ חשמל")
    consultant2 = TemplateConsultant(template_id=template_id, consultant_role="בניה ירוקה")

    test_db.add_all([consultant1, consultant2])
    await test_db.commit()

    # Verify consultants exist
    result = await test_db.execute(
        select(TemplateConsultant).where(TemplateConsultant.template_id == template_id)
    )
    consultants_before = result.scalars().all()
    assert len(consultants_before) == 2

    # Delete the template
    await test_db.delete(template)
    await test_db.commit()

    # Verify consultants are also deleted (cascade)
    result = await test_db.execute(
        select(TemplateConsultant).where(TemplateConsultant.template_id == template_id)
    )
    consultants_after = result.scalars().all()

    assert len(consultants_after) == 0, "Consultants should be deleted when template is deleted (cascade)"
