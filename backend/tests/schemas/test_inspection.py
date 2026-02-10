from datetime import datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.inspection import (
    FindingCreate,
    InspectionCreate,
    InspectionUpdate,
)


def test_inspection_create_required_fields():
    """Test that InspectionCreate validates required fields"""
    # Should succeed with all required fields
    data = InspectionCreate(
        consultant_type_id=uuid4(),
        scheduled_date=datetime.utcnow()
    )
    assert data.consultant_type_id is not None

    # Should fail without required fields
    with pytest.raises(ValidationError):
        InspectionCreate()


def test_inspection_update_optional_fields():
    """Test that InspectionUpdate allows all fields to be optional"""
    data = InspectionUpdate()
    assert data.model_dump(exclude_unset=True) == {}

    data = InspectionUpdate(status="completed")
    assert data.status == "completed"


def test_finding_severity_validation():
    """Test that FindingCreate validates severity field"""
    data = FindingCreate(
        title="Test Finding",
        severity="high"
    )
    assert data.severity == "high"
