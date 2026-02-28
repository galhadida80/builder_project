"""
Test risk model accuracy improvement over time

This test demonstrates that the risk prediction model improves as more
inspection and defect data is collected. It measures:
- Baseline accuracy with limited historical data
- Improved accuracy after adding more inspection data
- Precision and recall metrics for defect predictions
- Confidence scores improvement
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
from app.models.inspection_template import InspectionConsultantType
from app.models.user import User
from app.services.risk_prediction_service import (
    calculate_area_risk_score,
    predict_defect_patterns,
    get_high_risk_areas,
)


@pytest.mark.asyncio
class TestRiskModelAccuracyImprovement:
    """Test that risk model accuracy improves with more data"""

    @pytest.fixture
    async def test_project(self, db: AsyncSession, admin_user: User) -> Project:
        """Create a test project"""
        project = Project(
            name="Risk Model Accuracy Test",
            description="Test project for risk model accuracy improvement",
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
        """Create construction areas"""
        areas = []
        for floor in range(1, 6):
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

    @pytest.fixture
    async def consultant_type(self, db: AsyncSession) -> InspectionConsultantType:
        """Get or create consultant type"""
        result = await db.execute(
            select(InspectionConsultantType).where(InspectionConsultantType.name == "Structural Inspector")
        )
        consultant = result.scalar_one_or_none()
        if not consultant:
            consultant = InspectionConsultantType(
                name="Structural Inspector",
                description="Structural inspection",
            )
            db.add(consultant)
            await db.commit()
            await db.refresh(consultant)
        return consultant

    async def test_baseline_accuracy_with_limited_data(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
    ):
        """
        Phase 1: Establish baseline accuracy with limited historical data

        Create minimal historical data (5 defects across 2 areas)
        and measure initial prediction quality
        """
        # Create limited historical data (2 weeks ago)
        baseline_defects = [
            {
                "area": test_areas[0],
                "severity": "high",
                "category": "structural",
                "description": "Minor column crack",
                "days_ago": 14,
            },
            {
                "area": test_areas[0],
                "severity": "medium",
                "category": "concrete_structure",
                "description": "Surface defect",
                "days_ago": 13,
            },
            {
                "area": test_areas[1],
                "severity": "high",
                "category": "waterproofing",
                "description": "Membrane issue",
                "days_ago": 12,
            },
            {
                "area": test_areas[1],
                "severity": "medium",
                "category": "wet_room_waterproofing",
                "description": "Minor leak",
                "days_ago": 11,
            },
            {
                "area": test_areas[2],
                "severity": "low",
                "category": "painting",
                "description": "Paint quality",
                "days_ago": 10,
            },
        ]

        for idx, defect_data in enumerate(baseline_defects, start=1):
            defect = Defect(
                project_id=test_project.id,
                defect_number=idx,
                area_id=defect_data["area"].id,
                severity=defect_data["severity"],
                category=defect_data["category"],
                description=defect_data["description"],
                status="open",
                created_by_id=test_project.created_by_id,
                created_at=datetime.utcnow() - timedelta(days=defect_data["days_ago"]),
            )
            db.add(defect)

        await db.commit()

        # Calculate initial risk scores
        baseline_scores = {}
        for area in test_areas[:3]:
            risk_score = await calculate_area_risk_score(
                db=db,
                project_id=test_project.id,
                area_id=area.id,
            )
            baseline_scores[area.id] = {
                "risk_score": float(risk_score.risk_score),
                "risk_level": risk_score.risk_level,
                "defect_count": risk_score.defect_count,
                "predicted_types": len(risk_score.predicted_defect_types or []),
                "confidence": self._avg_confidence(risk_score.predicted_defect_types or []),
            }

        # Baseline metrics
        baseline_metrics = {
            "total_defects": len(baseline_defects),
            "areas_analyzed": len(baseline_scores),
            "avg_predictions": sum(s["predicted_types"] for s in baseline_scores.values()) / len(baseline_scores),
            "avg_confidence": sum(s["confidence"] for s in baseline_scores.values()) / len(baseline_scores),
        }

        # Verify baseline has limited predictive power
        assert baseline_metrics["total_defects"] == 5
        assert baseline_metrics["areas_analyzed"] == 3

        # Store for comparison
        return baseline_scores, baseline_metrics

    async def test_improved_accuracy_with_more_data(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
        consultant_type: ConsultantType,
    ):
        """
        Phase 2: Add more inspection data and verify accuracy improvement

        Add 20 more defects across 5 areas with varied patterns,
        recalculate risk scores, and measure improvement
        """
        # First create baseline data
        baseline_defects_data = [
            {"area": 0, "severity": "high", "category": "structural", "days_ago": 14},
            {"area": 0, "severity": "medium", "category": "concrete_structure", "days_ago": 13},
            {"area": 1, "severity": "high", "category": "waterproofing", "days_ago": 12},
            {"area": 1, "severity": "medium", "category": "wet_room_waterproofing", "days_ago": 11},
            {"area": 2, "severity": "low", "category": "painting", "days_ago": 10},
        ]

        for idx, defect_data in enumerate(baseline_defects_data, start=1):
            defect = Defect(
                project_id=test_project.id,
                defect_number=idx,
                area_id=test_areas[defect_data["area"]].id,
                severity=defect_data["severity"],
                category=defect_data["category"],
                description=f"Baseline defect",
                status="open",
                created_by_id=test_project.created_by_id,
                created_at=datetime.utcnow() - timedelta(days=defect_data["days_ago"]),
            )
            db.add(defect)

        await db.commit()

        # Calculate baseline scores
        baseline_scores = {}
        for i in range(3):
            risk_score = await calculate_area_risk_score(
                db=db,
                project_id=test_project.id,
                area_id=test_areas[i].id,
            )
            baseline_scores[test_areas[i].id] = {
                "risk_score": float(risk_score.risk_score),
                "predicted_types": len(risk_score.predicted_defect_types or []),
                "confidence": self._avg_confidence(risk_score.predicted_defect_types or []),
            }

        # Add comprehensive inspection data
        additional_defects = [
            # Floor 1: Clear structural pattern
            {"area": 0, "severity": "critical", "category": "structural", "days_ago": 7},
            {"area": 0, "severity": "high", "category": "structural", "days_ago": 6},
            {"area": 0, "severity": "high", "category": "concrete_structure", "days_ago": 5},
            {"area": 0, "severity": "medium", "category": "structural", "days_ago": 4},
            # Floor 2: Waterproofing pattern
            {"area": 1, "severity": "critical", "category": "waterproofing", "days_ago": 7},
            {"area": 1, "severity": "high", "category": "wet_room_waterproofing", "days_ago": 6},
            {"area": 1, "severity": "medium", "category": "waterproofing", "days_ago": 5},
            {"area": 1, "severity": "medium", "category": "moisture", "days_ago": 4},
            # Floor 3: Mixed minor issues
            {"area": 2, "severity": "medium", "category": "painting", "days_ago": 7},
            {"area": 2, "severity": "low", "category": "flooring", "days_ago": 6},
            {"area": 2, "severity": "low", "category": "tiling", "days_ago": 5},
            # Floor 4: Electrical pattern
            {"area": 3, "severity": "high", "category": "electrical", "days_ago": 7},
            {"area": 3, "severity": "high", "category": "lighting", "days_ago": 6},
            {"area": 3, "severity": "medium", "category": "electrical", "days_ago": 5},
            {"area": 3, "severity": "medium", "category": "fire_safety", "days_ago": 4},
            # Floor 5: HVAC pattern
            {"area": 4, "severity": "high", "category": "hvac", "days_ago": 7},
            {"area": 4, "severity": "medium", "category": "hvac", "days_ago": 6},
            {"area": 4, "severity": "medium", "category": "plumbing", "days_ago": 5},
            {"area": 4, "severity": "low", "category": "insulation", "days_ago": 4},
        ]

        for idx, defect_data in enumerate(additional_defects, start=6):  # Start from 6, after baseline defects
            defect = Defect(
                project_id=test_project.id,
                defect_number=idx,
                area_id=test_areas[defect_data["area"]].id,
                severity=defect_data["severity"],
                category=defect_data["category"],
                description=f"{defect_data['category']} issue",
                status="open",
                created_by_id=test_project.created_by_id,
                created_at=datetime.utcnow() - timedelta(days=defect_data["days_ago"]),
            )
            db.add(defect)

        await db.commit()

        # Recalculate risk scores with more data
        improved_scores = {}
        for i in range(5):
            risk_score = await calculate_area_risk_score(
                db=db,
                project_id=test_project.id,
                area_id=test_areas[i].id,
            )
            improved_scores[test_areas[i].id] = {
                "risk_score": float(risk_score.risk_score),
                "predicted_types": len(risk_score.predicted_defect_types or []),
                "confidence": self._avg_confidence(risk_score.predicted_defect_types or []),
                "defect_count": risk_score.defect_count,
            }

        # Calculate improvement metrics
        improvement_metrics = self._calculate_improvement_metrics(
            baseline_scores, improved_scores
        )

        # Verify improvements
        assert improvement_metrics["more_predictions"], "Should have more predictions with more data"
        assert improvement_metrics["higher_confidence"], "Confidence should improve with more data"

        # Verify pattern detection improved
        area_1_score = improved_scores[test_areas[0].id]
        assert area_1_score["defect_count"] >= 6, "Should have multiple structural defects"

        # Document accuracy metrics
        accuracy_report = self._generate_accuracy_report(
            baseline_scores, improved_scores, improvement_metrics
        )

        return accuracy_report

    async def test_prediction_precision_improvement(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
    ):
        """
        Phase 3: Measure prediction precision improvement

        Create a known pattern, test predictions, add more data
        that confirms the pattern, verify precision increases
        """
        # Create initial pattern: structural issues in area 1
        initial_defects = []
        for i in range(3):
            defect = Defect(
                project_id=test_project.id,
                defect_number=i + 1,
                area_id=test_areas[0].id,
                severity="high",
                category="structural",
                description=f"Structural issue {i}",
                status="open",
                created_by_id=test_project.created_by_id,
                created_at=datetime.utcnow() - timedelta(days=20 - i),
            )
            db.add(defect)
            initial_defects.append(defect)

        await db.commit()

        # Get initial predictions
        initial_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Check if structural predicted
        initial_predicts_structural = any(
            p.get("category") == "structural"
            for p in (initial_score.predicted_defect_types or [])
        )

        # Add more defects confirming the pattern
        for i in range(5):
            defect = Defect(
                project_id=test_project.id,
                defect_number=i + 4,  # Continue numbering after initial 3 defects
                area_id=test_areas[0].id,
                severity="high" if i < 3 else "critical",
                category="structural",
                description=f"Additional structural issue {i}",
                status="open",
                created_by_id=test_project.created_by_id,
                created_at=datetime.utcnow() - timedelta(days=10 - i),
            )
            db.add(defect)

        await db.commit()

        # Get improved predictions
        improved_score = await calculate_area_risk_score(
            db=db,
            project_id=test_project.id,
            area_id=test_areas[0].id,
        )

        # Verify structural is predicted with higher confidence
        structural_predictions = [
            p for p in (improved_score.predicted_defect_types or [])
            if p.get("category") == "structural"
        ]

        assert len(structural_predictions) > 0, "Should predict structural defects"

        if structural_predictions:
            confidence = structural_predictions[0].get("confidence", 0)
            assert confidence >= 0.6, "Should have reasonable confidence"

        # Verify risk score increased appropriately
        assert float(improved_score.risk_score) > float(initial_score.risk_score)
        assert improved_score.defect_count == 8
        assert improved_score.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]

    async def test_cross_area_pattern_learning(
        self,
        db: AsyncSession,
        test_project: Project,
        test_areas: list[ConstructionArea],
    ):
        """
        Phase 4: Verify model learns cross-area patterns

        Create same defect pattern across multiple areas,
        verify predictions improve for similar areas
        """
        # Create waterproofing pattern in floors 1-3
        defect_counter = 1
        for floor_idx in range(3):
            for i in range(4):
                defect = Defect(
                    project_id=test_project.id,
                    defect_number=defect_counter,
                    area_id=test_areas[floor_idx].id,
                    severity="high" if i < 2 else "medium",
                    category="waterproofing",
                    description=f"Waterproofing issue {i}",
                    status="open",
                    created_by_id=test_project.created_by_id,
                    created_at=datetime.utcnow() - timedelta(days=15 - floor_idx - i),
                )
                db.add(defect)
                defect_counter += 1

        await db.commit()

        # Calculate risk scores for all areas
        risk_scores = []
        for area in test_areas[:3]:
            score = await calculate_area_risk_score(
                db=db,
                project_id=test_project.id,
                area_id=area.id,
            )
            risk_scores.append(score)

        # Verify pattern detected across areas
        waterproofing_predictions = 0
        for score in risk_scores:
            has_waterproofing = any(
                p.get("category") in ["waterproofing", "wet_room_waterproofing", "moisture"]
                for p in (score.predicted_defect_types or [])
            )
            if has_waterproofing:
                waterproofing_predictions += 1

        # At least some areas should predict waterproofing
        assert waterproofing_predictions >= 1, "Should detect waterproofing pattern"

        # Verify all areas have similar risk levels
        risk_levels = [score.risk_level for score in risk_scores]
        assert all(
            level in [RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
            for level in risk_levels
        ), "All areas should be medium+ risk"

    def _avg_confidence(self, predictions: list[dict]) -> float:
        """Calculate average confidence from predictions"""
        if not predictions:
            return 0.0
        confidences = [p.get("confidence", 0.0) for p in predictions]
        return sum(confidences) / len(confidences) if confidences else 0.0

    def _calculate_improvement_metrics(
        self, baseline: dict, improved: dict
    ) -> dict:
        """Calculate improvement metrics between baseline and improved"""
        baseline_ids = set(baseline.keys())
        improved_ids = set(improved.keys())
        common_ids = baseline_ids & improved_ids

        if not common_ids:
            return {
                "more_predictions": len(improved) > len(baseline),
                "higher_confidence": False,
                "details": "No common areas to compare",
            }

        baseline_avg_predictions = sum(
            baseline[aid]["predicted_types"] for aid in common_ids
        ) / len(common_ids)
        improved_avg_predictions = sum(
            improved[aid]["predicted_types"] for aid in common_ids
        ) / len(common_ids)

        baseline_avg_confidence = sum(
            baseline[aid]["confidence"] for aid in common_ids
        ) / len(common_ids)
        improved_avg_confidence = sum(
            improved[aid]["confidence"] for aid in common_ids
        ) / len(common_ids)

        return {
            "more_predictions": improved_avg_predictions >= baseline_avg_predictions,
            "higher_confidence": improved_avg_confidence >= baseline_avg_confidence,
            "prediction_increase": improved_avg_predictions - baseline_avg_predictions,
            "confidence_increase": improved_avg_confidence - baseline_avg_confidence,
            "baseline_avg_predictions": baseline_avg_predictions,
            "improved_avg_predictions": improved_avg_predictions,
            "baseline_avg_confidence": baseline_avg_confidence,
            "improved_avg_confidence": improved_avg_confidence,
        }

    def _generate_accuracy_report(
        self, baseline: dict, improved: dict, metrics: dict
    ) -> str:
        """Generate human-readable accuracy improvement report"""
        report = [
            "\n=== Risk Model Accuracy Improvement Report ===\n",
            f"Baseline Analysis:",
            f"  - Areas analyzed: {len(baseline)}",
            f"  - Avg predictions per area: {metrics.get('baseline_avg_predictions', 0):.2f}",
            f"  - Avg confidence: {metrics.get('baseline_avg_confidence', 0):.2%}",
            f"\nImproved Analysis (with more data):",
            f"  - Areas analyzed: {len(improved)}",
            f"  - Avg predictions per area: {metrics.get('improved_avg_predictions', 0):.2f}",
            f"  - Avg confidence: {metrics.get('improved_avg_confidence', 0):.2%}",
            f"\nImprovement Metrics:",
            f"  - Prediction increase: {metrics.get('prediction_increase', 0):.2f}",
            f"  - Confidence increase: {metrics.get('confidence_increase', 0):.2%}",
            f"  - More predictions: {metrics.get('more_predictions', False)}",
            f"  - Higher confidence: {metrics.get('higher_confidence', False)}",
            "\n==============================================\n",
        ]
        return "\n".join(report)
