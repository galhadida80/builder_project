#!/usr/bin/env python3
"""Verify model file syntax and structure without imports"""
import ast
import sys

def verify_model_structure():
    """Parse and verify the model file structure"""

    with open('./backend/app/models/equipment_template.py', 'r') as f:
        code = f.read()

    # Parse the AST
    try:
        tree = ast.parse(code)
        print("✓ File syntax is valid")
    except SyntaxError as e:
        print(f"✗ Syntax error: {e}")
        return False

    # Find the EquipmentApprovalSubmission class
    submission_class = None
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == 'EquipmentApprovalSubmission':
            submission_class = node
            break

    if not submission_class:
        print("✗ EquipmentApprovalSubmission class not found")
        return False

    print("✓ EquipmentApprovalSubmission class found")

    # Check for JSONB fields with default=dict
    jsonb_fields = ['specifications', 'documents', 'checklist_responses', 'additional_data']
    found_defaults = []

    for stmt in submission_class.body:
        if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
            field_name = stmt.target.id
            if field_name in jsonb_fields:
                # Check if it has default=dict in the mapped_column call
                if isinstance(stmt.value, ast.Call):
                    for keyword in stmt.value.keywords:
                        if keyword.arg == 'default':
                            if isinstance(keyword.value, ast.Name) and keyword.value.id == 'dict':
                                found_defaults.append(field_name)
                                print(f"✓ Field '{field_name}' has default=dict")

    # Verify all JSONB fields have defaults
    missing = set(jsonb_fields) - set(found_defaults)
    if missing:
        print(f"✗ Missing default=dict for fields: {missing}")
        return False

    print("✓ All JSONB fields have default=dict")
    print("\n✓ Model structure verification PASSED")
    print("  - File syntax is valid")
    print("  - EquipmentApprovalSubmission class exists")
    print(f"  - All {len(jsonb_fields)} JSONB fields have default=dict")
    print("\nNote: Actual instantiation test requires SQLAlchemy installation")
    print("The model follows the exact pattern from backend/app/models/equipment.py")
    return True

if __name__ == '__main__':
    success = verify_model_structure()
    sys.exit(0 if success else 1)
