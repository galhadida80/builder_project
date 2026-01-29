"""Integration tests for equipment approval models and database schema."""
import uuid
from datetime import datetime
import pytest
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from app.models.equipment_template import (
    EquipmentApprovalSubmission,
    EquipmentApprovalDecision,
    SubmissionStatus,
    DecisionType,
)
from app.models.project import Project
from app.models.user import User


@pytest.mark.integration
class TestDatabaseSchema:
    """Test database schema creation and structure."""

    def test_tables_exist(self, db_session: Session):
        """Test that equipment approval tables exist in database."""
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()

        assert "equipment_approval_submissions" in tables
        assert "equipment_approval_decisions" in tables

    def test_submissions_table_columns(self, db_session: Session):
        """Test that submissions table has correct columns."""
        inspector = inspect(db_session.bind)
        columns = {col['name']: col for col in inspector.get_columns('equipment_approval_submissions')}

        # Verify all required columns exist
        required_columns = [
            'id', 'project_id', 'template_id', 'name',
            'specifications', 'documents', 'checklist_responses', 'additional_data',
            'status', 'submitted_by_id', 'submitted_at', 'created_at', 'updated_at'
        ]
        for col_name in required_columns:
            assert col_name in columns, f"Column {col_name} missing from equipment_approval_submissions"

    def test_decisions_table_columns(self, db_session: Session):
        """Test that decisions table has correct columns matching spec."""
        inspector = inspect(db_session.bind)
        columns = {col['name']: col for col in inspector.get_columns('equipment_approval_decisions')}

        # Verify all required columns exist with CORRECT names
        required_columns = [
            'id', 'submission_id', 'consultant_type_id',
            'approver_id', 'decision', 'comments', 'decided_at'
        ]
        for col_name in required_columns:
            assert col_name in columns, f"Column {col_name} missing from equipment_approval_decisions"

        # Verify old incorrect column names are NOT present
        incorrect_columns = ['reviewer_id', 'decision_type', 'reviewer_role', 'created_at']
        for col_name in incorrect_columns:
            assert col_name not in columns, f"Incorrect column {col_name} should not exist in equipment_approval_decisions"

    def test_foreign_key_constraints(self, db_session: Session):
        """Test that foreign key constraints are defined correctly."""
        inspector = inspect(db_session.bind)

        # Test submissions table FKs
        submissions_fks = inspector.get_foreign_keys('equipment_approval_submissions')
        fk_columns = {fk['constrained_columns'][0]: fk for fk in submissions_fks}

        assert 'project_id' in fk_columns
        assert fk_columns['project_id']['referred_table'] == 'projects'
        assert fk_columns['project_id']['options'].get('ondelete') == 'CASCADE'

        assert 'submitted_by_id' in fk_columns
        assert fk_columns['submitted_by_id']['referred_table'] == 'users'

        # Test decisions table FKs
        decisions_fks = inspector.get_foreign_keys('equipment_approval_decisions')
        fk_columns = {fk['constrained_columns'][0]: fk for fk in decisions_fks}

        assert 'submission_id' in fk_columns
        assert fk_columns['submission_id']['referred_table'] == 'equipment_approval_submissions'
        assert fk_columns['submission_id']['options'].get('ondelete') == 'CASCADE'

        assert 'approver_id' in fk_columns
        assert fk_columns['approver_id']['referred_table'] == 'users'


