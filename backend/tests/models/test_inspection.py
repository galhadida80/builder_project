from datetime import datetime

import pytest

from app.models.equipment_template import ConsultantType
from app.models.inspection import Finding, Inspection, InspectionStage, InspectionStatus


@pytest.mark.asyncio
async def test_cascade_delete_consultant_type_stages(db_session, project):
    """Test that deleting consultant type cascades to stages"""
    # Create consultant type with stages
    consultant_type = ConsultantType(name="Structural Engineer", name_he="מהנדס מבנים")
    db_session.add(consultant_type)
    await db_session.flush()

    stage = InspectionStage(consultant_type_id=consultant_type.id, name="Initial Review", order=1)
    db_session.add(stage)
    await db_session.commit()

    stage_id = stage.id

    # Delete consultant type
    await db_session.delete(consultant_type)
    await db_session.commit()

    # Verify stage was also deleted
    result = await db_session.get(InspectionStage, stage_id)
    assert result is None


@pytest.mark.asyncio
async def test_cascade_delete_inspection_findings(db_session, project):
    """Test that deleting inspection cascades to findings"""
    # Create consultant type
    consultant_type = ConsultantType(name="MEP Inspector", name_he="מפקח מע\"מ")
    db_session.add(consultant_type)
    await db_session.flush()

    # Create inspection with finding
    inspection = Inspection(
        project_id=project.id,
        consultant_type_id=consultant_type.id,
        scheduled_date=datetime.utcnow(),
        status=InspectionStatus.PENDING.value
    )
    db_session.add(inspection)
    await db_session.flush()

    finding = Finding(
        inspection_id=inspection.id,
        title="Test Finding",
        severity="high"
    )
    db_session.add(finding)
    await db_session.commit()

    finding_id = finding.id

    # Delete inspection
    await db_session.delete(inspection)
    await db_session.commit()

    # Verify finding was also deleted
    result = await db_session.get(Finding, finding_id)
    assert result is None
