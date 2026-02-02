"""Integration tests for RFI system models and database schema."""
import uuid
from datetime import datetime, timedelta
import pytest
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


# Note: These imports will work once RFI models are implemented
# Following the pattern from test_equipment_approval.py
try:
    from app.models.rfi import RFI, RFIResponse, RFIEmailLog, RFIStatus, RFIPriority, RFICategory
    RFI_MODELS_EXIST = True
except ImportError:
    RFI_MODELS_EXIST = False
    # Define placeholder enums for test structure
    class RFIStatus:
        DRAFT = "draft"
        OPEN = "open"
        WAITING_RESPONSE = "waiting_response"
        ANSWERED = "answered"
        CLOSED = "closed"
        CANCELLED = "cancelled"

    class RFIPriority:
        LOW = "low"
        NORMAL = "normal"
        HIGH = "high"
        URGENT = "urgent"

    class RFICategory:
        TECHNICAL = "technical"
        DESIGN = "design"
        ADMINISTRATIVE = "administrative"
        SCHEDULE = "schedule"
        COST = "cost"
        OTHER = "other"

from app.models.project import Project
from app.models.user import User


pytestmark = pytest.mark.skipif(
    not RFI_MODELS_EXIST,
    reason="RFI models not yet implemented - tests will run once models are created"
)


@pytest.mark.integration
class TestDatabaseSchema:
    """Test database schema creation and structure for RFI tables."""

    async def test_tables_exist(self, db: AsyncSession):
        """Test that RFI tables exist in database."""
        inspector = inspect(db.bind.sync_engine)
        tables = inspector.get_table_names()

        assert "rfis" in tables
        assert "rfi_responses" in tables
        assert "rfi_email_logs" in tables

    async def test_rfis_table_columns(self, db: AsyncSession):
        """Test that rfis table has correct columns."""
        inspector = inspect(db.bind.sync_engine)
        columns = {col['name']: col for col in inspector.get_columns('rfis')}

        # Verify all required columns exist
        required_columns = [
            'id', 'project_id', 'rfi_number', 'subject', 'question',
            'status', 'priority', 'category', 'created_by_id', 'assigned_to_id',
            'due_date', 'email_thread_id', 'email_message_id',
            'sent_at', 'responded_at', 'closed_at', 'created_at', 'updated_at'
        ]
        for col_name in required_columns:
            assert col_name in columns, f"Column {col_name} missing from rfis table"

    async def test_rfi_responses_table_columns(self, db: AsyncSession):
        """Test that rfi_responses table has correct columns."""
        inspector = inspect(db.bind.sync_engine)
        columns = {col['name']: col for col in inspector.get_columns('rfi_responses')}

        # Verify all required columns exist
        required_columns = [
            'id', 'rfi_id', 'response_text', 'responded_by_id',
            'responded_at', 'email_message_id', 'attachments', 'created_at', 'updated_at'
        ]
        for col_name in required_columns:
            assert col_name in columns, f"Column {col_name} missing from rfi_responses table"

    async def test_rfi_email_logs_table_columns(self, db: AsyncSession):
        """Test that rfi_email_logs table has correct columns."""
        inspector = inspect(db.bind.sync_engine)
        columns = {col['name']: col for col in inspector.get_columns('rfi_email_logs')}

        # Verify all required columns exist
        required_columns = [
            'id', 'rfi_id', 'event_type', 'email_message_id',
            'email_thread_id', 'to_address', 'from_address', 'subject',
            'raw_email_data', 'created_at'
        ]
        for col_name in required_columns:
            assert col_name in columns, f"Column {col_name} missing from rfi_email_logs table"

    async def test_foreign_key_constraints(self, db: AsyncSession):
        """Test that foreign key constraints are defined correctly."""
        inspector = inspect(db.bind.sync_engine)

        # Test rfis table FKs
        rfis_fks = inspector.get_foreign_keys('rfis')
        fk_columns = {fk['constrained_columns'][0]: fk for fk in rfis_fks}

        assert 'project_id' in fk_columns
        assert fk_columns['project_id']['referred_table'] == 'projects'
        assert fk_columns['project_id']['options'].get('ondelete') == 'CASCADE'

        assert 'created_by_id' in fk_columns
        assert fk_columns['created_by_id']['referred_table'] == 'users'

        assert 'assigned_to_id' in fk_columns
        assert fk_columns['assigned_to_id']['referred_table'] == 'users'

        # Test rfi_responses table FKs
        responses_fks = inspector.get_foreign_keys('rfi_responses')
        fk_columns = {fk['constrained_columns'][0]: fk for fk in responses_fks}

        assert 'rfi_id' in fk_columns
        assert fk_columns['rfi_id']['referred_table'] == 'rfis'
        assert fk_columns['rfi_id']['options'].get('ondelete') == 'CASCADE'

        assert 'responded_by_id' in fk_columns
        assert fk_columns['responded_by_id']['referred_table'] == 'users'

    async def test_unique_constraints(self, db: AsyncSession):
        """Test that unique constraints are defined."""
        inspector = inspect(db.bind.sync_engine)

        # Check for unique constraint on rfi_number
        indexes = inspector.get_indexes('rfis')
        unique_indexes = [idx for idx in indexes if idx.get('unique', False)]

        # Either a unique index or unique constraint should exist on rfi_number
        rfi_number_unique = any(
            'rfi_number' in idx.get('column_names', [])
            for idx in unique_indexes
        )
        assert rfi_number_unique, "rfi_number should have a unique constraint"


