"""
End-to-end verification tests for risk threshold auto-scheduling feature.

This test suite verifies the complete workflow:
1. Configure risk threshold in project settings
2. Create high-risk scenario (multiple defects in area)
3. Verify risk score exceeds threshold
4. Confirm inspection auto-scheduled
5. Check notification sent to inspector
"""

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.area import ConstructionArea
from app.models.defect import Defect
from app.models.inspection import Inspection, InspectionStatus
from app.models.inspection_template import InspectionConsultantType
from app.models.notification import Notification
from app.models.project import Project, ProjectMember
from app.models.risk_score import RiskLevel, RiskScore
from app.models.risk_threshold import RiskThreshold
from app.models.user import User
from app.services.risk_prediction_service import calculate_area_risk_score


@pytest.mark.asyncio
class TestRiskThresholdAutoSchedulingE2E:
    """
    End-to-end verification of risk threshold auto-scheduling workflow.

    Verification Steps:
    1. Configure risk threshold in project settings
    2. Create high-risk scenario (multiple defects in area)
    3. Verify risk score exceeds threshold
    4. Confirm inspection auto-scheduled
    5. Check notification sent to inspector
    """

    async def test_step_1_configure_risk_threshold(
        self,
        db: AsyncSession,
        test_project: Project,
        test_user: User,
    ):
        """
        Step 1: Configure risk threshold in project settings

        Verification:
        - Risk threshold can be created for a project
        - Auto-scheduling can be enabled
        - Threshold levels are configurable
        """
        # Create risk threshold configuration
        threshold = RiskThreshold(
            project_id=test_project.id,
            low_threshold=Decimal("25.0"),
            medium_threshold=Decimal("50.0"),
            high_threshold=Decimal("75.0"),
            critical_threshold=Decimal("90.0"),
            auto_schedule_inspections=True,
            auto_schedule_threshold="high",  # Schedule when risk >= high
            created_by_id=test_user.id,
        )

        db.add(threshold)
        await db.commit()
        await db.refresh(threshold)

        # Verify threshold created successfully
        assert threshold.id is not None
        assert threshold.project_id == test_project.id
        assert threshold.auto_schedule_inspections is True
        assert threshold.auto_schedule_threshold == "high"
        assert threshold.high_threshold == Decimal("75.0")

        # Verify threshold can be retrieved
        query = select(RiskThreshold).where(RiskThreshold.project_id == test_project.id)
        result = await db.execute(query)
        retrieved_threshold = result.scalar_one()

        assert retrieved_threshold.id == threshold.id
        assert retrieved_threshold.auto_schedule_inspections is True

    async def test_step_2_create_high_risk_scenario(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
    ):
        """
        Step 2: Create high-risk scenario (multiple defects in area)

        Verification:
        - Multiple critical defects can be created
        - Defects are properly associated with area
        - Varied defect categories and severities
        """
        # Create high-risk scenario with multiple critical defects
        defects = []

        # Create 3 critical defects
        for i in range(3):
            defect = Defect(
                project_id=test_project.id,
                area_id=test_areas[0].id,
                severity="critical",
                category="Structural",
                description=f"Critical structural issue {i + 1}",
                status="open",
            )
            db.add(defect)
            defects.append(defect)

        # Create 2 major defects
        for i in range(2):
            defect = Defect(
                project_id=test_project.id,
                area_id=test_areas[0].id,
                severity="major",
                category="Electrical",
                description=f"Major electrical issue {i + 1}",
                status="open",
            )
            db.add(defect)
            defects.append(defect)

        await db.commit()

        # Verify defects created
        query = (
            select(Defect)
            .where(Defect.project_id == test_project.id)
            .where(Defect.area_id == test_areas[0].id)
        )
        result = await db.execute(query)
        created_defects = result.scalars().all()

        assert len(created_defects) >= 5
        critical_count = sum(1 for d in created_defects if d.severity == "critical")
        assert critical_count >= 3, "Should have at least 3 critical defects"

    async def test_step_3_verify_risk_score_exceeds_threshold(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        test_user: User,
    ):
        """
        Step 3: Verify risk score exceeds threshold

        Verification:
        - Risk score calculation works correctly
        - Risk score exceeds configured threshold
        - Risk level is HIGH or CRITICAL
        """
        # Create threshold and defects
        threshold = RiskThreshold(
            project_id=test_project.id,
            high_threshold=Decimal("75.0"),
            auto_schedule_inspections=True,
            auto_schedule_threshold="high",
        )
        db.add(threshold)

        # Create critical defects
        for i in range(4):
            defect = Defect(
                project_id=test_project.id,
                area_id=test_areas[0].id,
                severity="critical",
                category="Structural",
                description=f"Critical issue {i}",
                status="open",
            )
            db.add(defect)

        await db.commit()

        # Calculate risk score
        risk_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Verify risk score exceeds threshold
        assert risk_score is not None
        assert risk_score.risk_score >= threshold.high_threshold, \
            f"Risk score {risk_score.risk_score} should be >= {threshold.high_threshold}"
        assert risk_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL], \
            f"Risk level should be HIGH or CRITICAL, got {risk_score.risk_level}"

        # Verify risk score details
        assert risk_score.defect_count >= 4
        assert risk_score.area_id == test_areas[0].id

    async def test_step_4_confirm_inspection_auto_scheduled(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        test_user: User,
    ):
        """
        Step 4: Confirm inspection auto-scheduled

        Verification:
        - Inspection is automatically created
        - Inspection status is PENDING
        - Inspection is scheduled for future date
        - Inspection notes reference risk score
        """
        # Setup: Create consultant type (required for inspections)
        consultant_type = InspectionConsultantType(
            name="General Inspector",
            description="General building inspector",
        )
        db.add(consultant_type)

        # Create threshold
        threshold = RiskThreshold(
            project_id=test_project.id,
            high_threshold=Decimal("75.0"),
            auto_schedule_inspections=True,
            auto_schedule_threshold="high",
        )
        db.add(threshold)

        # Create critical defects
        for i in range(4):
            defect = Defect(
                project_id=test_project.id,
                area_id=test_areas[0].id,
                severity="critical",
                category="Structural",
                description=f"Critical issue {i}",
                status="open",
            )
            db.add(defect)

        await db.commit()

        # Calculate risk score (which should trigger auto-scheduling via API)
        risk_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Manually trigger auto-scheduling (simulating API call)
        from app.api.v1.risk_scores import check_and_schedule_inspection
        await check_and_schedule_inspection(
            db=db,
            project_id=test_project.id,
            risk_score=risk_score,
            current_user=test_user,
        )

        # Verify inspection was auto-scheduled
        query = (
            select(Inspection)
            .where(Inspection.project_id == test_project.id)
            .where(Inspection.status == InspectionStatus.PENDING.value)
        )
        result = await db.execute(query)
        inspections = result.scalars().all()

        assert len(inspections) > 0, "At least one inspection should be auto-scheduled"

        # Find the auto-scheduled inspection
        auto_scheduled_inspection = None
        for inspection in inspections:
            if inspection.notes and f"Auto-scheduled for area {test_areas[0].id}" in inspection.notes:
                auto_scheduled_inspection = inspection
                break

        assert auto_scheduled_inspection is not None, "Auto-scheduled inspection should exist"
        assert auto_scheduled_inspection.status == InspectionStatus.PENDING.value
        assert auto_scheduled_inspection.scheduled_date > datetime.utcnow()
        assert str(risk_score.risk_score) in auto_scheduled_inspection.notes
        assert auto_scheduled_inspection.consultant_type_id == consultant_type.id

    async def test_step_5_check_notification_sent(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        test_user: User,
    ):
        """
        Step 5: Check notification sent to inspector

        Verification:
        - Notification is created for project members
        - Notification category is 'inspection'
        - Notification contains risk score information
        - Notification references the auto-scheduled inspection
        """
        # Setup: Create consultant type and project member
        consultant_type = InspectionConsultantType(
            name="General Inspector",
            description="General building inspector",
        )
        db.add(consultant_type)

        # Add project member with inspector role
        member = ProjectMember(
            project_id=test_project.id,
            user_id=test_user.id,
            role="inspector",
        )
        db.add(member)

        # Create threshold
        threshold = RiskThreshold(
            project_id=test_project.id,
            high_threshold=Decimal("75.0"),
            auto_schedule_inspections=True,
            auto_schedule_threshold="high",
        )
        db.add(threshold)

        # Create critical defects
        for i in range(4):
            defect = Defect(
                project_id=test_project.id,
                area_id=test_areas[0].id,
                severity="critical",
                category="Structural",
                description=f"Critical issue {i}",
                status="open",
            )
            db.add(defect)

        await db.commit()

        # Calculate risk score
        risk_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Trigger auto-scheduling
        from app.api.v1.risk_scores import check_and_schedule_inspection
        await check_and_schedule_inspection(
            db=db,
            project_id=test_project.id,
            risk_score=risk_score,
            current_user=test_user,
        )

        # Verify notifications were sent
        query = (
            select(Notification)
            .where(Notification.user_id == test_user.id)
            .where(Notification.category == "inspection")
            .order_by(Notification.created_at.desc())
        )
        result = await db.execute(query)
        notifications = result.scalars().all()

        assert len(notifications) > 0, "At least one notification should be sent"

        # Find the auto-scheduling notification
        auto_schedule_notification = None
        for notification in notifications:
            if "Auto-Scheduled" in notification.title or "high risk score" in notification.message.lower():
                auto_schedule_notification = notification
                break

        assert auto_schedule_notification is not None, "Auto-scheduling notification should exist"
        assert auto_schedule_notification.category == "inspection"
        assert str(risk_score.risk_score) in auto_schedule_notification.message
        assert auto_schedule_notification.related_entity_type == "inspection"
        assert auto_schedule_notification.related_entity_id is not None

    async def test_complete_e2e_workflow(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        test_user: User,
    ):
        """
        Complete end-to-end test of the entire auto-scheduling workflow.

        This test runs all 5 verification steps in sequence to ensure
        the complete feature works as expected.
        """
        # Step 1: Configure risk threshold
        threshold = RiskThreshold(
            project_id=test_project.id,
            low_threshold=Decimal("25.0"),
            medium_threshold=Decimal("50.0"),
            high_threshold=Decimal("75.0"),
            critical_threshold=Decimal("90.0"),
            auto_schedule_inspections=True,
            auto_schedule_threshold="high",
            created_by_id=test_user.id,
        )
        db.add(threshold)

        # Setup consultant type
        consultant_type = InspectionConsultantType(
            name="General Inspector",
            description="General building inspector",
        )
        db.add(consultant_type)

        # Add project member
        member = ProjectMember(
            project_id=test_project.id,
            user_id=test_user.id,
            role="inspector",
        )
        db.add(member)

        await db.commit()

        # Step 2: Create high-risk scenario
        defects = []
        for i in range(5):
            severity = "critical" if i < 3 else "major"
            defect = Defect(
                project_id=test_project.id,
                area_id=test_areas[0].id,
                severity=severity,
                category="Structural" if severity == "critical" else "Electrical",
                description=f"{severity.capitalize()} issue {i + 1}",
                status="open",
            )
            db.add(defect)
            defects.append(defect)

        await db.commit()

        # Step 3: Calculate risk score and verify it exceeds threshold
        risk_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        assert risk_score.risk_score >= threshold.high_threshold, \
            f"Risk score {risk_score.risk_score} should be >= {threshold.high_threshold}"
        assert risk_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]

        # Step 4: Trigger auto-scheduling
        from app.api.v1.risk_scores import check_and_schedule_inspection
        await check_and_schedule_inspection(
            db=db,
            project_id=test_project.id,
            risk_score=risk_score,
            current_user=test_user,
        )

        # Verify inspection was created
        inspection_query = (
            select(Inspection)
            .where(Inspection.project_id == test_project.id)
            .where(Inspection.status == InspectionStatus.PENDING.value)
        )
        inspection_result = await db.execute(inspection_query)
        inspection = inspection_result.scalar_one_or_none()

        assert inspection is not None, "Inspection should be auto-scheduled"
        assert f"Auto-scheduled for area {test_areas[0].id}" in inspection.notes

        # Step 5: Verify notification was sent
        notification_query = (
            select(Notification)
            .where(Notification.user_id == test_user.id)
            .where(Notification.category == "inspection")
        )
        notification_result = await db.execute(notification_query)
        notification = notification_result.scalar_one_or_none()

        assert notification is not None, "Notification should be sent"
        assert notification.related_entity_type == "inspection"
        assert notification.related_entity_id == inspection.id

        # Complete verification
        print("\n✅ Complete E2E Workflow Verification:")
        print(f"  1. Risk threshold configured: {threshold.auto_schedule_threshold}")
        print(f"  2. High-risk defects created: {len(defects)} defects")
        print(f"  3. Risk score calculated: {risk_score.risk_score} ({risk_score.risk_level})")
        print(f"  4. Inspection auto-scheduled: {inspection.id}")
        print(f"  5. Notification sent to inspector: {notification.id}")

    async def test_no_auto_schedule_when_disabled(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        test_user: User,
    ):
        """
        Verify that inspections are NOT auto-scheduled when feature is disabled.
        """
        # Create threshold with auto-scheduling DISABLED
        threshold = RiskThreshold(
            project_id=test_project.id,
            high_threshold=Decimal("75.0"),
            auto_schedule_inspections=False,  # Disabled
            auto_schedule_threshold="high",
        )
        db.add(threshold)

        consultant_type = InspectionConsultantType(
            name="General Inspector",
            description="General building inspector",
        )
        db.add(consultant_type)

        # Create critical defects
        for i in range(4):
            defect = Defect(
                project_id=test_project.id,
                area_id=test_areas[0].id,
                severity="critical",
                category="Structural",
                description=f"Critical issue {i}",
                status="open",
            )
            db.add(defect)

        await db.commit()

        # Calculate risk score
        risk_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Trigger auto-scheduling
        from app.api.v1.risk_scores import check_and_schedule_inspection
        await check_and_schedule_inspection(
            db=db,
            project_id=test_project.id,
            risk_score=risk_score,
            current_user=test_user,
        )

        # Verify NO inspection was created
        query = (
            select(Inspection)
            .where(Inspection.project_id == test_project.id)
        )
        result = await db.execute(query)
        inspections = result.scalars().all()

        assert len(inspections) == 0, "No inspection should be auto-scheduled when feature is disabled"

    async def test_no_auto_schedule_below_threshold(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        test_user: User,
    ):
        """
        Verify that inspections are NOT auto-scheduled when risk score is below threshold.
        """
        # Create threshold
        threshold = RiskThreshold(
            project_id=test_project.id,
            high_threshold=Decimal("75.0"),
            auto_schedule_inspections=True,
            auto_schedule_threshold="high",
        )
        db.add(threshold)

        consultant_type = InspectionConsultantType(
            name="General Inspector",
            description="General building inspector",
        )
        db.add(consultant_type)

        # Create only 1 minor defect (low risk)
        defect = Defect(
            project_id=test_project.id,
            area_id=test_areas[0].id,
            severity="minor",
            category="Cosmetic",
            description="Minor cosmetic issue",
            status="open",
        )
        db.add(defect)

        await db.commit()

        # Calculate risk score (should be low)
        risk_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Trigger auto-scheduling
        from app.api.v1.risk_scores import check_and_schedule_inspection
        await check_and_schedule_inspection(
            db=db,
            project_id=test_project.id,
            risk_score=risk_score,
            current_user=test_user,
        )

        # Verify NO inspection was created
        query = (
            select(Inspection)
            .where(Inspection.project_id == test_project.id)
        )
        result = await db.execute(query)
        inspections = result.scalars().all()

        assert len(inspections) == 0, "No inspection should be auto-scheduled when risk is below threshold"
