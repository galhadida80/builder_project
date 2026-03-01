#!/usr/bin/env python3
"""Verify all permit-related imports work correctly."""

import sys
sys.path.insert(0, './backend')

try:
    from app.models.permit import Permit, PermitStatus, PermitType
    print("✓ Permit model imports successfully")

    from app.schemas.permit import PermitCreate, PermitResponse, PermitStatusUpdate
    print("✓ Permit schemas import successfully")

    from app.services.permit_deadline_service import check_permit_deadlines
    print("✓ Permit deadline service imports successfully")

    from app.services.permit_service import check_milestone_permit_requirements
    print("✓ Permit service imports successfully")

    from app.services.permit_report_service import generate_permit_compliance_pdf
    print("✓ Permit report service imports successfully")

    print("\n✓ All backend modules import successfully!")
    sys.exit(0)

except Exception as e:
    print(f"✗ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
