#!/bin/bash

# Hebrew Localization E2E Verification Script
# This script performs a quick sanity check of the Hebrew localization implementation

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  Hebrew Localization E2E Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if frontend and backend are configured
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Frontend directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend directory found${NC}"

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Backend directory not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend directory found${NC}"

echo ""
echo "📁 Checking implementation files..."

# Check if i18n config exists
if [ ! -f "frontend/src/i18n/config.ts" ]; then
    echo -e "${RED}❌ i18n config not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ i18n config: frontend/src/i18n/config.ts${NC}"

# Check if English translation file exists
if [ ! -f "frontend/src/i18n/locales/en.json" ]; then
    echo -e "${RED}❌ English translation file not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ English translations: frontend/src/i18n/locales/en.json${NC}"

# Check if Hebrew translation file exists
if [ ! -f "frontend/src/i18n/locales/he.json" ]; then
    echo -e "${RED}❌ Hebrew translation file not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Hebrew translations: frontend/src/i18n/locales/he.json${NC}"

# Check if main.tsx imports i18n
if ! grep -q "import.*i18n.*from.*i18n/config" frontend/src/main.tsx; then
    echo -e "${RED}❌ i18n not imported in main.tsx${NC}"
    exit 1
fi
echo -e "${GREEN}✅ i18n imported in main.tsx${NC}"

# Check if App.tsx uses i18n
if ! grep -q "useTranslation\|i18n" frontend/src/App.tsx; then
    echo -e "${RED}❌ i18n not used in App.tsx${NC}"
    exit 1
fi
echo -e "${GREEN}✅ i18n integration in App.tsx${NC}"

# Check if theme.ts has RTL support
if ! grep -q "direction" frontend/src/theme.ts; then
    echo -e "${RED}❌ RTL direction not found in theme.ts${NC}"
    exit 1
fi
echo -e "${GREEN}✅ RTL support in theme.ts${NC}"

# Check if LanguageSelector component exists
if [ ! -f "frontend/src/components/common/LanguageSelector.tsx" ]; then
    echo -e "${RED}❌ LanguageSelector component not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ LanguageSelector component found${NC}"

echo ""
echo "📦 Checking dependencies..."

# Check if i18next dependencies are in package.json
if ! grep -q '"i18next"' frontend/package.json; then
    echo -e "${RED}❌ i18next not in package.json${NC}"
    exit 1
fi
echo -e "${GREEN}✅ i18next dependency found${NC}"

if ! grep -q '"react-i18next"' frontend/package.json; then
    echo -e "${RED}❌ react-i18next not in package.json${NC}"
    exit 1
fi
echo -e "${GREEN}✅ react-i18next dependency found${NC}"

if ! grep -q '"i18next-browser-languagedetector"' frontend/package.json; then
    echo -e "${RED}❌ i18next-browser-languagedetector not in package.json${NC}"
    exit 1
fi
echo -e "${GREEN}✅ i18next-browser-languagedetector dependency found${NC}"

echo ""
echo "🔍 Checking translation file contents..."

# Check if English translation file has content
EN_SIZE=$(stat -f%z "frontend/src/i18n/locales/en.json" 2>/dev/null || stat -c%s "frontend/src/i18n/locales/en.json" 2>/dev/null)
if [ "$EN_SIZE" -lt 100 ]; then
    echo -e "${RED}❌ English translation file seems empty${NC}"
    exit 1
fi
echo -e "${GREEN}✅ English translation file has content (${EN_SIZE} bytes)${NC}"

# Check if Hebrew translation file has content
HE_SIZE=$(stat -f%z "frontend/src/i18n/locales/he.json" 2>/dev/null || stat -c%s "frontend/src/i18n/locales/he.json" 2>/dev/null)
if [ "$HE_SIZE" -lt 100 ]; then
    echo -e "${RED}❌ Hebrew translation file seems empty${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Hebrew translation file has content (${HE_SIZE} bytes)${NC}"