@pytest.mark.integration
class TestCascadeDeleteBehavior:
    """Test CASCADE delete relationships."""

    @pytest.fixture
    def sample_project(self, db_session: Session):
        """Create a sample project for testing."""
        project = Project(
            id=uuid.uuid4(),
            name="Test Project",
            code="TEST001",
            status="active"
        )
        db_session.add(project)
        db_session.commit()
        return project

    @pytest.fixture
    def sample_user(self, db_session: Session):
        """Create a sample user for testing."""
        user = User(
            id=uuid.uuid4(),
            email="test@example.com",
            username="testuser",
            hashed_password="dummy_hash"
        )
        db_session.add(user)
        db_session.commit()
        return user

    def test_deleting_submission_cascades_to_decisions(self, db_session: Session, sample_project, sample_user):
        """Test that deleting a submission also deletes associated decisions."""
        # Create submission
        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            name="Test Equipment",
            status=SubmissionStatus.DRAFT.value,
            submitted_by_id=sample_user.id
        )
        db_session.add(submission)
        db_session.commit()
        submission_id = submission.id

        # Create decisions
        decision1 = EquipmentApprovalDecision(
            id=uuid.uuid4(),
            submission_id=submission_id,
            approver_id=sample_user.id,
            decision=DecisionType.APPROVED.value,
            decided_at=datetime.utcnow()
        )
        decision2 = EquipmentApprovalDecision(
            id=uuid.uuid4(),
            submission_id=submission_id,
            approver_id=sample_user.id,
            decision=DecisionType.REVISION_REQUESTED.value,
            decided_at=datetime.utcnow()
        )
        db_session.add_all([decision1, decision2])
        db_session.commit()

        # Verify decisions exist
        decisions = db_session.query(EquipmentApprovalDecision).filter_by(submission_id=submission_id).all()
        assert len(decisions) == 2

        # Delete submission
        db_session.delete(submission)
        db_session.commit()

        # Verify decisions were CASCADE deleted
        decisions = db_session.query(EquipmentApprovalDecision).filter_by(submission_id=submission_id).all()
        assert len(decisions) == 0

    def test_deleting_project_cascades_to_submissions(self, db_session: Session, sample_project, sample_user):
        """Test that deleting a project also deletes associated submissions."""
        # Create submission
        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=sample_project.id,
            name="Test Equipment",
            status=SubmissionStatus.DRAFT.value,
            submitted_by_id=sample_user.id
        )
        db_session.add(submission)
        db_session.commit()
        submission_id = submission.id
        project_id = sample_project.id

        # Verify submission exists
        found = db_session.query(EquipmentApprovalSubmission).filter_by(id=submission_id).first()
        assert found is not None

        # Delete project
        db_session.delete(sample_project)
        db_session.commit()

        # Verify submission was CASCADE deleted
        found = db_session.query(EquipmentApprovalSubmission).filter_by(id=submission_id).first()
        assert found is None


@pytest.mark.integration
class TestRelationshipLoading:
    """Test that ORM relationships work correctly."""

    @pytest.fixture
    def sample_data(self, db_session: Session):
        """Create sample data with relationships."""
        project = Project(
            id=uuid.uuid4(),
            name="Test Project",
            code="TEST002",
            status="active"
        )
        user = User(
            id=uuid.uuid4(),
            email="test2@example.com",
            username="testuser2",
            hashed_password="dummy_hash"
        )
        db_session.add_all([project, user])
        db_session.commit()

        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Test Equipment",
            status=SubmissionStatus.PENDING_REVIEW.value,
            submitted_by_id=user.id
        )
        db_session.add(submission)
        db_session.commit()

        decision = EquipmentApprovalDecision(
            id=uuid.uuid4(),
            submission_id=submission.id,
            approver_id=user.id,
            decision=DecisionType.APPROVED.value,
            decided_at=datetime.utcnow()
        )
        db_session.add(decision)
        db_session.commit()

        return {
            'project': project,
            'user': user,
            'submission': submission,
            'decision': decision
        }

    def test_submission_to_project_relationship(self, db_session: Session, sample_data):
        """Test that submission.project relationship works."""
        submission = sample_data['submission']
        db_session.refresh(submission)

        assert submission.project is not None
        assert submission.project.id == sample_data['project'].id

    def test_submission_to_user_relationship(self, db_session: Session, sample_data):
        """Test that submission.submitted_by relationship works."""
        submission = sample_data['submission']
        db_session.refresh(submission)

        assert submission.submitted_by is not None
        assert submission.submitted_by.id == sample_data['user'].id

    def test_submission_to_decisions_relationship(self, db_session: Session, sample_data):
        """Test that submission.decisions relationship works."""
        submission = sample_data['submission']
        db_session.refresh(submission)

        assert len(submission.decisions) == 1
        assert submission.decisions[0].id == sample_data['decision'].id

    def test_decision_to_submission_relationship(self, db_session: Session, sample_data):
        """Test that decision.submission relationship works."""
        decision = sample_data['decision']
        db_session.refresh(decision)

        assert decision.submission is not None
        assert decision.submission.id == sample_data['submission'].id

    def test_decision_to_approver_relationship(self, db_session: Session, sample_data):
        """Test that decision.approver relationship works."""
        decision = sample_data['decision']
        db_session.refresh(decision)

        assert decision.approver is not None
        assert decision.approver.id == sample_data['user'].id

    def test_project_to_submissions_relationship(self, db_session: Session, sample_data):
        """Test that project.equipment_approval_submissions relationship works."""
        project = sample_data['project']
        db_session.refresh(project)

        assert hasattr(project, 'equipment_approval_submissions')
        assert len(project.equipment_approval_submissions) == 1
        assert project.equipment_approval_submissions[0].id == sample_data['submission'].id


