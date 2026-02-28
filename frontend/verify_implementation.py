#!/usr/bin/env python3
"""
Verification script for Risk Prediction & Defect Scoring implementation
Checks that all backend components are importable and properly structured
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def verify_models():
    """Verify all models can be imported"""
    print("🔍 Verifying Models...")
    try:
        from app.models.risk_score import RiskScore, RiskLevel
        from app.models.risk_threshold import RiskThreshold
        print("  ✅ RiskScore model")
        print("  ✅ RiskThreshold model")
        print("  ✅ RiskLevel enum")
        return True
    except Exception as e:
        print(f"  ❌ Model import failed: {e}")
        return False

def verify_schemas():
    """Verify all schemas can be imported"""
    print("\n🔍 Verifying Schemas...")
    try:
        from app.schemas.risk_score import (
            RiskScoreCreate,
            RiskScoreUpdate,
            RiskScoreResponse,
            RiskScoreSummaryResponse,
            RiskAnalysisResponse,
            RiskThresholdCreate,
            RiskThresholdResponse,
        )
        print("  ✅ RiskScoreCreate schema")
        print("  ✅ RiskScoreUpdate schema")
        print("  ✅ RiskScoreResponse schema")
        print("  ✅ RiskScoreSummaryResponse schema")
        print("  ✅ RiskAnalysisResponse schema")
        print("  ✅ RiskThresholdCreate schema")
        print("  ✅ RiskThresholdResponse schema")
        return True
    except Exception as e:
        print(f"  ❌ Schema import failed: {e}")
        return False

def verify_services():
    """Verify all services can be imported"""
    print("\n🔍 Verifying Services...")
    try:
        from app.services.risk_prediction_service import (
            calculate_area_risk_score,
            get_high_risk_areas,
            get_inspection_risk_briefing,
            analyze_defect_trends,
            predict_defect_patterns,
        )
        print("  ✅ calculate_area_risk_score function")
        print("  ✅ get_high_risk_areas function")
        print("  ✅ get_inspection_risk_briefing function")
        print("  ✅ analyze_defect_trends function")
        print("  ✅ predict_defect_patterns function")
        return True
    except Exception as e:
        print(f"  ❌ Service import failed: {e}")
        return False

def verify_api():
    """Verify API router can be imported"""
    print("\n🔍 Verifying API Router...")
    try:
        from app.api.v1.risk_scores import router
        print("  ✅ Risk scores API router")
        print(f"  ℹ️  Router has {len(router.routes)} routes")
        return True
    except Exception as e:
        print(f"  ❌ API router import failed: {e}")
        return False

def verify_migrations():
    """Verify migration files exist"""
    print("\n🔍 Verifying Migrations...")
    import glob

    migrations = glob.glob("backend/alembic/versions/052_*.py")
    if migrations:
        print(f"  ✅ Migration 052 found: {os.path.basename(migrations[0])}")
    else:
        print("  ❌ Migration 052 not found")
        return False

    migrations = glob.glob("backend/alembic/versions/053_*.py")
    if migrations:
        print(f"  ✅ Migration 053 found: {os.path.basename(migrations[0])}")
    else:
        print("  ❌ Migration 053 not found")
        return False

    return True

def verify_frontend_files():
    """Verify frontend files exist"""
    print("\n🔍 Verifying Frontend Files...")

    files = [
        ("Types", "frontend/src/types/riskScore.ts"),
        ("API Client", "frontend/src/api/riskScores.ts"),
        ("RiskHeatmap", "frontend/src/components/RiskHeatmap.tsx"),
        ("PreInspectionBriefing", "frontend/src/components/PreInspectionBriefing.tsx"),
        ("RiskTrendAnalysis", "frontend/src/components/RiskTrendAnalysis.tsx"),
        ("RiskPredictionPage", "frontend/src/pages/RiskPredictionPage.tsx"),
    ]

    all_exist = True
    for name, path in files:
        if os.path.exists(path):
            print(f"  ✅ {name}")
        else:
            print(f"  ❌ {name} not found: {path}")
            all_exist = False

    return all_exist

def verify_tests():
    """Verify test files exist"""
    print("\n🔍 Verifying Test Files...")

    tests = [
        ("Backend E2E Tests", "backend/tests/integration/test_risk_prediction_e2e.py"),
        ("Frontend E2E Tests", "frontend/e2e/risk-prediction.spec.ts"),
    ]

    all_exist = True
    for name, path in tests:
        if os.path.exists(path):
            print(f"  ✅ {name}")
        else:
            print(f"  ❌ {name} not found: {path}")
            all_exist = False

    return all_exist

def main():
    """Run all verifications"""
    print("=" * 60)
    print("Risk Prediction & Defect Scoring - Implementation Verification")
    print("=" * 60)

    results = []

    # Backend verifications
    results.append(("Models", verify_models()))
    results.append(("Schemas", verify_schemas()))
    results.append(("Services", verify_services()))
    results.append(("API Router", verify_api()))
    results.append(("Migrations", verify_migrations()))

    # Frontend verifications
    results.append(("Frontend Files", verify_frontend_files()))

    # Test verifications
    results.append(("Test Files", verify_tests()))

    # Summary
    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")

    print(f"\nTotal: {passed}/{total} verifications passed")

    if passed == total:
        print("\n🎉 All verifications passed! Implementation is complete.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} verification(s) failed. Please review errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