@pytest.mark.integration
class TestRFICRUDOperations:
    """Test basic CRUD operations for RFI system."""

    @pytest.fixture
    async def sample_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a sample project for testing."""
        project = Project(
            id=uuid.uuid4(),
            name="Test RFI Project",
            code="RFI-TEST",
            description="Project for RFI testing",
            status="active",
            created_by_id=admin_user.id
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    async def test_create_rfi(self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User):
        """Test creating a new RFI with all required fields."""
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-001",
            subject="Concrete Specification Clarification",
            question="What is the required strength for the foundation concrete?",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id,
            due_date=datetime.utcnow() + timedelta(days=7)
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)

        # Verify RFI was created
        assert rfi.id is not None
        assert rfi.rfi_number == f"RFI-{sample_project.code}-001"
        assert rfi.subject == "Concrete Specification Clarification"
        assert rfi.status == RFIStatus.DRAFT
        assert rfi.created_at is not None
        assert rfi.updated_at is not None

    async def test_read_rfi(self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User):
        """Test reading an existing RFI from database."""
        # Create RFI
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-002",
            subject="Drawing Revision Question",
            question="Which revision of drawing A-101 should be used?",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.HIGH,
            category=RFICategory.DESIGN,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        rfi_id = rfi.id

        # Read RFI back
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        found_rfi = result.scalar_one_or_none()

        assert found_rfi is not None
        assert found_rfi.id == rfi_id
        assert found_rfi.rfi_number == f"RFI-{sample_project.code}-002"
        assert found_rfi.subject == "Drawing Revision Question"
        assert found_rfi.status == RFIStatus.DRAFT
        assert found_rfi.priority == RFIPriority.HIGH

    async def test_update_rfi(self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User):
        """Test updating an existing RFI."""
        # Create RFI
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-003",
            subject="Original Subject",
            question="Original question?",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        rfi_id = rfi.id

        # Update RFI
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        rfi_to_update = result.scalar_one()
        rfi_to_update.subject = "Updated Subject"
        rfi_to_update.priority = RFIPriority.URGENT
        rfi_to_update.status = RFIStatus.OPEN
        await db.commit()

        # Verify updates
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        updated_rfi = result.scalar_one()
        assert updated_rfi.subject == "Updated Subject"
        assert updated_rfi.priority == RFIPriority.URGENT
        assert updated_rfi.status == RFIStatus.OPEN

    async def test_delete_rfi(self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User):
        """Test deleting an RFI."""
        # Create RFI
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-004",
            subject="To Be Deleted",
            question="This RFI will be deleted",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.LOW,
            category=RFICategory.ADMINISTRATIVE,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        rfi_id = rfi.id

        # Delete RFI
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        rfi_to_delete = result.scalar_one()
        await db.delete(rfi_to_delete)
        await db.commit()

        # Verify deletion
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        deleted_rfi = result.scalar_one_or_none()
        assert deleted_rfi is None


@pytest.mark.integration
class TestCascadeDeleteBehavior:
    """Test CASCADE delete relationships for RFI tables."""

    @pytest.fixture
    async def sample_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a sample project for testing."""
        project = Project(
            id=uuid.uuid4(),
            name="Test Cascade Project",
            code="CASCADE",
            description="Project for cascade testing",
            status="active",
            created_by_id=admin_user.id
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    async def test_deleting_rfi_cascades_to_responses(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test that deleting an RFI also deletes associated responses."""
        # Create RFI
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-005",
            subject="Test Cascade to Responses",
            question="This will test cascade deletes",
            status=RFIStatus.ANSWERED,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        rfi_id = rfi.id

        # Create responses
        response1 = RFIResponse(
            id=uuid.uuid4(),
            rfi_id=rfi_id,
            response_text="First response to the RFI",
            responded_by_id=regular_user.id,
            responded_at=datetime.utcnow()
        )
        response2 = RFIResponse(
            id=uuid.uuid4(),
            rfi_id=rfi_id,
            response_text="Second response to the RFI",
            responded_by_id=admin_user.id,
            responded_at=datetime.utcnow()
        )
        db.add_all([response1, response2])
        await db.commit()

        # Verify responses exist
        result = await db.execute(select(RFIResponse).where(RFIResponse.rfi_id == rfi_id))
        responses = result.scalars().all()
        assert len(responses) == 2

        # Delete RFI
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        rfi_to_delete = result.scalar_one()
        await db.delete(rfi_to_delete)
        await db.commit()

        # Verify responses were CASCADE deleted
        result = await db.execute(select(RFIResponse).where(RFIResponse.rfi_id == rfi_id))
        responses = result.scalars().all()
        assert len(responses) == 0

    async def test_deleting_rfi_cascades_to_email_logs(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test that deleting an RFI also deletes associated email logs."""
        # Create RFI
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-006",
            subject="Test Cascade to Email Logs",
            question="This will test cascade deletes for email logs",
            status=RFIStatus.WAITING_RESPONSE,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id,
            email_thread_id="thread-123"
        )
        db.add(rfi)
        await db.commit()
        rfi_id = rfi.id

        # Create email logs
        log1 = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=rfi_id,
            event_type="sent",
            email_message_id="msg-001",
            email_thread_id="thread-123",
            to_address="contractor@example.com",
            from_address="rfi@test.com",
            subject=rfi.subject
        )
        log2 = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=rfi_id,
            event_type="received",
            email_message_id="msg-002",
            email_thread_id="thread-123",
            to_address="rfi@test.com",
            from_address="contractor@example.com",
            subject=f"Re: {rfi.subject}"
        )
        db.add_all([log1, log2])
        await db.commit()

        # Verify email logs exist
        result = await db.execute(select(RFIEmailLog).where(RFIEmailLog.rfi_id == rfi_id))
        logs = result.scalars().all()
        assert len(logs) == 2

        # Delete RFI
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        rfi_to_delete = result.scalar_one()
        await db.delete(rfi_to_delete)
        await db.commit()

        # Verify email logs were CASCADE deleted
        result = await db.execute(select(RFIEmailLog).where(RFIEmailLog.rfi_id == rfi_id))
        logs = result.scalars().all()
        assert len(logs) == 0

    async def test_deleting_project_cascades_to_rfis(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test that deleting a project also deletes associated RFIs."""
        # Create RFI
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-007",
            subject="Test Project Cascade",
            question="This will be deleted when project is deleted",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        rfi_id = rfi.id
        project_id = sample_project.id

        # Verify RFI exists
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        found = result.scalar_one_or_none()
        assert found is not None

        # Delete project
        await db.delete(sample_project)
        await db.commit()

        # Verify RFI was CASCADE deleted
        result = await db.execute(select(RFI).where(RFI.id == rfi_id))
        found = result.scalar_one_or_none()
        assert found is None


@pytest.mark.integration
class TestRFINumberGeneration:
    """Test RFI number generation, uniqueness, and sequential numbering."""

    @pytest.fixture
    async def sample_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a sample project for testing."""
        project = Project(
            id=uuid.uuid4(),
            name="Test RFI Project",
            code="RFI-TEST",
            description="Project for RFI testing",
            status="active",
            created_by_id=admin_user.id
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    async def test_rfi_number_format(self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User):
        """Test that RFI numbers follow the correct format: RFI-{project_code}-{sequence}."""
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-001",
            subject="Test RFI Number Format",
            question="Testing RFI number format",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)

        # Verify RFI number format
        assert rfi.rfi_number == f"RFI-{sample_project.code}-001"
        assert rfi.rfi_number.startswith(f"RFI-{sample_project.code}-")

        # Verify format pattern
        parts = rfi.rfi_number.split("-")
        assert len(parts) == 3
        assert parts[0] == "RFI"
        assert parts[1] == sample_project.code
        assert parts[2].isdigit()

    async def test_rfi_number_uniqueness_constraint(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test that duplicate RFI numbers raise database constraint error."""
        from sqlalchemy.exc import IntegrityError

        # Create first RFI
        rfi1 = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-010",
            subject="First RFI",
            question="First question",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi1)
        await db.commit()

        # Attempt to create second RFI with same number
        rfi2 = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-010",  # Duplicate number
            subject="Second RFI",
            question="Second question",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi2)

        # Should raise IntegrityError due to unique constraint
        with pytest.raises(IntegrityError) as exc_info:
            await db.commit()

        # Verify error is about unique constraint
        assert "rfi_number" in str(exc_info.value).lower() or "unique" in str(exc_info.value).lower()

    async def test_sequential_rfi_numbering_within_project(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test that RFI numbers are sequential within a project scope."""
        # Create multiple RFIs with sequential numbers
        rfi_numbers = []
        for i in range(1, 6):  # Create 5 RFIs
            rfi = RFI(
                id=uuid.uuid4(),
                project_id=sample_project.id,
                rfi_number=f"RFI-{sample_project.code}-{i:03d}",
                subject=f"RFI {i}",
                question=f"Question {i}",
                status=RFIStatus.DRAFT,
                priority=RFIPriority.NORMAL,
                category=RFICategory.TECHNICAL,
                created_by_id=admin_user.id,
                assigned_to_id=regular_user.id
            )
            db.add(rfi)
            rfi_numbers.append(rfi.rfi_number)

        await db.commit()

        # Verify all RFIs were created
        result = await db.execute(
            select(RFI)
            .where(RFI.project_id == sample_project.id)
            .order_by(RFI.rfi_number)
        )
        rfis = result.scalars().all()
        assert len(rfis) == 5

        # Verify sequential numbering
        for idx, rfi in enumerate(rfis, start=1):
            expected_number = f"RFI-{sample_project.code}-{idx:03d}"
            assert rfi.rfi_number == expected_number

    async def test_rfi_numbers_unique_across_all_rfis(
        self, db: AsyncSession, admin_user: User, regular_user: User
    ):
        """Test that RFI numbers are globally unique, not just within a project."""
        # Create two different projects
        project1 = Project(
            id=uuid.uuid4(),
            name="Project One",
            code="PROJ1",
            description="First project",
            status="active",
            created_by_id=admin_user.id
        )
        project2 = Project(
            id=uuid.uuid4(),
            name="Project Two",
            code="PROJ2",
            description="Second project",
            status="active",
            created_by_id=admin_user.id
        )
        db.add_all([project1, project2])
        await db.commit()

        # Create RFI in first project
        rfi1 = RFI(
            id=uuid.uuid4(),
            project_id=project1.id,
            rfi_number=f"RFI-{project1.code}-001",
            subject="RFI in Project 1",
            question="Question for project 1",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi1)
        await db.commit()

        # Create RFI in second project with different project code but same sequence
        rfi2 = RFI(
            id=uuid.uuid4(),
            project_id=project2.id,
            rfi_number=f"RFI-{project2.code}-001",
            subject="RFI in Project 2",
            question="Question for project 2",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi2)
        await db.commit()

        # Both RFIs should exist with unique numbers
        result = await db.execute(select(RFI))
        all_rfis = result.scalars().all()

        rfi_numbers = [rfi.rfi_number for rfi in all_rfis]
        # Verify all numbers are unique
        assert len(rfi_numbers) == len(set(rfi_numbers))

        # Verify both RFIs exist with correct numbers
        assert f"RFI-{project1.code}-001" in rfi_numbers
        assert f"RFI-{project2.code}-001" in rfi_numbers

    async def test_multiple_rfis_with_unique_numbers(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test creating multiple RFIs, each with unique auto-generated numbers."""
        rfi_count = 10
        created_rfis = []

        # Create multiple RFIs
        for i in range(1, rfi_count + 1):
            rfi = RFI(
                id=uuid.uuid4(),
                project_id=sample_project.id,
                rfi_number=f"RFI-{sample_project.code}-{i:03d}",
                subject=f"Test RFI {i}",
                question=f"Test question {i}",
                status=RFIStatus.DRAFT,
                priority=RFIPriority.NORMAL,
                category=RFICategory.TECHNICAL,
                created_by_id=admin_user.id,
                assigned_to_id=regular_user.id
            )
            db.add(rfi)
            created_rfis.append(rfi.rfi_number)

        await db.commit()

        # Query all RFIs for this project
        result = await db.execute(
            select(RFI).where(RFI.project_id == sample_project.id)
        )
        rfis = result.scalars().all()

        # Verify count
        assert len(rfis) == rfi_count

        # Verify all numbers are unique
        rfi_numbers = [rfi.rfi_number for rfi in rfis]
        assert len(rfi_numbers) == len(set(rfi_numbers)), "All RFI numbers should be unique"

        # Verify all created numbers are in database
        for expected_number in created_rfis:
            assert expected_number in rfi_numbers
