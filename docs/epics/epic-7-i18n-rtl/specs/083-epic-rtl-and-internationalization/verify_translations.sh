#!/bin/bash

# Verify translation files are complete and have matching keys

FRONTEND_DIR="/Users/galhadida/projects/builder_project/builder_program/frontend"
EN_FILE="$FRONTEND_DIR/src/i18n/locales/en.json"
HE_FILE="$FRONTEND_DIR/src/i18n/locales/he.json"

echo "========================================"
echo "Translation File Verification"
echo "========================================"

# Check if files exist
if [ ! -f "$EN_FILE" ]; then
  echo "❌ English translation file not found: $EN_FILE"
  exit 1
fi

if [ ! -f "$HE_FILE" ]; then
  echo "❌ Hebrew translation file not found: $HE_FILE"
  exit 1
fi

echo "✅ Both translation files found"
echo ""

# Extract top-level keys using Python
python3 << 'EOF'
import json
import sys

# Read English file
with open('/Users/galhadida/projects/builder_project/builder_program/frontend/src/i18n/locales/en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

# Read Hebrew file
with open('/Users/galhadida/projects/builder_project/builder_program/frontend/src/i18n/locales/he.json', 'r', encoding='utf-8') as f:
    he_data = json.load(f)

print("English Translation Namespaces:")
en_keys = set(en_data.keys())
for key in sorted(en_keys):
    count = len(en_data[key]) if isinstance(en_data[key], dict) else 1
    print(f"  - {key}: {count} keys")

print("\nHebrew Translation Namespaces:")
he_keys = set(he_data.keys())
for key in sorted(he_keys):
    count = len(he_data[key]) if isinstance(he_data[key], dict) else 1
    print(f"  - {key}: {count} keys")

# Check for missing namespaces
missing_in_he = en_keys - he_keys
missing_in_en = he_keys - en_keys

if missing_in_he:
    print(f"\n⚠️  Namespaces in English but not in Hebrew: {missing_in_he}")
if missing_in_en:
    print(f"\n⚠️  Namespaces in Hebrew but not in English: {missing_in_en}")

# Check for missing keys within each namespace
print("\nDetailed Key Comparison:")
missing_count = 0
for namespace in sorted(en_keys & he_keys):
    if isinstance(en_data[namespace], dict) and isinstance(he_data[namespace], dict):
        en_ns_keys = set(en_data[namespace].keys())
        he_ns_keys = set(he_data[namespace].keys())

        missing = en_ns_keys - he_ns_keys
        extra = he_ns_keys - en_ns_keys

        if missing or extra:
            print(f"\n  {namespace}:")
            if missing:
                print(f"    Missing in Hebrew: {missing}")
                missing_count += len(missing)
            if extra:
                print(f"    Extra in Hebrew: {extra}")
        else:
            print(f"  ✅ {namespace}: All keys match ({len(en_ns_keys)} keys)")

if missing_count > 0:
    print(f"\n❌ Total missing translation keys in Hebrew: {missing_count}")
    sys.exit(1)
else:
    print(f"\n✅ All translation namespaces and keys are complete!")
    print(f"   Total namespaces: {len(en_keys & he_keys)}")
    print(f"   Total keys: {sum(len(en_data[ns]) for ns in (en_keys & he_keys) if isinstance(en_data[ns], dict))}")
    sys.exit(0)
EOF

exit_code=$?
echo ""
echo "========================================"
if [ $exit_code -eq 0 ]; then
  echo "✅ Verification PASSED"
else
  echo "❌ Verification FAILED"
fi
echo "========================================"

exit $exit_code
