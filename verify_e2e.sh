#\!/bin/bash
# E2E Verification Script for Risk Prediction Feature

echo "============================================================"
echo "Risk Prediction E2E Verification"
echo "============================================================"
echo ""

PASS=0
FAIL=0

check_file() {
    if [ -f "$1" ]; then
        echo "✅ $2"
        ((PASS++))
    else
        echo "❌ $2 - File not found: $1"
        ((FAIL++))
    fi
}

echo "📁 Backend Files:"
check_file "backend/app/models/risk_score.py" "RiskScore model"
check_file "backend/app/models/risk_threshold.py" "RiskThreshold model"
check_file "backend/app/schemas/risk_score.py" "Risk score schemas"
check_file "backend/app/services/risk_prediction_service.py" "Risk prediction service"
check_file "backend/app/api/v1/risk_scores.py" "Risk scores API"
check_file "backend/alembic/versions/052_add_risk_scores_table.py" "Migration 052"
check_file "backend/alembic/versions/053_add_risk_thresholds_table.py" "Migration 053"

echo ""
echo "📁 Frontend Files:"
check_file "frontend/src/types/riskScore.ts" "TypeScript types"
check_file "frontend/src/api/riskScores.ts" "API client"
check_file "frontend/src/components/RiskHeatmap.tsx" "RiskHeatmap component"
check_file "frontend/src/components/PreInspectionBriefing.tsx" "PreInspectionBriefing component"
check_file "frontend/src/components/RiskTrendAnalysis.tsx" "RiskTrendAnalysis component"
check_file "frontend/src/pages/RiskPredictionPage.tsx" "RiskPredictionPage"

echo ""
echo "📁 Test Files:"
check_file "backend/tests/integration/test_risk_prediction_e2e.py" "Backend integration tests"
check_file "frontend/e2e/risk-prediction.spec.ts" "Frontend E2E tests"

echo ""
echo "📁 Documentation:"
check_file ".auto-claude/specs/226-ai-powered-defect-prediction-risk-scoring/e2e-verification.md" "E2E verification guide"

echo ""
echo "============================================================"
echo "SUMMARY"
echo "============================================================"
echo "✅ Passed: $PASS"
echo "❌ Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 All files present\! Implementation complete."
    exit 0
else
    echo "⚠️  Some files missing. Please review above."
    exit 1
fi
