"""
Test script for equipment template schema validation
Run this with: python test_equipment_template_schemas.py
"""
import sys
from uuid import uuid4
from datetime import datetime
from pydantic import ValidationError

# Add backend to path
sys.path.insert(0, './backend')

from app.schemas.equipment_template import (
    DocumentDefinition,
    SpecificationDefinition,
    ChecklistItemDefinition,
    EquipmentTemplateCreate,
    EquipmentTemplateUpdate,
    EquipmentTemplateResponse,
    EquipmentApprovalDecisionCreate,
)


def test_valid_data_passes():
    """Test 1: Valid data passes validation"""
    print("Test 1: Valid data passes validation...")

    # Test DocumentDefinition
    doc = DocumentDefinition(
        name="Installation Manual",
        name_he="מדריך התקנה",
        description="Equipment installation guide",
        source="consultant",
        required=True
    )
    assert doc.name == "Installation Manual"
    print("  ✓ DocumentDefinition with valid data passed")

    # Test SpecificationDefinition with select type
    spec = SpecificationDefinition(
        name="Voltage",
        name_he="מתח",
        field_type="select",
        options=["220V", "380V", "440V"],
        unit="V",
        required=True
    )
    assert spec.field_type == "select"
    assert spec.options == ["220V", "380V", "440V"]
    print("  ✓ SpecificationDefinition with select type passed")

    # Test SpecificationDefinition with text type
    spec_text = SpecificationDefinition(
        name="Model",
        name_he="דגם",
        field_type="text",
        required=False
    )
    assert spec_text.field_type == "text"
    assert spec_text.options is None
    print("  ✓ SpecificationDefinition with text type passed")

    # Test ChecklistItemDefinition
    checklist = ChecklistItemDefinition(
        name="Pre-installation check",
        name_he="בדיקה לפני התקנה",
        requires_file=True
    )
    assert checklist.requires_file is True
    print("  ✓ ChecklistItemDefinition with valid data passed")

    # Test EquipmentTemplateCreate
    template = EquipmentTemplateCreate(
        name="HVAC System",
        name_he="מערכת מיזוג",
        category="Climate Control",
        description="Heating, Ventilation, and Air Conditioning",
        documents=[doc],
        specifications=[spec, spec_text],
        checklist_items=[checklist]
    )
    assert template.name == "HVAC System"
    print("  ✓ EquipmentTemplateCreate with valid data passed")

    print("✅ Test 1 PASSED\n")


