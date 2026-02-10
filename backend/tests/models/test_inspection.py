from datetime import datetime

import pytest

from app.models.inspection import Finding, Inspection, InspectionStage, InspectionStatus
from app.models.inspection_template import InspectionConsultantType


@pytest.mark.asyncio
async def test_cascade_delete_consultant_type_stages(db_session, project):
    """Test that deleting consultant type cascades to stages"""
    consultant_type = InspectionConsultantType(name="Structural Engineer", name_he="מהנדס מבנים")
    db_session.add(consultant_type)
    await db_session.flush()

    stage = InspectionStage(consultant_type_id=consultant_type.id, name="Initial Review", order=1)
    db_session.add(stage)
    await db_session.commit()

    stage_id = stage.id

    await db_session.delete(consultant_type)
    await db_session.commit()

    result = await db_session.get(InspectionStage, stage_id)
    assert result is None


@pytest.mark.asyncio
async def test_cascade_delete_inspection_findings(db_session, project):
    """Test that deleting inspection cascades to findings"""
    consultant_type = InspectionConsultantType(name="MEP Inspector", name_he="מפקח מע\"מ")
    db_session.add(consultant_type)
    await db_session.flush()

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

    await db_session.delete(inspection)
    await db_session.commit()

    result = await db_session.get(Finding, finding_id)
    assert result is None