@pytest.mark.integration
class TestDataTypes:
    """Test that JSONB and UUID fields work correctly."""

    def test_jsonb_fields_accept_dict_data(self, db_session: Session):
        """Test that JSONB fields can store and retrieve dict data."""
        project = Project(id=uuid.uuid4(), name="Test", code="TEST003", status="active")
        user = User(id=uuid.uuid4(), email="test3@example.com", username="user3", hashed_password="hash")
        db_session.add_all([project, user])
        db_session.commit()

        test_data = {
            'specifications': {'weight': '100kg', 'dimensions': '2x3x4'},
            'documents': {'manual': 'doc123', 'warranty': 'doc456'},
            'checklist_responses': {'item1': True, 'item2': False},
            'additional_data': {'custom_field': 'custom_value'}
        }

        submission = EquipmentApprovalSubmission(
            id=uuid.uuid4(),
            project_id=project.id,
            name="Test Equipment",
            status=SubmissionStatus.DRAFT.value,
            submitted_by_id=user.id,
            **test_data
        )
        db_session.add(submission)
        db_session.commit()
        submission_id = submission.id

        # Retrieve and verify
        retrieved = db_session.query(EquipmentApprovalSubmission).filter_by(id=submission_id).first()
        assert retrieved.specifications == test_data['specifications']
        assert retrieved.documents == test_data['documents']
        assert retrieved.checklist_responses == test_data['checklist_responses']
        assert retrieved.additional_data == test_data['additional_data']

    def test_uuid_fields_work_correctly(self, db_session: Session):
        """Test that UUID fields store and retrieve correctly."""
        project_id = uuid.uuid4()
        user_id = uuid.uuid4()
        submission_id = uuid.uuid4()

        project = Project(id=project_id, name="Test", code="TEST004", status="active")
        user = User(id=user_id, email="test4@example.com", username="user4", hashed_password="hash")
        db_session.add_all([project, user])
        db_session.commit()

        submission = EquipmentApprovalSubmission(
            id=submission_id,
            project_id=project_id,
            name="Test Equipment",
            status=SubmissionStatus.DRAFT.value,
            submitted_by_id=user_id
        )
        db_session.add(submission)
        db_session.commit()

        # Retrieve and verify UUIDs match
        retrieved = db_session.query(EquipmentApprovalSubmission).filter_by(id=submission_id).first()
        assert retrieved.id == submission_id
        assert retrieved.project_id == project_id
        assert retrieved.submitted_by_id == user_id
        assert isinstance(retrieved.id, uuid.UUID)
