#!/usr/bin/env python3
"""
AI Narrative Quality Validation Script

This script generates sample AI reports for manual quality review.
It creates test reports in both English and Hebrew and saves them
for manual inspection.

Usage:
    python validate_ai_narrative_quality.py --project-id <uuid>
    python validate_ai_narrative_quality.py --project-id <uuid> --output-dir ./test-reports
"""
import argparse
import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from uuid import UUID

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.project import Project
from app.services.inspection_report_service import (
    generate_ai_inspection_summary_pdf,
    generate_ai_weekly_report_pdf,
)


async def validate_project_exists(db: AsyncSession, project_id: UUID) -> Project:
    """Verify project exists and return it."""
    project = await db.get(Project, project_id)
    if not project:
        raise ValueError(f"Project {project_id} not found")
    return project


async def generate_weekly_reports(
    db: AsyncSession, project_id: UUID, output_dir: Path
) -> dict:
    """Generate weekly progress reports in both languages."""
    print("\n=== Generating Weekly Progress Reports ===")

    project = await validate_project_exists(db, project_id)
    print(f"Project: {project.name}")

    # Date range: last 7 days
    date_to = datetime.utcnow()
    date_from = date_to - timedelta(days=7)

    results = {}

    # English report
    print("\n[1/2] Generating English weekly report...")
    try:
        en_pdf = await generate_ai_weekly_report_pdf(
            db=db, project_id=project_id, date_from=date_from, date_to=date_to, language="en"
        )
        en_path = output_dir / "test_weekly_report_en.pdf"
        en_path.write_bytes(en_pdf)
        results["weekly_en"] = {
            "status": "SUCCESS",
            "path": str(en_path),
            "size_kb": len(en_pdf) / 1024,
        }
        print(f"✓ Saved to: {en_path} ({len(en_pdf) / 1024:.1f} KB)")
    except Exception as e:
        results["weekly_en"] = {"status": "FAILED", "error": str(e)}
        print(f"✗ Failed: {e}")

    # Hebrew report
    print("\n[2/2] Generating Hebrew weekly report...")
    try:
        he_pdf = await generate_ai_weekly_report_pdf(
            db=db, project_id=project_id, date_from=date_from, date_to=date_to, language="he"
        )
        he_path = output_dir / "test_weekly_report_he.pdf"
        he_path.write_bytes(he_pdf)
        results["weekly_he"] = {
            "status": "SUCCESS",
            "path": str(he_path),
            "size_kb": len(he_pdf) / 1024,
        }
        print(f"✓ Saved to: {he_path} ({len(he_pdf) / 1024:.1f} KB)")
    except Exception as e:
        results["weekly_he"] = {"status": "FAILED", "error": str(e)}
        print(f"✗ Failed: {e}")

    return results


async def generate_inspection_summaries(
    db: AsyncSession, project_id: UUID, output_dir: Path
) -> dict:
    """Generate inspection summary reports in both languages."""
    print("\n=== Generating Inspection Summary Reports ===")

    project = await validate_project_exists(db, project_id)
    print(f"Project: {project.name}")

    # Date range: last 30 days
    date_to = datetime.utcnow()
    date_from = date_to - timedelta(days=30)

    results = {}

    # English report
    print("\n[1/2] Generating English inspection summary...")
    try:
        en_pdf = await generate_ai_inspection_summary_pdf(
            db=db, project_id=project_id, date_from=date_from, date_to=date_to, language="en"
        )
        en_path = output_dir / "test_inspection_summary_en.pdf"
        en_path.write_bytes(en_pdf)
        results["inspection_en"] = {
            "status": "SUCCESS",
            "path": str(en_path),
            "size_kb": len(en_pdf) / 1024,
        }
        print(f"✓ Saved to: {en_path} ({len(en_pdf) / 1024:.1f} KB)")
    except Exception as e:
        results["inspection_en"] = {"status": "FAILED", "error": str(e)}
        print(f"✗ Failed: {e}")

    # Hebrew report
    print("\n[2/2] Generating Hebrew inspection summary...")
    try:
        he_pdf = await generate_ai_inspection_summary_pdf(
            db=db, project_id=project_id, date_from=date_from, date_to=date_to, language="he"
        )
        he_path = output_dir / "test_inspection_summary_he.pdf"
        he_path.write_bytes(he_pdf)
        results["inspection_he"] = {
            "status": "SUCCESS",
            "path": str(he_path),
            "size_kb": len(he_pdf) / 1024,
        }
        print(f"✓ Saved to: {he_path} ({len(he_pdf) / 1024:.1f} KB)")
    except Exception as e:
        results["inspection_he"] = {"status": "FAILED", "error": str(e)}
        print(f"✗ Failed: {e}")

    return results


def print_summary(results: dict):
    """Print validation summary."""
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)

    total = len(results)
    passed = sum(1 for r in results.values() if r["status"] == "SUCCESS")
    failed = total - passed

    print(f"\nTotal Reports: {total}")
    print(f"✓ Successful: {passed}")
    print(f"✗ Failed: {failed}")

    if failed > 0:
        print("\nFailed Reports:")
        for name, result in results.items():
            if result["status"] == "FAILED":
                print(f"  - {name}: {result.get('error', 'Unknown error')}")

    print("\n" + "=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print("\n1. Open generated PDF files in a PDF reader")
    print("2. Review using README_AI_NARRATIVE_QUALITY.md checklist")
    print("3. Validate:")
    print("   - Coherent narrative (logical flow, professional tone)")
    print("   - Accurate data (numbers match project data)")
    print("   - Relevant photos (contextually appropriate)")
    print("   - Proper charts (correct values, good visualization)")
    print("   - Correct language (natural Hebrew and English)")
    print("4. Document any issues in qa-issues.md")
    print("5. Sign off in README_AI_NARRATIVE_QUALITY.md")
    print("\n" + "=" * 60)


async def main():
    """Main validation function."""
    parser = argparse.ArgumentParser(
        description="Generate AI reports for manual quality validation"
    )
    parser.add_argument(
        "--project-id", type=str, required=True, help="UUID of the project to test"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./test-reports",
        help="Directory to save test reports",
    )

    args = parser.parse_args()

    # Validate project ID format
    try:
        project_id = UUID(args.project_id)
    except ValueError:
        print(f"Error: Invalid project ID format: {args.project_id}")
        sys.exit(1)

    # Create output directory
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir.absolute()}")

    # Run validation
    all_results = {}

    async with AsyncSessionLocal() as db:
        # Generate weekly reports
        weekly_results = await generate_weekly_reports(db, project_id, output_dir)
        all_results.update(weekly_results)

        # Generate inspection summaries
        inspection_results = await generate_inspection_summaries(
            db, project_id, output_dir
        )
        all_results.update(inspection_results)

    # Print summary
    print_summary(all_results)

    # Exit with error code if any failed
    if any(r["status"] == "FAILED" for r in all_results.values()):
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
