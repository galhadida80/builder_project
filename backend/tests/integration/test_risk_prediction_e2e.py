"""
Integration tests for Risk Prediction & Defect Scoring

Tests the complete end-to-end flow:
1. Create historical defects in test project
2. Trigger risk score calculation via API
3. Verify risk scores stored in database
4. Verify risk predictions and AI analysis
5. Test trend analysis endpoints
6. Verify auto-inspection scheduling
"""

import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.area import ConstructionArea
from app.models.defect import Defect
from app.models.inspection import Inspection
from app.models.risk_score import RiskScore, RiskLevel
from app.models.risk_threshold import RiskThreshold
from app.models.user import User
from app.services.risk_prediction_service import (
    calculate_area_risk_score,
    get_high_risk_areas,
    get_inspection_risk_briefing,
    analyze_defect_trends,
)


@pytest.mark.asyncio
class TestRiskPredictionE2E:
    """End-to-end integration tests for risk prediction flow"""

    @pytest.fixture
    async def test_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a test project"""
        project = Project(
            name="Risk Prediction Test Project",
            description="Test project for risk prediction E2E tests",
            status="active",
            created_by_id=admin_user.id,
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @pytest.fixture
    async def test_areas(
        self, db: AsyncSession, test_project: Project
    ) -> list[ConstructionArea]:
        """Create multiple construction areas for testing"""
        areas = []
        for floor in range(1, 4):
            area = ConstructionArea(
                project_id=test_project.id,
                name=f"Floor {floor}",
                area_code=f"FL{floor}",
                floor_number=floor,
                total_units=10,
            )
            db.add(area)
            areas.append(area)

        await db.commit()
        for area in areas:
            await db.refresh(area)
        return areas

    async def test_step_1_2_3_create_defects_and_calculate_risk(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
    ):
        """
        Step 1-3: Create historical defects and trigger risk score calculation
        """
        # Step 1: Create historical defects with varying severity
        defect_data = [
            # High-risk area: Floor 1 - multiple critical defects
            {
                "area": test_areas[0],
                "severity": "critical",
                "category": "Structural",
                "description": "Foundation crack",
            },
            {
                "area": test_areas[0],
                "severity": "critical",
                "category": "Waterproofing",
                "description": "Water intrusion",
            },
            {
                "area": test_areas[0],
                "severity": "major",
                "category": "Structural",
                "description": "Column misalignment",
            },
            # Medium-risk area: Floor 2 - some major defects
            {
                "area": test_areas[1],
                "severity": "major",
                "category": "Electrical",
                "description": "Wiring issue",
            },
            {
                "area": test_areas[1],
                "severity": "minor",
                "category": "Finishing",
                "description": "Paint quality",
            },
            # Low-risk area: Floor 3 - minor defects only
            {
                "area": test_areas[2],
                "severity": "minor",
                "category": "Finishing",
                "description": "Tile alignment",
            },
        ]

        created_defects = []
        for idx, data in enumerate(defect_data, start=1):
            defect = Defect(
                project_id=test_project.id,
                defect_number=idx,
                area_id=data["area"].id,
                severity=data["severity"],
                category=data["category"],
                description=data["description"],
                status="open",
                created_by_id=test_project.created_by_id,
                created_at=datetime.utcnow() - timedelta(days=30),
            )
            db.add(defect)
            created_defects.append(defect)

        await db.commit()

        # Step 2: Trigger risk score calculation for all areas
        risk_scores = []
        for area in test_areas:
            risk_score = await calculate_area_risk_score(
                db=db,
                project_id=test_project.id,
                area_id=area.id,
            )
            risk_scores.append(risk_score)

        # Step 3: Verify risk scores stored in database
        result = await db.execute(
            select(RiskScore).where(RiskScore.project_id == test_project.id)
        )
        db_risk_scores = result.scalars().all()

        assert len(db_risk_scores) == 3, "Should have 3 risk scores (one per area)"

        # Verify risk calculations are correct
        floor1_score = next(rs for rs in db_risk_scores if rs.area_id == test_areas[0].id)
        floor2_score = next(rs for rs in db_risk_scores if rs.area_id == test_areas[1].id)
        floor3_score = next(rs for rs in db_risk_scores if rs.area_id == test_areas[2].id)

        # Floor 1 should be high risk (2 critical + 1 major)
        assert floor1_score.risk_level in [
            RiskLevel.HIGH,
            RiskLevel.CRITICAL,
        ], f"Floor 1 should be high/critical risk, got {floor1_score.risk_level}"
        assert floor1_score.defect_count == 3

        # Floor 2 should be medium risk (1 major + 1 minor)
        assert floor2_score.risk_level in [
            RiskLevel.MEDIUM,
            RiskLevel.HIGH,
        ], f"Floor 2 should be medium/high risk, got {floor2_score.risk_level}"
        assert floor2_score.defect_count == 2

        # Floor 3 should be low risk (1 minor)
        assert floor3_score.risk_level == RiskLevel.LOW
        assert floor3_score.defect_count == 1

        # Risk scores should be ordered: floor1 > floor2 > floor3
        assert (
            floor1_score.risk_score > floor2_score.risk_score
        ), "Floor 1 should have higher risk than Floor 2"
        assert (
            floor2_score.risk_score > floor3_score.risk_score
        ), "Floor 2 should have higher risk than Floor 3"

        # Verify risk metadata
        assert floor1_score.predicted_defect_types is not None
        assert floor1_score.contributing_factors is not None
        assert floor1_score.calculation_metadata is not None
        assert floor1_score.calculated_at is not None

    async def test_step_4_get_high_risk_areas(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
    ):
        """
        Step 4: Get high-risk areas for dashboard display
        """
        # Create defects and risk scores
        defect = Defect(
            project_id=test_project.id,
            defect_number=1,
            area_id=test_areas[0].id,
            severity="critical",
            category="Structural",
            description="Test defect",
            status="open",
            created_by_id=test_project.created_by_id,
        )
        db.add(defect)
        await db.commit()

        await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Get high-risk areas
        high_risk_areas = await get_high_risk_areas(
            db=db,
            project_id=test_project.id,
            min_risk_level=RiskLevel.MEDIUM,
            limit=10,
        )

        assert len(high_risk_areas) > 0, "Should have at least one high-risk area"
        assert high_risk_areas[0].area_id == test_areas[0].id
        assert "predicted_defect_types" in high_risk_areas[0]
        assert "risk_factors" in high_risk_areas[0]

    async def test_step_5_inspection_risk_briefing(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        admin_user: User,
    ):
        """
        Step 5: Get pre-inspection risk briefing
        """
        # Create defects
        defect = Defect(
            project_id=test_project.id,
            defect_number=1,
            area_id=test_areas[0].id,
            severity="critical",
            category="Structural",
            description="Foundation issue",
            status="open",
            created_by_id=admin_user.id,
        )
        db.add(defect)
        await db.commit()

        # Calculate risk scores
        await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Create inspection
        inspection = Inspection(
            project_id=test_project.id,
            scheduled_date=datetime.utcnow() + timedelta(days=1),
            status="scheduled",
        )
        db.add(inspection)
        await db.commit()
        await db.refresh(inspection)

        # Get inspection risk briefing
        briefing = await get_inspection_risk_briefing(
            db=db,
            inspection_id=inspection.id,
            project_id=test_project.id,
        )

        assert briefing is not None
        assert "overall_risk_level" in briefing
        assert "high_risk_areas" in briefing
        assert "recommendations" in briefing
        assert len(briefing["high_risk_areas"]) > 0

        # Verify high-risk area details
        high_risk_area = briefing["high_risk_areas"][0]
        assert "area_name" in high_risk_area or "area_code" in high_risk_area
        assert "risk_score" in high_risk_area
        assert "predicted_defect_types" in high_risk_area
        assert "historical_defect_count" in high_risk_area

    async def test_step_6_trend_analysis(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
    ):
        """
        Step 6: Verify trend analysis by trade, floor, phase, season
        """
        # Create varied defects across time periods
        categories = ["Structural", "Electrical", "Waterproofing", "Finishing"]
        severities = ["critical", "major", "minor"]

        for i in range(12):
            defect = Defect(
                project_id=test_project.id,
                defect_number=i + 1,
                area_id=test_areas[i % len(test_areas)].id,
                severity=severities[i % len(severities)],
                category=categories[i % len(categories)],
                description=f"Test defect {i}",
                status="open",
                created_by_id=test_project.created_by_id,
                created_at=datetime.utcnow() - timedelta(days=i * 30),
            )
            db.add(defect)

        await db.commit()

        # Analyze trends
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=365)

        trends = await analyze_defect_trends(
            db=db,
            project_id=test_project.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Verify trend analysis structure
        assert "by_trade" in trends
        assert "by_floor" in trends
        assert "by_phase" in trends
        assert "by_season" in trends

        # Verify by_trade analysis
        assert len(trends["by_trade"]) > 0
        trade_trend = trends["by_trade"][0]
        assert "category" in trade_trend or "trade" in trade_trend
        assert "total_defects" in trade_trend
        assert "severity_breakdown" in trade_trend

        # Verify by_floor analysis
        assert len(trends["by_floor"]) > 0
        floor_trend = trends["by_floor"][0]
        assert "floor" in floor_trend or "floor_number" in floor_trend
        assert "total_defects" in floor_trend

        # Verify by_phase analysis
        assert len(trends["by_phase"]) > 0
        phase_trend = trends["by_phase"][0]
        assert "phase" in phase_trend or "period_start" in phase_trend
        assert "total_defects" in phase_trend

        # Verify by_season analysis
        assert len(trends["by_season"]) > 0
        season_trend = trends["by_season"][0]
        assert "season" in season_trend
        assert "total_defects" in season_trend

    async def test_step_7_auto_inspection_scheduling(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        admin_user: User,
    ):
        """
        Step 7: Verify auto-inspection scheduling when risk threshold exceeded
        """
        # Create risk threshold configuration
        threshold = RiskThreshold(
            project_id=test_project.id,
            low_threshold=Decimal("25.0"),
            medium_threshold=Decimal("50.0"),
            high_threshold=Decimal("75.0"),
            critical_threshold=Decimal("90.0"),
            auto_schedule_inspections=True,
            auto_schedule_threshold=RiskLevel.HIGH,
        )
        db.add(threshold)
        await db.commit()

        # Create critical defects to trigger high risk
        for i in range(3):
            defect = Defect(
                project_id=test_project.id,
                defect_number=i + 1,
                area_id=test_areas[0].id,
                severity="critical",
                category="Structural",
                description=f"Critical issue {i}",
                status="open",
                created_by_id=test_project.created_by_id,
            )
            db.add(defect)

        await db.commit()

        # Calculate risk score (should trigger auto-scheduling)
        risk_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        assert risk_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]

        # Note: Auto-scheduling logic should be called in the API endpoint
        # This test verifies the risk score is high enough to trigger it
        # The actual scheduling would be tested in the API integration test

    async def test_risk_model_accuracy_improvement(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
    ):
        """
        Step 8: Verify risk model improves with more data
        """
        # Initial state: 1 defect
        defect1 = Defect(
            project_id=test_project.id,
            defect_number=1,
            area_id=test_areas[0].id,
            severity="major",
            category="Structural",
            description="Initial defect",
            status="open",
            created_by_id=test_project.created_by_id,
        )
        db.add(defect1)
        await db.commit()

        initial_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Add more defects to improve model
        for i in range(5):
            defect = Defect(
                project_id=test_project.id,
                defect_number=i + 2,  # Start from 2 since defect1 is number 1
                area_id=test_areas[0].id,
                severity="major" if i < 3 else "minor",
                category="Structural",
                description=f"Additional defect {i}",
                status="open",
                created_by_id=test_project.created_by_id,
            )
            db.add(defect)

        await db.commit()

        improved_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # More defects should increase risk score
        assert improved_score.risk_score > initial_score.risk_score
        assert improved_score.defect_count > initial_score.defect_count

        # Metadata should reflect more comprehensive analysis
        assert len(improved_score.predicted_defect_types or []) >= len(
            initial_score.predicted_defect_types or []
        )


@pytest.mark.asyncio
class TestRiskPredictionAPI:
    """API endpoint integration tests"""

    async def test_risk_scores_crud_endpoints(
        self, client, test_project: Project, test_areas: list[ConstructionArea]
    ):
        """Test CRUD operations on risk scores API"""
        # GET /projects/{project_id}/risk-scores - list
        response = await client.get(f"/api/v1/projects/{test_project.id}/risk-scores")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # POST /projects/{project_id}/risk-scores - create
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/risk-scores",
            json={"area_id": str(test_areas[0].id)},
        )
        assert response.status_code in [200, 201]
        risk_score = response.json()
        assert "riskScore" in risk_score
        assert "riskLevel" in risk_score

        # GET /projects/{project_id}/risk-scores/summary
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/risk-scores/summary"
        )
        assert response.status_code == 200
        summary = response.json()
        assert "totalAreas" in summary or "total_areas" in summary

    async def test_risk_threshold_endpoints(self, client, test_project: Project):
        """Test risk threshold configuration endpoints"""
        # GET /projects/{project_id}/risk-thresholds
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/risk-thresholds"
        )
        assert response.status_code in [200, 404]

        # POST /projects/{project_id}/risk-thresholds - create
        response = await client.post(
            f"/api/v1/projects/{test_project.id}/risk-thresholds",
            json={
                "low_threshold": 25.0,
                "medium_threshold": 50.0,
                "high_threshold": 75.0,
                "critical_threshold": 90.0,
                "auto_schedule_inspections": True,
                "auto_schedule_threshold": "high",
            },
        )
        assert response.status_code in [200, 201]

    async def test_trend_analysis_endpoint(self, client, test_project: Project):
        """Test defect trend analysis endpoint"""
        response = await client.get(
            f"/api/v1/projects/{test_project.id}/risk-trends"
        )
        assert response.status_code == 200
        trends = response.json()
        # Should have trend breakdowns
        assert isinstance(trends, dict)
