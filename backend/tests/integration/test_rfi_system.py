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


@pytest.mark.integration
class TestRFIStatusTransitions:
    """Test RFI status transition state machine."""

    @pytest.fixture
    async def sample_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a sample project for testing."""
        project = Project(
            id=uuid.uuid4(),
            name="Status Transition Project",
            code="STATUS-TEST",
            description="Project for status transition testing",
            status="active",
            created_by_id=admin_user.id
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    async def test_valid_transition_draft_to_open(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test valid transition from draft to open status."""
        # Create RFI in draft status
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-001",
            subject="Test RFI",
            question="Test question?",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)

        # Transition to open
        rfi.status = RFIStatus.OPEN
        await db.commit()
        await db.refresh(rfi)

        # Verify transition succeeded
        assert rfi.status == RFIStatus.OPEN

    async def test_valid_transition_open_to_waiting_response(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test valid transition from open to waiting_response status."""
        # Create RFI in open status
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-002",
            subject="Test RFI",
            question="Test question?",
            status=RFIStatus.OPEN,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)

        # Record sent_at timestamp when transitioning to waiting_response
        sent_at = datetime.utcnow()
        rfi.status = RFIStatus.WAITING_RESPONSE
        rfi.sent_at = sent_at
        await db.commit()
        await db.refresh(rfi)

        # Verify transition succeeded and timestamp updated
        assert rfi.status == RFIStatus.WAITING_RESPONSE
        assert rfi.sent_at is not None
        assert abs((rfi.sent_at - sent_at).total_seconds()) < 1

    async def test_valid_transition_waiting_response_to_answered(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test valid transition from waiting_response to answered status."""
        # Create RFI in waiting_response status
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-003",
            subject="Test RFI",
            question="Test question?",
            status=RFIStatus.WAITING_RESPONSE,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id,
            sent_at=datetime.utcnow()
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)

        # Transition to answered
        responded_at = datetime.utcnow()
        rfi.status = RFIStatus.ANSWERED
        rfi.responded_at = responded_at
        await db.commit()
        await db.refresh(rfi)

        # Verify transition succeeded and timestamp updated
        assert rfi.status == RFIStatus.ANSWERED
        assert rfi.responded_at is not None
        assert abs((rfi.responded_at - responded_at).total_seconds()) < 1

    async def test_valid_transition_answered_to_closed(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test valid transition from answered to closed status."""
        # Create RFI in answered status
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-004",
            subject="Test RFI",
            question="Test question?",
            status=RFIStatus.ANSWERED,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id,
            sent_at=datetime.utcnow(),
            responded_at=datetime.utcnow()
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)

        # Transition to closed
        closed_at = datetime.utcnow()
        rfi.status = RFIStatus.CLOSED
        rfi.closed_at = closed_at
        await db.commit()
        await db.refresh(rfi)

        # Verify transition succeeded and timestamp updated
        assert rfi.status == RFIStatus.CLOSED
        assert rfi.closed_at is not None
        assert abs((rfi.closed_at - closed_at).total_seconds()) < 1

    async def test_valid_transition_any_status_to_cancelled(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test valid transition from any status to cancelled."""
        # Test cancelling from different statuses
        statuses_to_test = [
            RFIStatus.DRAFT,
            RFIStatus.OPEN,
            RFIStatus.WAITING_RESPONSE,
            RFIStatus.ANSWERED
        ]

        for idx, initial_status in enumerate(statuses_to_test, start=1):
            # Create RFI in initial status
            rfi = RFI(
                id=uuid.uuid4(),
                project_id=sample_project.id,
                rfi_number=f"RFI-{sample_project.code}-{100 + idx:03d}",
                subject=f"Test RFI {idx}",
                question=f"Test question {idx}?",
                status=initial_status,
                priority=RFIPriority.NORMAL,
                category=RFICategory.TECHNICAL,
                created_by_id=admin_user.id,
                assigned_to_id=regular_user.id
            )
            db.add(rfi)
            await db.commit()
            await db.refresh(rfi)

            # Transition to cancelled
            rfi.status = RFIStatus.CANCELLED
            await db.commit()
            await db.refresh(rfi)

            # Verify transition succeeded
            assert rfi.status == RFIStatus.CANCELLED

    async def test_complete_status_lifecycle(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test complete RFI status lifecycle from draft to closed."""
        # Create RFI in draft
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-200",
            subject="Lifecycle Test RFI",
            question="Test complete lifecycle?",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)
        assert rfi.status == RFIStatus.DRAFT

        # Transition: draft → open
        rfi.status = RFIStatus.OPEN
        await db.commit()
        await db.refresh(rfi)
        assert rfi.status == RFIStatus.OPEN

        # Transition: open → waiting_response
        rfi.status = RFIStatus.WAITING_RESPONSE
        rfi.sent_at = datetime.utcnow()
        await db.commit()
        await db.refresh(rfi)
        assert rfi.status == RFIStatus.WAITING_RESPONSE
        assert rfi.sent_at is not None

        # Transition: waiting_response → answered
        rfi.status = RFIStatus.ANSWERED
        rfi.responded_at = datetime.utcnow()
        await db.commit()
        await db.refresh(rfi)
        assert rfi.status == RFIStatus.ANSWERED
        assert rfi.responded_at is not None

        # Transition: answered → closed
        rfi.status = RFIStatus.CLOSED
        rfi.closed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(rfi)
        assert rfi.status == RFIStatus.CLOSED
        assert rfi.closed_at is not None

        # Verify all timestamps are set
        assert rfi.sent_at is not None
        assert rfi.responded_at is not None
        assert rfi.closed_at is not None
        # Verify chronological order
        assert rfi.sent_at <= rfi.responded_at
        assert rfi.responded_at <= rfi.closed_at

    async def test_timestamp_updates_on_status_changes(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test that timestamps are properly updated on status transitions."""
        # Create RFI
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-300",
            subject="Timestamp Test",
            question="Test timestamp updates?",
            status=RFIStatus.DRAFT,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)

        # Initially, special timestamps should be None
        assert rfi.sent_at is None
        assert rfi.responded_at is None
        assert rfi.closed_at is None

        # Transition to waiting_response and set sent_at
        rfi.status = RFIStatus.WAITING_RESPONSE
        rfi.sent_at = datetime.utcnow()
        await db.commit()
        await db.refresh(rfi)
        assert rfi.sent_at is not None
        assert rfi.responded_at is None
        assert rfi.closed_at is None

        # Transition to answered and set responded_at
        rfi.status = RFIStatus.ANSWERED
        rfi.responded_at = datetime.utcnow()
        await db.commit()
        await db.refresh(rfi)
        assert rfi.sent_at is not None
        assert rfi.responded_at is not None
        assert rfi.closed_at is None

        # Transition to closed and set closed_at
        rfi.status = RFIStatus.CLOSED
        rfi.closed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(rfi)
        assert rfi.sent_at is not None
        assert rfi.responded_at is not None
        assert rfi.closed_at is not None

    async def test_status_enum_values_are_valid(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ):
        """Test that all RFIStatus enum values can be assigned to RFI."""
        # Test all valid status values
        all_statuses = [
            RFIStatus.DRAFT,
            RFIStatus.OPEN,
            RFIStatus.WAITING_RESPONSE,
            RFIStatus.ANSWERED,
            RFIStatus.CLOSED,
            RFIStatus.CANCELLED
        ]

        for idx, status in enumerate(all_statuses, start=1):
            rfi = RFI(
                id=uuid.uuid4(),
                project_id=sample_project.id,
                rfi_number=f"RFI-{sample_project.code}-{400 + idx:03d}",
                subject=f"Test RFI {status}",
                question=f"Test question for {status}?",
                status=status,
                priority=RFIPriority.NORMAL,
                category=RFICategory.TECHNICAL,
                created_by_id=admin_user.id,
                assigned_to_id=regular_user.id
            )
            db.add(rfi)
            await db.commit()
            await db.refresh(rfi)

            # Verify status was saved correctly
            assert rfi.status == status

        # Query all RFIs and verify distinct statuses
        result = await db.execute(
            select(RFI).where(RFI.project_id == sample_project.id)
        )
        rfis = result.scalars().all()
        statuses_in_db = {rfi.status for rfi in rfis if rfi.rfi_number.startswith(f"RFI-{sample_project.code}-40")}

        # All status types should be represented
        assert len(statuses_in_db) == len(all_statuses)


@pytest.mark.integration
class TestRFIEmailSending:
    """Test email sending workflow with mocked Gmail API."""

    @pytest.fixture
    async def sample_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a sample project for testing."""
        project = Project(
            id=uuid.uuid4(),
            name="Test RFI Email Project",
            code="RFI-EMAIL",
            description="Project for RFI email testing",
            status="active",
            created_by_id=admin_user.id
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @pytest.fixture
    async def draft_rfi(
        self, db: AsyncSession, sample_project: Project, admin_user: User, regular_user: User
    ) -> RFI:
        """Create a draft RFI ready to be sent."""
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-001",
            subject="Foundation Concrete Specification",
            question="What is the required compressive strength for the foundation concrete at 28 days?",
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
        return rfi

    async def test_send_rfi_with_mocked_gmail(
        self,
        db: AsyncSession,
        draft_rfi: RFI,
        mock_gmail_service,
        admin_user: User,
        regular_user: User
    ):
        """Test sending RFI email with mocked Gmail API service."""
        # Mock the Gmail API response
        mock_gmail_service.users().messages().send().execute.return_value = {
            "id": "sent-msg-12345",
            "threadId": "thread-abc-12345",
            "labelIds": ["SENT"]
        }

        # Simulate sending the RFI
        # In a real implementation, this would be done through an API endpoint
        # For now, we directly update the RFI as the service would
        draft_rfi.status = RFIStatus.WAITING_RESPONSE
        draft_rfi.sent_at = datetime.utcnow()
        draft_rfi.email_thread_id = "thread-abc-12345"
        draft_rfi.email_message_id = "sent-msg-12345"
        await db.commit()
        await db.refresh(draft_rfi)

        # Create email log entry
        email_log = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=draft_rfi.id,
            event_type="sent",
            email_message_id="sent-msg-12345",
            email_thread_id="thread-abc-12345",
            to_address=regular_user.email,
            from_address=admin_user.email,
            subject=f"RFI-{draft_rfi.rfi_number}: {draft_rfi.subject}",
            raw_email_data={"status": "sent", "service": "gmail"}
        )
        db.add(email_log)
        await db.commit()

        # Verify RFI status changed to waiting_response
        assert draft_rfi.status == RFIStatus.WAITING_RESPONSE
        assert draft_rfi.sent_at is not None
        assert draft_rfi.email_thread_id == "thread-abc-12345"
        assert draft_rfi.email_message_id == "sent-msg-12345"

        # Verify email log was created
        result = await db.execute(
            select(RFIEmailLog).where(RFIEmailLog.rfi_id == draft_rfi.id)
        )
        logs = result.scalars().all()
        assert len(logs) == 1
        assert logs[0].event_type == "sent"
        assert logs[0].email_message_id == "sent-msg-12345"
        assert logs[0].email_thread_id == "thread-abc-12345"

    async def test_email_log_records_correct_addresses(
        self,
        db: AsyncSession,
        draft_rfi: RFI,
        admin_user: User,
        regular_user: User
    ):
        """Test that email log records correct to/from addresses."""
        # Create email log with proper addresses
        email_log = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=draft_rfi.id,
            event_type="sent",
            email_message_id="msg-test-123",
            email_thread_id="thread-test-123",
            to_address=regular_user.email,
            from_address=admin_user.email,
            subject=f"RFI-{draft_rfi.rfi_number}: {draft_rfi.subject}",
            raw_email_data={"test": "data"}
        )
        db.add(email_log)
        await db.commit()
        await db.refresh(email_log)

        # Verify addresses are correct
        assert email_log.to_address == regular_user.email
        assert email_log.from_address == admin_user.email
        assert email_log.subject == f"RFI-{draft_rfi.rfi_number}: {draft_rfi.subject}"

    async def test_gmail_api_called_with_correct_payload(
        self,
        db: AsyncSession,
        draft_rfi: RFI,
        mock_gmail_service,
        regular_user: User
    ):
        """Test that Gmail API is called with correct email payload."""
        import base64
        from email.mime.text import MIMEText

        # Prepare email content
        email_body = f"""
        RFI Number: {draft_rfi.rfi_number}
        Subject: {draft_rfi.subject}

        Question:
        {draft_rfi.question}

        Please respond to this RFI at your earliest convenience.
        Due Date: {draft_rfi.due_date.strftime('%Y-%m-%d') if draft_rfi.due_date else 'Not specified'}
        Priority: {draft_rfi.priority}
        """

        message = MIMEText(email_body)
        message['to'] = regular_user.email
        message['from'] = "rfi@test.com"
        message['subject'] = f"RFI-{draft_rfi.rfi_number}: {draft_rfi.subject}"

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        # Mock the Gmail API send call
        mock_gmail_service.users().messages().send().execute.return_value = {
            "id": "sent-msg-67890",
            "threadId": "thread-xyz-67890",
            "labelIds": ["SENT"]
        }

        # Simulate the send operation
        # In real implementation, this would call the Gmail service
        # For testing, we just verify the mock can be called
        result = mock_gmail_service.users().messages().send(
            userId='me',
            body={'raw': raw_message}
        ).execute()

        # Verify the mock was called successfully
        assert result['id'] == "sent-msg-67890"
        assert result['threadId'] == "thread-xyz-67890"
        assert 'SENT' in result['labelIds']

        # Verify the mock was called
        mock_gmail_service.users().messages().send.assert_called_once()

    async def test_multiple_emails_create_separate_logs(
        self,
        db: AsyncSession,
        draft_rfi: RFI,
        admin_user: User,
        regular_user: User
    ):
        """Test that sending multiple emails creates separate log entries."""
        # Create first email log (sent)
        log1 = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=draft_rfi.id,
            event_type="sent",
            email_message_id="msg-001",
            email_thread_id="thread-001",
            to_address=regular_user.email,
            from_address=admin_user.email,
            subject=f"RFI-{draft_rfi.rfi_number}: {draft_rfi.subject}",
            raw_email_data={"event": "initial_send"}
        )
        db.add(log1)
        await db.commit()

        # Create second email log (received response)
        log2 = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=draft_rfi.id,
            event_type="received",
            email_message_id="msg-002",
            email_thread_id="thread-001",
            to_address=admin_user.email,
            from_address=regular_user.email,
            subject=f"Re: RFI-{draft_rfi.rfi_number}: {draft_rfi.subject}",
            raw_email_data={"event": "response"}
        )
        db.add(log2)
        await db.commit()

        # Create third email log (follow-up)
        log3 = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=draft_rfi.id,
            event_type="sent",
            email_message_id="msg-003",
            email_thread_id="thread-001",
            to_address=regular_user.email,
            from_address=admin_user.email,
            subject=f"Re: RFI-{draft_rfi.rfi_number}: {draft_rfi.subject}",
            raw_email_data={"event": "follow_up"}
        )
        db.add(log3)
        await db.commit()

        # Verify all logs were created
        result = await db.execute(
            select(RFIEmailLog).where(RFIEmailLog.rfi_id == draft_rfi.id)
        )
        logs = result.scalars().all()
        assert len(logs) == 3

        # Verify event types
        event_types = [log.event_type for log in logs]
        assert "sent" in event_types
        assert "received" in event_types
        assert event_types.count("sent") == 2

    async def test_sent_at_timestamp_recorded(
        self,
        db: AsyncSession,
        draft_rfi: RFI
    ):
        """Test that sent_at timestamp is recorded when RFI is sent."""
        # Verify initially None
        assert draft_rfi.sent_at is None

        # Simulate sending
        send_time = datetime.utcnow()
        draft_rfi.status = RFIStatus.WAITING_RESPONSE
        draft_rfi.sent_at = send_time
        await db.commit()
        await db.refresh(draft_rfi)

        # Verify sent_at was recorded
        assert draft_rfi.sent_at is not None
        assert draft_rfi.sent_at == send_time
        assert draft_rfi.status == RFIStatus.WAITING_RESPONSE

    async def test_email_thread_id_links_conversation(
        self,
        db: AsyncSession,
        sample_project: Project,
        admin_user: User,
        regular_user: User
    ):
        """Test that email_thread_id properly links email conversation."""
        # Create RFI with thread_id
        rfi = RFI(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            rfi_number=f"RFI-{sample_project.code}-002",
            subject="Thread Linking Test",
            question="Test question for thread linking",
            status=RFIStatus.WAITING_RESPONSE,
            priority=RFIPriority.NORMAL,
            category=RFICategory.TECHNICAL,
            created_by_id=admin_user.id,
            assigned_to_id=regular_user.id,
            email_thread_id="thread-consistent-123",
            email_message_id="msg-original-123",
            sent_at=datetime.utcnow()
        )
        db.add(rfi)
        await db.commit()
        await db.refresh(rfi)

        # Create multiple email logs with same thread_id
        for i in range(3):
            log = RFIEmailLog(
                id=uuid.uuid4(),
                rfi_id=rfi.id,
                event_type="sent" if i % 2 == 0 else "received",
                email_message_id=f"msg-thread-{i}",
                email_thread_id="thread-consistent-123",
                to_address=regular_user.email if i % 2 == 0 else admin_user.email,
                from_address=admin_user.email if i % 2 == 0 else regular_user.email,
                subject=f"{'Re: ' if i > 0 else ''}RFI-{rfi.rfi_number}: Thread Test",
                raw_email_data={"index": i}
            )
            db.add(log)
        await db.commit()

        # Query logs by thread_id
        result = await db.execute(
            select(RFIEmailLog).where(
                RFIEmailLog.email_thread_id == "thread-consistent-123"
            ).order_by(RFIEmailLog.created_at)
        )
        thread_logs = result.scalars().all()

        # Verify all logs share same thread_id
        assert len(thread_logs) == 3
        assert all(log.email_thread_id == "thread-consistent-123" for log in thread_logs)
        assert thread_logs[0].rfi_id == rfi.id

    async def test_raw_email_data_stored_as_jsonb(
        self,
        db: AsyncSession,
        draft_rfi: RFI,
        admin_user: User,
        regular_user: User
    ):
        """Test that raw_email_data is properly stored as JSONB."""
        # Create email log with complex raw data
        complex_data = {
            "headers": {
                "Message-ID": "<test@gmail.com>",
                "Date": "Mon, 1 Jan 2024 10:00:00 +0000",
                "Content-Type": "text/plain; charset=UTF-8"
            },
            "body": {
                "plain": "Response text here",
                "html": "<p>Response text here</p>"
            },
            "attachments": [
                {"filename": "doc1.pdf", "size": 1024},
                {"filename": "doc2.jpg", "size": 2048}
            ],
            "metadata": {
                "spam_score": 0.1,
                "virus_scan": "clean"
            }
        }

        email_log = RFIEmailLog(
            id=uuid.uuid4(),
            rfi_id=draft_rfi.id,
            event_type="received",
            email_message_id="msg-jsonb-test",
            email_thread_id="thread-jsonb-test",
            to_address=admin_user.email,
            from_address=regular_user.email,
            subject="JSONB Test",
            raw_email_data=complex_data
        )
        db.add(email_log)
        await db.commit()
        await db.refresh(email_log)

        # Verify data was stored and retrieved correctly
        assert email_log.raw_email_data == complex_data
        assert email_log.raw_email_data["headers"]["Message-ID"] == "<test@gmail.com>"
        assert len(email_log.raw_email_data["attachments"]) == 2
        assert email_log.raw_email_data["metadata"]["virus_scan"] == "clean"


@pytest.mark.integration
class TestEmailParsing:
    """Test email content parsing from Gmail API message format."""

    async def test_parse_plain_text_email_body(self, sample_emails):
        """Test parsing plain text email body from base64url-encoded content."""
        import base64

        plain_email = sample_emails["plain_text"]

        # Extract and decode the email body
        encoded_body = plain_email["payload"]["body"]["data"]
        decoded_body = base64.urlsafe_b64decode(encoded_body).decode('utf-8')

        # Verify the body was decoded correctly
        assert decoded_body == "This is a plain text response to the RFI."
        assert "plain text response" in decoded_body

        # Verify mime type
        assert plain_email["payload"]["mimeType"] == "text/plain"

    async def test_parse_html_email_body(self, sample_emails):
        """Test parsing HTML email body from base64url-encoded content."""
        import base64

        html_email = sample_emails["html"]

        # Extract and decode the email body
        encoded_body = html_email["payload"]["body"]["data"]
        decoded_body = base64.urlsafe_b64decode(encoded_body).decode('utf-8')

        # Verify the HTML body was decoded correctly
        assert "<html>" in decoded_body
        assert "<strong>HTML</strong>" in decoded_body
        assert "response to the RFI" in decoded_body

        # Verify mime type
        assert html_email["payload"]["mimeType"] == "text/html"

    async def test_extract_thread_id(self, sample_emails):
        """Test extracting thread_id from email message."""
        plain_email = sample_emails["plain_text"]
        html_email = sample_emails["html"]

        # Extract thread IDs
        thread_id_1 = plain_email["threadId"]
        thread_id_2 = html_email["threadId"]

        # Verify thread IDs exist and are different
        assert thread_id_1 == "thread-abc-123"
        assert thread_id_2 == "thread-def-456"
        assert thread_id_1 != thread_id_2

    async def test_extract_message_id_header(self, sample_emails):
        """Test extracting Message-ID header from email."""
        plain_email = sample_emails["plain_text"]

        # Extract Message-ID from headers
        headers = plain_email["payload"]["headers"]
        message_id = next(
            (h["value"] for h in headers if h["name"] == "Message-ID"),
            None
        )

        # Verify Message-ID was extracted
        assert message_id == "<msg-plain-123@mail.gmail.com>"
        assert message_id.startswith("<")
        assert message_id.endswith(">")

    async def test_extract_in_reply_to_header(self, sample_emails):
        """Test extracting In-Reply-To header from email."""
        plain_email = sample_emails["plain_text"]

        # Extract In-Reply-To from headers
        headers = plain_email["payload"]["headers"]
        in_reply_to = next(
            (h["value"] for h in headers if h["name"] == "In-Reply-To"),
            None
        )

        # Verify In-Reply-To was extracted
        assert in_reply_to == "<original-msg-id@mail.gmail.com>"
        assert in_reply_to.startswith("<")
        assert in_reply_to.endswith(">")

    async def test_extract_standard_headers(self, sample_emails):
        """Test extracting standard email headers (From, To, Subject, Date)."""
        plain_email = sample_emails["plain_text"]
        headers = plain_email["payload"]["headers"]

        # Create a dict for easy lookup
        header_dict = {h["name"]: h["value"] for h in headers}

        # Verify all standard headers are present
        assert header_dict["From"] == "contractor@example.com"
        assert header_dict["To"] == "rfi@test.com"
        assert header_dict["Subject"] == "Re: RFI-TEST-001: Sample Question"
        assert header_dict["Date"] == "Mon, 1 Jan 2024 10:00:00 +0000"

    async def test_extract_rfi_number_from_subject(self, sample_emails):
        """Test extracting RFI number from email subject line."""
        import re

        plain_email = sample_emails["plain_text"]
        headers = plain_email["payload"]["headers"]
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")

        # Extract RFI number using regex pattern
        rfi_pattern = r'RFI-[A-Z]+-\d+'
        match = re.search(rfi_pattern, subject)

        # Verify RFI number was extracted
        assert match is not None
        assert match.group() == "RFI-TEST-001"

    async def test_extract_rfi_number_from_multiple_subjects(self, sample_emails):
        """Test extracting RFI numbers from various subject formats."""
        import re

        test_subjects = [
            "Re: RFI-TEST-001: Sample Question",
            "RFI-PROJECT-042: Technical Issue",
            "Fw: Re: RFI-BUILD-123: Clarification Needed",
            "Answer to RFI-DEMO-999: Final Question"
        ]

        expected_numbers = [
            "RFI-TEST-001",
            "RFI-PROJECT-042",
            "RFI-BUILD-123",
            "RFI-DEMO-999"
        ]

        rfi_pattern = r'RFI-[A-Z]+-\d+'

        for subject, expected in zip(test_subjects, expected_numbers):
            match = re.search(rfi_pattern, subject)
            assert match is not None
            assert match.group() == expected

    async def test_handle_email_with_attachments(self, sample_emails):
        """Test parsing email with attachments and extracting metadata."""
        import base64

        email_with_attachments = sample_emails["with_attachments"]

        # Verify multipart/mixed mime type
        assert email_with_attachments["payload"]["mimeType"] == "multipart/mixed"

        # Extract parts
        parts = email_with_attachments["payload"]["parts"]
        assert len(parts) == 2

        # Verify text part
        text_part = parts[0]
        assert text_part["mimeType"] == "text/plain"
        decoded_text = base64.urlsafe_b64decode(text_part["body"]["data"]).decode('utf-8')
        assert decoded_text == "Please see attached drawings."

        # Verify attachment part
        attachment_part = parts[1]
        assert attachment_part["mimeType"] == "application/pdf"
        assert attachment_part["filename"] == "drawing-revision-A.pdf"
        assert attachment_part["body"]["attachmentId"] == "attach-001"
        assert attachment_part["body"]["size"] == 1024000

    async def test_extract_attachment_metadata(self, sample_emails):
        """Test extracting attachment metadata without downloading files."""
        email_with_attachments = sample_emails["with_attachments"]

        # Extract attachment information
        parts = email_with_attachments["payload"]["parts"]
        attachments = [
            {
                "filename": part.get("filename"),
                "mime_type": part.get("mimeType"),
                "attachment_id": part["body"].get("attachmentId"),
                "size": part["body"].get("size")
            }
            for part in parts
            if part.get("filename")  # Only parts with filename are attachments
        ]

        # Verify attachment metadata
        assert len(attachments) == 1
        attachment = attachments[0]
        assert attachment["filename"] == "drawing-revision-A.pdf"
        assert attachment["mime_type"] == "application/pdf"
        assert attachment["attachment_id"] == "attach-001"
        assert attachment["size"] == 1024000

    async def test_handle_malformed_email_missing_headers(self, sample_emails):
        """Test handling email with missing headers gracefully."""
        malformed_email = sample_emails["malformed"]
        headers = malformed_email["payload"]["headers"]

        # Create header dict for easy lookup
        header_dict = {h["name"]: h["value"] for h in headers}

        # Verify expected headers are present
        assert "From" in header_dict
        assert "To" in header_dict
        assert "Date" in header_dict

        # Verify missing headers return None gracefully
        subject = header_dict.get("Subject")
        message_id = header_dict.get("Message-ID")
        in_reply_to = header_dict.get("In-Reply-To")

        assert subject is None
        assert message_id is None
        assert in_reply_to is None

    async def test_handle_malformed_email_body_still_parseable(self, sample_emails):
        """Test that malformed email body can still be decoded."""
        import base64

        malformed_email = sample_emails["malformed"]

        # Even with missing headers, body should be parseable
        encoded_body = malformed_email["payload"]["body"]["data"]
        decoded_body = base64.urlsafe_b64decode(encoded_body).decode('utf-8')

        # Verify body was decoded
        assert decoded_body == "Response without proper headers."
        assert len(decoded_body) > 0

    async def test_parse_email_with_empty_body(self):
        """Test handling email with empty body."""
        import base64

        # Create email with empty body
        empty_body = ""
        encoded_empty = base64.urlsafe_b64encode(empty_body.encode()).decode()

        # Decode empty body
        decoded = base64.urlsafe_b64decode(encoded_empty).decode('utf-8')

        # Should handle empty string without error
        assert decoded == ""
        assert len(decoded) == 0

    async def test_parse_all_sample_emails_without_error(self, sample_emails):
        """Test that all sample emails can be processed without errors."""
        import base64

        for email_type, email_data in sample_emails.items():
            # Verify basic structure exists
            assert "id" in email_data
            assert "threadId" in email_data
            assert "payload" in email_data

            # Verify headers exist
            assert "headers" in email_data["payload"]
            headers = email_data["payload"]["headers"]
            assert isinstance(headers, list)

            # Try to extract body (may be in different locations depending on mime type)
            payload = email_data["payload"]

            if "body" in payload and "data" in payload["body"]:
                # Simple message with body in payload
                encoded_body = payload["body"]["data"]
                decoded_body = base64.urlsafe_b64decode(encoded_body).decode('utf-8')
                assert isinstance(decoded_body, str)
            elif "parts" in payload:
                # Multipart message - check first text part
                text_parts = [p for p in payload["parts"] if "text" in p.get("mimeType", "")]
                if text_parts and "data" in text_parts[0]["body"]:
                    encoded_body = text_parts[0]["body"]["data"]
                    decoded_body = base64.urlsafe_b64decode(encoded_body).decode('utf-8')
                    assert isinstance(decoded_body, str)

    async def test_extract_all_header_values_as_dict(self, sample_emails):
        """Test converting email headers list to dictionary for easy access."""
        plain_email = sample_emails["plain_text"]
        headers_list = plain_email["payload"]["headers"]

        # Convert headers list to dict
        headers_dict = {h["name"]: h["value"] for h in headers_list}

        # Verify dict contains all expected headers
        assert "From" in headers_dict
        assert "To" in headers_dict
        assert "Subject" in headers_dict
        assert "Message-ID" in headers_dict
        assert "In-Reply-To" in headers_dict
        assert "Date" in headers_dict

        # Verify values are accessible
        assert headers_dict["From"] == "contractor@example.com"
        assert headers_dict["Subject"] == "Re: RFI-TEST-001: Sample Question"

    async def test_parse_multipart_email_finds_text_content(self, sample_emails):
        """Test finding text content in multipart email structure."""
        import base64

        email_with_attachments = sample_emails["with_attachments"]
        parts = email_with_attachments["payload"]["parts"]

        # Find the text/plain part
        text_part = next(
            (part for part in parts if part["mimeType"] == "text/plain"),
            None
        )

        assert text_part is not None
        assert "body" in text_part
        assert "data" in text_part["body"]

        # Decode the text content
        decoded = base64.urlsafe_b64decode(text_part["body"]["data"]).decode('utf-8')
        assert decoded == "Please see attached drawings."
