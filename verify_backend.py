#!/usr/bin/env python3
"""Backend verification script for notification prioritization."""

import sys
sys.path.insert(0, './backend')

try:
    from app.models.notification import Notification, UrgencyLevel
    from app.models.notification_preference import NotificationPreference
    from app.models.notification_interaction import NotificationInteraction
    print("✓ All models import successfully")

    from app.schemas.notification import NotificationResponse
    from app.schemas.notification_preference import NotificationPreferenceResponse
    print("✓ All schemas import successfully")

    from app.services.notification_priority_service import calculate_notification_urgency
    from app.services.notification_service import track_notification_interaction
    print("✓ All service functions import successfully")

    # Verify UrgencyLevel enum values
    expected_levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    actual_levels = [level.name for level in UrgencyLevel]
    assert set(actual_levels) == set(expected_levels), f"Urgency levels mismatch: {actual_levels}"
    print("✓ UrgencyLevel enum has correct values")

    print("\n✅ Backend verification complete - all imports successful")

except Exception as e:
    print(f"❌ Backend verification failed: {e}")
    sys.exit(1)
