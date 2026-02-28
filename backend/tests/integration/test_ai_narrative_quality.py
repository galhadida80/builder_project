"""
Integration tests for AI narrative quality validation.

These tests verify that the AI report generation pipeline produces
valid outputs. Manual quality validation is still required using
the validation script and checklist.
"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.services.ai_report_generator import (
    generate_weekly_progress_narrative,
    generate_inspection_summary_narrative,
    select_relevant_photos,
)
from app.services.chart_service import (
    generate_progress_chart,
    generate_inspection_chart,
    generate_approval_trend_chart,
    generate_rfi_aging_chart,
)
from app.services.inspection_report_service import (
    generate_ai_weekly_report_pdf,
    generate_ai_inspection_summary_pdf,
)


class TestAiNarrativeStructure:
    """Test that AI narratives have proper structure and format."""

    @pytest.mark.asyncio
    async def test_weekly_narrative_structure_english(self):
        """Verify English weekly narrative has required sections."""
        test_data = {
            "project_name": "Test Construction Project",
            "date_from": "2024-01-01",
            "date_to": "2024-01-07",
            "total_inspections": 5,
            "completed_inspections": 3,
            "pending_approvals": 2,
            "active_rfis": 1,
            "key_activities": ["Foundation inspection", "Framing completion"],
        }

        narrative = await generate_weekly_progress_narrative(test_data, language="en")

        # Verify required keys exist
        assert "executive_summary" in narrative
        assert "accomplishments" in narrative
        assert "concerns" in narrative
        assert "narrative" in narrative

        # Verify types
        assert isinstance(narrative["executive_summary"], str)
        assert isinstance(narrative["accomplishments"], list)
        assert isinstance(narrative["concerns"], list)
        assert isinstance(narrative["narrative"], str)

        # Verify content is not empty
        assert len(narrative["executive_summary"]) > 0
        assert len(narrative["narrative"]) > 50  # Substantial narrative

    @pytest.mark.asyncio
    async def test_weekly_narrative_structure_hebrew(self):
        """Verify Hebrew weekly narrative has required sections."""
        test_data = {
            "project_name": "פרויקט בניה לדוגמה",
            "date_from": "2024-01-01",
            "date_to": "2024-01-07",
            "total_inspections": 5,
            "completed_inspections": 3,
            "pending_approvals": 2,
            "active_rfis": 1,
            "key_activities": ["בדיקת יסודות", "השלמת שלד"],
        }

        narrative = await generate_weekly_progress_narrative(test_data, language="he")

        # Verify structure
        assert "executive_summary" in narrative
        assert "accomplishments" in narrative
        assert "concerns" in narrative
        assert "narrative" in narrative

        # Verify Hebrew content exists
        assert len(narrative["narrative"]) > 50

    @pytest.mark.asyncio
    async def test_inspection_summary_structure_english(self):
        """Verify English inspection summary has required sections."""
        test_data = {
            "project_name": "Test Project",
            "date_from": "2024-01-01",
            "date_to": "2024-01-31",
            "total_inspections": 10,
            "findings_by_severity": {"critical": 2, "major": 5, "minor": 8},
            "inspections": [
                {
                    "scheduled_date": "2024-01-15",
                    "consultant_type": "Structural Engineer",
                    "findings_count": 3,
                }
            ],
        }

        narrative = await generate_inspection_summary_narrative(test_data, language="en")

        # Verify required sections
        assert "executive_summary" in narrative
        assert "key_findings" in narrative
        assert "detailed_analysis" in narrative
        assert "recommendations" in narrative

        # Verify content
        assert len(narrative["executive_summary"]) > 0
        assert isinstance(narrative["key_findings"], list)
        assert len(narrative["detailed_analysis"]) > 50


class TestChartGeneration:
    """Test that charts are generated correctly."""

    def test_progress_chart_generation(self):
        """Verify progress chart generates valid base64 image."""
        data = {"completed": 10, "pending": 5, "overdue": 2}
        chart_b64 = generate_progress_chart(data)

        # Verify it's base64 encoded
        assert isinstance(chart_b64, str)
        assert len(chart_b64) > 100  # Non-trivial image

        # Verify it can be decoded
        import base64
        decoded = base64.b64decode(chart_b64)
        assert len(decoded) > 0

    def test_inspection_chart_generation(self):
        """Verify inspection chart generates valid image."""
        data = {"critical": 2, "major": 5, "minor": 8, "info": 3}
        chart_b64 = generate_inspection_chart(data)

        assert isinstance(chart_b64, str)
        assert len(chart_b64) > 100

    def test_approval_trend_chart_generation(self):
        """Verify approval trend chart generates valid image."""
        data = [
            {"date": "2024-01-01", "pending": 5, "approved": 10, "rejected": 1},
            {"date": "2024-01-08", "pending": 3, "approved": 15, "rejected": 2},
        ]
        chart_b64 = generate_approval_trend_chart(data)

        assert isinstance(chart_b64, str)
        assert len(chart_b64) > 100

    def test_rfi_aging_chart_generation(self):
        """Verify RFI aging chart generates valid image."""
        data = {"0-7 days": 5, "8-14 days": 3, "15-30 days": 2, "30+ days": 1}
        chart_b64 = generate_rfi_aging_chart(data)

        assert isinstance(chart_b64, str)
        assert len(chart_b64) > 100


class TestPhotoSelection:
    """Test AI photo curation logic."""

    @pytest.mark.asyncio
    async def test_photo_selection_returns_subset(self):
        """Verify photo selection returns relevant subset."""
        photos = [
            {"id": str(uuid4()), "file_name": "foundation.jpg", "tags": ["foundation"]},
            {"id": str(uuid4()), "file_name": "framing.jpg", "tags": ["framing"]},
            {"id": str(uuid4()), "file_name": "electrical.jpg", "tags": ["electrical"]},
            {"id": str(uuid4()), "file_name": "plumbing.jpg", "tags": ["plumbing"]},
        ]

        context = "Focus on structural work including foundation and framing"

        selected = await select_relevant_photos(photos, context, language="en", max_photos=2)

        # Verify selection
        assert isinstance(selected, list)
        assert len(selected) <= 2

    @pytest.mark.asyncio
    async def test_photo_selection_handles_empty_list(self):
        """Verify graceful handling of empty photo list."""
        selected = await select_relevant_photos([], "any context", language="en")

        assert selected == []


class TestPdfGeneration:
    """Test PDF generation pipeline (requires database)."""

    @pytest.mark.asyncio
    async def test_weekly_report_pdf_generation(self, db, test_project):
        """Verify weekly report PDF can be generated."""
        date_to = datetime.utcnow()
        date_from = date_to - timedelta(days=7)

        pdf_bytes = await generate_ai_weekly_report_pdf(
            db=db,
            project_id=test_project.id,
            date_from=date_from,
            date_to=date_to,
            language="en",
        )

        # Verify PDF is generated
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000  # Non-trivial PDF

        # Verify PDF header
        assert pdf_bytes[:4] == b"%PDF"

    @pytest.mark.asyncio
    async def test_inspection_summary_pdf_generation(self, db, test_project):
        """Verify inspection summary PDF can be generated."""
        date_to = datetime.utcnow()
        date_from = date_to - timedelta(days=30)

        pdf_bytes = await generate_ai_inspection_summary_pdf(
            db=db,
            project_id=test_project.id,
            date_from=date_from,
            date_to=date_to,
            language="en",
        )

        # Verify PDF is generated
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000

        # Verify PDF header
        assert pdf_bytes[:4] == b"%PDF"


class TestBilingualSupport:
    """Test bilingual report generation."""

    @pytest.mark.asyncio
    async def test_english_and_hebrew_reports_different(self, db, test_project):
        """Verify English and Hebrew reports have different content."""
        date_to = datetime.utcnow()
        date_from = date_to - timedelta(days=7)

        # Generate both versions
        pdf_en = await generate_ai_weekly_report_pdf(
            db=db, project_id=test_project.id, date_from=date_from, date_to=date_to, language="en"
        )

        pdf_he = await generate_ai_weekly_report_pdf(
            db=db, project_id=test_project.id, date_from=date_from, date_to=date_to, language="he"
        )

        # Verify they are different (content should differ due to language)
        assert pdf_en != pdf_he

        # Both should be valid PDFs
        assert pdf_en[:4] == b"%PDF"
        assert pdf_he[:4] == b"%PDF"