def test_invalid_literal_values():
    """Test 2: Invalid Literal values raise ValidationError"""
    print("Test 2: Invalid Literal values raise ValidationError...")

    # Test invalid source in DocumentDefinition
    try:
        doc = DocumentDefinition(
            name="Test Doc",
            name_he="מסמך בדיקה",
            source="invalid_source",  # Invalid literal
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for invalid source")
        return False
    except ValidationError as e:
        assert "source" in str(e)
        print("  ✓ Invalid source literal correctly rejected")

    # Test invalid field_type in SpecificationDefinition
    try:
        spec = SpecificationDefinition(
            name="Test",
            name_he="בדיקה",
            field_type="invalid_type",  # Invalid literal
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for invalid field_type")
        return False
    except ValidationError as e:
        assert "field_type" in str(e)
        print("  ✓ Invalid field_type literal correctly rejected")

    # Test invalid decision in EquipmentApprovalDecisionCreate
    try:
        decision = EquipmentApprovalDecisionCreate(
            submission_id=uuid4(),
            decision="invalid_decision",  # Invalid literal
            comments="Test"
        )
        print("  ✗ FAILED: Should have raised ValidationError for invalid decision")
        return False
    except ValidationError as e:
        assert "decision" in str(e)
        print("  ✓ Invalid decision literal correctly rejected")

    print("✅ Test 2 PASSED\n")


def test_options_field_validation():
    """Test 3: Options field only valid when field_type='select'"""
    print("Test 3: Options field only valid when field_type='select'...")

    # Test options required when field_type is "select"
    try:
        spec = SpecificationDefinition(
            name="Test",
            name_he="בדיקה",
            field_type="select",
            options=None,  # Should be required for select type
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for missing options on select")
        return False
    except ValidationError as e:
        assert "options" in str(e).lower()
        print("  ✓ Missing options on select type correctly rejected")

    # Test options not allowed when field_type is not "select"
    try:
        spec = SpecificationDefinition(
            name="Test",
            name_he="בדיקה",
            field_type="text",
            options=["Option1", "Option2"],  # Should not be present for text type
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for options on non-select type")
        return False
    except ValidationError as e:
        assert "options" in str(e).lower()
        print("  ✓ Options on non-select type correctly rejected")

    # Test valid select with options
    spec = SpecificationDefinition(
        name="Test",
        name_he="בדיקה",
        field_type="select",
        options=["Option1", "Option2"],
        required=True
    )
    assert spec.options == ["Option1", "Option2"]
    print("  ✓ Valid select with options passed")

    print("✅ Test 3 PASSED\n")


def test_text_sanitization():
    """Test 4: Text sanitization removes XSS patterns"""
    print("Test 4: Text sanitization removes XSS patterns...")

    # Test script tag removal
    doc = DocumentDefinition(
        name="Test <script>alert('xss')</script>Doc",
        name_he="מסמך <script>alert('xss')</script>בדיקה",
        description="Description with <script>malicious()</script> code",
        source="consultant",
        required=True
    )
    assert "<script>" not in doc.name
    assert "<script>" not in doc.name_he
    assert "<script>" not in (doc.description or "")
    print("  ✓ Script tags removed from DocumentDefinition")

    # Test javascript: protocol removal
    template = EquipmentTemplateCreate(
        name="Test javascript:alert('xss') Template",
        name_he="תבנית javascript:alert('xss') בדיקה",
        category="Category with javascript:void(0)",
        description="Desc with javascript:malicious()"
    )
    assert "javascript:" not in template.name
    assert "javascript:" not in template.name_he
    assert "javascript:" not in (template.category or "")
    print("  ✓ javascript: protocol removed from EquipmentTemplateCreate")

    # Test onclick attribute removal
    spec = SpecificationDefinition(
        name="Test onclick=malicious() Spec",
        name_he="מפרט onclick=bad() בדיקה",
        field_type="text",
        unit="unit onclick=attack()",
        required=True
    )
    assert "onclick" not in spec.name.lower()
    assert "onclick" not in spec.name_he.lower()
    assert "onclick" not in (spec.unit or "").lower()
    print("  ✓ onclick attributes removed from SpecificationDefinition")

    # Test iframe removal
    checklist = ChecklistItemDefinition(
        name="Test <iframe src='evil'></iframe> Item",
        name_he="פריט <iframe src='evil'></iframe> בדיקה",
        requires_file=False
    )
    assert "<iframe" not in checklist.name.lower()
    assert "<iframe" not in checklist.name_he.lower()
    print("  ✓ iframe tags removed from ChecklistItemDefinition")

    print("✅ Test 4 PASSED\n")


def test_bilingual_fields_required():
    """Test 5: Bilingual fields (name/name_he) required"""
    print("Test 5: Bilingual fields (name/name_he) required...")

    # Test DocumentDefinition missing name
    try:
        doc = DocumentDefinition(
            name_he="מסמך בדיקה",
            source="consultant",
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for missing name")
        return False
    except ValidationError as e:
        assert "name" in str(e)
        print("  ✓ Missing name in DocumentDefinition correctly rejected")

    # Test DocumentDefinition missing name_he
    try:
        doc = DocumentDefinition(
            name="Test Doc",
            source="consultant",
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for missing name_he")
        return False
    except ValidationError as e:
        assert "name_he" in str(e)
        print("  ✓ Missing name_he in DocumentDefinition correctly rejected")

    # Test SpecificationDefinition missing both
    try:
        spec = SpecificationDefinition(
            field_type="text",
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for missing name and name_he")
        return False
    except ValidationError as e:
        assert "name" in str(e) or "name_he" in str(e)
        print("  ✓ Missing bilingual fields in SpecificationDefinition correctly rejected")

    # Test EquipmentTemplateCreate missing name
    try:
        template = EquipmentTemplateCreate(
            name_he="תבנית בדיקה"
        )
        print("  ✗ FAILED: Should have raised ValidationError for missing name")
        return False
    except ValidationError as e:
        assert "name" in str(e)
        print("  ✓ Missing name in EquipmentTemplateCreate correctly rejected")

    print("✅ Test 5 PASSED\n")


def test_field_length_constraints():
    """Test 6: Field length constraints are enforced"""
    print("Test 6: Field length constraints are enforced...")

    # Test name too short
    try:
        doc = DocumentDefinition(
            name="A",  # Too short (min is 2)
            name_he="ב",
            source="consultant",
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for name too short")
        return False
    except ValidationError as e:
        print("  ✓ Name too short correctly rejected")

    # Test name too long
    try:
        doc = DocumentDefinition(
            name="A" * 300,  # Too long (max is 255)
            name_he="ב" * 300,
            source="consultant",
            required=True
        )
        print("  ✗ FAILED: Should have raised ValidationError for name too long")
        return False
    except ValidationError as e:
        print("  ✓ Name too long correctly rejected")

    # Test description too long
    try:
        template = EquipmentTemplateCreate(
            name="Test",
            name_he="בדיקה",
            description="A" * 3000  # Too long (max is 2000)
        )
        print("  ✗ FAILED: Should have raised ValidationError for description too long")
        return False
    except ValidationError as e:
        print("  ✓ Description too long correctly rejected")

    print("✅ Test 6 PASSED\n")


def main():
    """Run all tests"""
    print("=" * 60)
    print("EQUIPMENT TEMPLATE SCHEMA VALIDATION TESTS")
    print("=" * 60)
    print()

    try:
        test_valid_data_passes()
        test_invalid_literal_values()
        test_options_field_validation()
        test_text_sanitization()
        test_bilingual_fields_required()
        test_field_length_constraints()

        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        return 0
    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