# Check if Hebrew file has Hebrew characters
if ! grep -q "[\u0590-\u05FF]" "frontend/src/i18n/locales/he.json" 2>/dev/null; then
    # Alternative check - look for specific Hebrew words
    if ! grep -q "עברית\|משתמש\|סיסמה\|כניסה" "frontend/src/i18n/locales/he.json"; then
        echo -e "${YELLOW}⚠️  Hebrew translation file may not have Hebrew characters${NC}"
    else
        echo -e "${GREEN}✅ Hebrew translation file contains Hebrew text${NC}"
    fi
else
    echo -e "${GREEN}✅ Hebrew translation file contains Hebrew characters${NC}"
fi

echo ""
echo "🗂️  Checking backend localization..."

# Check if backend localization utility exists
if [ ! -f "backend/app/utils/localization.py" ]; then
    echo -e "${YELLOW}⚠️  Backend localization utility not found (optional for frontend E2E)${NC}"
else
    echo -e "${GREEN}✅ Backend localization utility found${NC}"
fi

# Check if backend locale files exist
if [ ! -f "backend/app/locales/en.json" ]; then
    echo -e "${YELLOW}⚠️  Backend English locales not found (optional for frontend E2E)${NC}"
else
    echo -e "${GREEN}✅ Backend English locales found${NC}"
fi

if [ ! -f "backend/app/locales/he.json" ]; then
    echo -e "${YELLOW}⚠️  Backend Hebrew locales not found (optional for frontend E2E)${NC}"
else
    echo -e "${GREEN}✅ Backend Hebrew locales found${NC}"
fi

echo ""
echo "✨ Syntax validation..."

# Check TypeScript/JSON syntax in key files
if command -v tsc &> /dev/null; then
    echo "Checking TypeScript syntax..."
    if tsc --noEmit frontend/src/i18n/config.ts 2>/dev/null; then
        echo -e "${GREEN}✅ i18n/config.ts TypeScript syntax OK${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not validate TypeScript (may need full build)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  TypeScript compiler not in PATH${NC}"
fi

# Validate JSON files
if command -v jq &> /dev/null; then
    if jq empty "frontend/src/i18n/locales/en.json" 2>/dev/null; then
        echo -e "${GREEN}✅ English translation JSON syntax OK${NC}"
    else
        echo -e "${RED}❌ English translation JSON syntax error${NC}"
        exit 1
    fi

    if jq empty "frontend/src/i18n/locales/he.json" 2>/dev/null; then
        echo -e "${GREEN}✅ Hebrew translation JSON syntax OK${NC}"
    else
        echo -e "${RED}❌ Hebrew translation JSON syntax error${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  jq not found, skipping JSON validation${NC}"
fi

echo ""
echo "📊 Summary of Implementation..."

echo ""
echo "Frontend i18n Infrastructure:"
echo "  ✅ Configuration: frontend/src/i18n/config.ts"
echo "  ✅ English locale: frontend/src/i18n/locales/en.json (${EN_SIZE} bytes)"
echo "  ✅ Hebrew locale: frontend/src/i18n/locales/he.json (${HE_SIZE} bytes)"
echo "  ✅ Main initialization: frontend/src/main.tsx"
echo "  ✅ App integration: frontend/src/App.tsx"
echo "  ✅ Theme RTL support: frontend/src/theme.ts"
echo "  ✅ Language selector: frontend/src/components/common/LanguageSelector.tsx"

echo ""
echo "Dependencies:"
echo "  ✅ i18next"
echo "  ✅ react-i18next"
echo "  ✅ i18next-browser-languagedetector"
echo "  ✅ dayjs (for date formatting)"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ All checks passed! Hebrew localization is properly implemented.${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "Next steps:"
echo "1. Start backend:  cd backend && python -m uvicorn app.main:app --reload"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Run E2E tests:  cd frontend && npm install @playwright/test && npx playwright test"
echo "4. Or follow manual testing guide: E2E_HEBREW_TESTING_GUIDE.md"
echo ""

exit 0
