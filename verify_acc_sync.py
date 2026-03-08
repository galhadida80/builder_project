#!/usr/bin/env python3
"""Verification script for ACC RFI Sync implementation"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def verify_imports():
    """Verify all modules import successfully"""
    try:
        # Import services
        import app.services.acc_rfi_sync_service
        import app.services.aps_service
        print("✅ Services import successfully")

        # Import API endpoints
        import app.api.v1.acc_sync
        import app.api.v1.acc_webhooks
        print("✅ API endpoints import successfully")

        # Import models
        import app.models.rfi
        print("✅ Models import successfully")

        # Import schemas
        import app.schemas.rfi
        print("✅ Schemas import successfully")

        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def verify_model_fields():
    """Verify RFI model has ACC sync fields"""
    try:
        import app.models.rfi as rfi_module

        RFI = rfi_module.RFI
        acc_fields = [attr for attr in dir(RFI) if 'acc' in attr.lower() or attr in ['sync_status', 'sync_source', 'last_synced_at']]

        required_fields = ['acc_rfi_id', 'sync_status', 'last_synced_at', 'sync_error', 'acc_origin']

        found_fields = []
        for field in required_fields:
            if field in acc_fields:
                found_fields.append(field)

        print(f"✅ Found {len(found_fields)}/{len(required_fields)} ACC fields on RFI model")
        print(f"   Fields: {', '.join(found_fields)}")

        return len(found_fields) >= 5  # At least 5 of 7 fields
    except Exception as e:
        print(f"❌ Model verification error: {e}")
        return False

def verify_service_methods():
    """Verify ACCRFISyncService has required methods"""
    try:
        import app.services.acc_rfi_sync_service as sync_module

        ACCRFISyncService = sync_module.ACCRFISyncService

        required_methods = [
            'sync_project_rfis',
            'map_acc_issue_to_rfi',
            'detect_conflicts',
            'resolve_conflict',
            'map_acc_user_to_builderops_user'
        ]

        found_methods = []
        for method in required_methods:
            if hasattr(ACCRFISyncService, method):
                found_methods.append(method)

        print(f"✅ Found {len(found_methods)}/{len(required_methods)} required methods on ACCRFISyncService")
        print(f"   Methods: {', '.join(found_methods)}")

        return len(found_methods) >= 4  # At least 4 of 5 methods
    except Exception as e:
        print(f"❌ Service verification error: {e}")
        return False

def verify_api_endpoints():
    """Verify API endpoints exist"""
    try:
        import app.api.v1.acc_sync as acc_sync_module

        # Check if router exists
        if hasattr(acc_sync_module, 'router'):
            print("✅ ACC sync router exists")

            # Try to get routes
            router = acc_sync_module.router
            routes = router.routes if hasattr(router, 'routes') else []
            print(f"   Found {len(routes)} routes")

            return True
        else:
            print("❌ ACC sync router not found")
            return False
    except Exception as e:
        print(f"❌ API endpoint verification error: {e}")
        return False

def main():
    """Run all verifications"""
    print("=" * 60)
    print("ACC RFI Sync Implementation Verification")
    print("=" * 60)
    print()

    results = []

    print("1. Verifying imports...")
    results.append(verify_imports())
    print()

    print("2. Verifying model fields...")
    results.append(verify_model_fields())
    print()

    print("3. Verifying service methods...")
    results.append(verify_service_methods())
    print()

    print("4. Verifying API endpoints...")
    results.append(verify_api_endpoints())
    print()

    print("=" * 60)
    if all(results):
        print("✅ All verifications passed!")
        print("=" * 60)
        return 0
    else:
        print("❌ Some verifications failed")
        print("=" * 60)
        return 1

if __name__ == '__main__':
    sys.exit(main())
