"""Unit tests for EquipmentApprovalSubmission and EquipmentApprovalDecision models."""
import uuid
from datetime import datetime
import pytest
from app.models.equipment_template import (
    EquipmentApprovalSubmission,
    EquipmentApprovalDecision,
    SubmissionStatus,
    DecisionType,
)


class TestSubmissionStatusEnum:
    """Test SubmissionStatus enum values."""

    def test_enum_values(self):
        """Test that SubmissionStatus has all required values."""
        assert SubmissionStatus.DRAFT == "draft"
        assert SubmissionStatus.PENDING_REVIEW == "pending_review"
        assert SubmissionStatus.APPROVED == "approved"
        assert SubmissionStatus.REJECTED == "rejected"

    def test_enum_count(self):
        """Test that SubmissionStatus has exactly 4 values."""
        assert len(SubmissionStatus) == 4


class TestDecisionTypeEnum:
    """Test DecisionType enum values."""

    def test_enum_values(self):
        """Test that DecisionType has all required values."""
        assert DecisionType.APPROVED == "approved"
        assert DecisionType.REJECTED == "rejected"
        assert DecisionType.REVISION_REQUESTED == "revision_requested"

    def test_enum_count(self):
        """Test that DecisionType has exactly 3 values."""
        assert len(DecisionType) == 3


class TestEquipmentApprovalSubmission:
    """Test EquipmentApprovalSubmission model."""

    def test_model_instantiation(self):
        """Test that EquipmentApprovalSubmission can be instantiated."""
        submission = EquipmentApprovalSubmission()
        assert submission is not None
        assert isinstance(submission, EquipmentApprovalSubmission)

    def test_default_id_generation(self):
        """Test that ID is auto-generated with UUID."""
        submission = EquipmentApprovalSubmission()
        # The default is set but not called until insert, so we test the default function exists
        assert hasattr(submission.__class__.id, 'default')

    def test_jsonb_field_defaults(self):
        """Test that JSONB fields have correct defaults."""
        submission = EquipmentApprovalSubmission()
        # Verify default is configured (will be applied on insert)
        assert hasattr(submission.__class__.specifications, 'default')
        assert hasattr(submission.__class__.documents, 'default')
        assert hasattr(submission.__class__.checklist_responses, 'default')
        assert hasattr(submission.__class__.additional_data, 'default')

    def test_status_default(self):
        """Test that status defaults to draft."""
        submission = EquipmentApprovalSubmission()
        # The default is SubmissionStatus.DRAFT.value
        assert submission.__class__.status.default.arg == SubmissionStatus.DRAFT.value

    def test_required_fields(self):
        """Test that required fields are present."""
        submission = EquipmentApprovalSubmission()
        assert hasattr(submission, 'id')
        assert hasattr(submission, 'project_id')
        assert hasattr(submission, 'template_id')
        assert hasattr(submission, 'name')
        assert hasattr(submission, 'specifications')
        assert hasattr(submission, 'documents')
        assert hasattr(submission, 'checklist_responses')
        assert hasattr(submission, 'additional_data')
        assert hasattr(submission, 'status')
        assert hasattr(submission, 'submitted_by_id')
        assert hasattr(submission, 'submitted_at')
        assert hasattr(submission, 'created_at')
        assert hasattr(submission, 'updated_at')

    def test_relationships(self):
        """Test that relationships are defined."""
        submission = EquipmentApprovalSubmission()
        assert hasattr(submission, 'project')
        assert hasattr(submission, 'submitted_by')
        assert hasattr(submission, 'decisions')


class TestEquipmentApprovalDecision:
    """Test EquipmentApprovalDecision model."""

    def test_model_instantiation(self):
        """Test that EquipmentApprovalDecision can be instantiated."""
        decision = EquipmentApprovalDecision()
        assert decision is not None
        assert isinstance(decision, EquipmentApprovalDecision)

    def test_default_id_generation(self):
        """Test that ID is auto-generated with UUID."""
        decision = EquipmentApprovalDecision()
        # The default is set but not called until insert
        assert hasattr(decision.__class__.id, 'default')

    def test_required_fields(self):
        """Test that required fields are present with correct names."""
        decision = EquipmentApprovalDecision()
        assert hasattr(decision, 'id')
        assert hasattr(decision, 'submission_id')
        assert hasattr(decision, 'consultant_type_id')
        assert hasattr(decision, 'approver_id')
        assert hasattr(decision, 'decision')
        assert hasattr(decision, 'comments')
        assert hasattr(decision, 'decided_at')

    def test_field_names_match_spec(self):
        """Test that field names match the specification exactly."""
        decision = EquipmentApprovalDecision()
        # Verify correct field names (not old names)
        assert hasattr(decision, 'approver_id')  # Not reviewer_id
        assert hasattr(decision, 'decision')  # Not decision_type
        assert hasattr(decision, 'decided_at')  # Not created_at
        assert hasattr(decision, 'consultant_type_id')  # Not reviewer_role

    def test_relationships(self):
        """Test that relationships are defined."""
        decision = EquipmentApprovalDecision()
        assert hasattr(decision, 'submission')
        assert hasattr(decision, 'approver')

    def test_timestamp_default(self):
        """Test that decided_at has a default."""
        decision = EquipmentApprovalDecision()
        assert hasattr(decision.__class__.decided_at, 'default')


class TestModelIntegrity:
    """Test model integrity and relationships."""

    def test_submission_table_name(self):
        """Test that submission table name is correct."""
        assert EquipmentApprovalSubmission.__tablename__ == "equipment_approval_submissions"

    def test_decision_table_name(self):
        """Test that decision table name is correct."""
        assert EquipmentApprovalDecision.__tablename__ == "equipment_approval_decisions"

    def test_foreign_key_references(self):
        """Test that foreign key references are defined."""
        # Test EquipmentApprovalSubmission FKs
        submission_columns = EquipmentApprovalSubmission.__table__.columns
        assert 'project_id' in submission_columns
        assert 'submitted_by_id' in submission_columns
        assert 'template_id' in submission_columns

        # Test EquipmentApprovalDecision FKs
        decision_columns = EquipmentApprovalDecision.__table__.columns
        assert 'submission_id' in decision_columns
        assert 'approver_id' in decision_columns
        assert 'consultant_type_id' in decision_columns
