"""
Seed script to populate sample notifications for testing.
Run with: python app/db/seed_notifications.py
"""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.notification import Notification, NotificationCategory
from app.models.user import User

# Sample notification data for testing
SAMPLE_NOTIFICATIONS = [
    {
        "category": NotificationCategory.APPROVAL,
        "title": "Steel Rebar Order Approved",
        "message": "Your steel rebar order #SR-2024-089 has been approved by the project manager. Delivery scheduled for next Monday.",
        "related_entity_type": "order",
        "is_read": False,
        "hours_ago": 2
    },
    {
        "category": NotificationCategory.INSPECTION,
        "title": "Safety Inspection Failed",
        "message": "Floor 3 safety inspection did not pass. Issues found: missing handrails on stairwell B, inadequate lighting in corridor 3A. Re-inspection required.",
        "related_entity_type": "inspection",
        "is_read": False,
        "hours_ago": 5
    },
    {
        "category": NotificationCategory.UPDATE,
        "title": "New Blueprint Uploaded",
        "message": "Updated architectural blueprints for Building A (revision 2.3) have been uploaded to the document management system.",
        "related_entity_type": "document",
        "is_read": True,
        "hours_ago": 24
    },
    {
        "category": NotificationCategory.APPROVAL,
        "title": "Subcontractor Agreement Signed",
        "message": "HVAC installation subcontractor agreement has been finalized and signed. Work commencement date: March 15, 2024.",
        "related_entity_type": "contract",
        "is_read": True,
        "hours_ago": 48
    },
    {
        "category": NotificationCategory.GENERAL,
        "title": "Team Meeting Scheduled",
        "message": "Weekly construction coordination meeting scheduled for Thursday 10:00 AM in the main office conference room.",
        "related_entity_type": "meeting",
        "is_read": False,
        "hours_ago": 8
    },
    {
        "category": NotificationCategory.UPDATE,
        "title": "Weather Alert",
        "message": "Heavy rain forecasted for next 3 days. Outdoor concrete pouring activities should be rescheduled accordingly.",
        "related_entity_type": "alert",
        "is_read": False,
        "hours_ago": 12
    },
    {
        "category": NotificationCategory.INSPECTION,
        "title": "Electrical Inspection Passed",
        "message": "Floor 2 electrical rough-in inspection completed successfully. All wiring meets code requirements. Approved to proceed with drywall.",
        "related_entity_type": "inspection",
        "is_read": True,
        "hours_ago": 72
    },
    {
        "category": NotificationCategory.APPROVAL,
        "title": "Budget Amendment Approved",
        "message": "Additional budget allocation of $45,000 for structural reinforcement has been approved by the client.",
        "related_entity_type": "budget",
        "is_read": True,
        "hours_ago": 96
    },
    {
        "category": NotificationCategory.GENERAL,
        "title": "Site Access Update",
        "message": "New access cards have been issued. Please collect your updated card from the security office by end of week.",
        "related_entity_type": "notification",
        "is_read": False,
        "hours_ago": 16
    },
    {
        "category": NotificationCategory.UPDATE,
        "title": "Equipment Delivery Delayed",
        "message": "Crane delivery postponed by 2 days due to supplier logistics. New estimated arrival: Friday morning.",
        "related_entity_type": "equipment",
        "is_read": False,
        "hours_ago": 3
    }
]


async def seed_notifications():
    """
    Seed sample notifications for testing the notifications panel.
    This function is idempotent - running it multiple times won't create duplicates.
    """
    async with AsyncSessionLocal() as session:
        try:
            # Get the first active user for associating notifications
            result = await session.execute(
                select(User).where(User.is_active == True).limit(1)
            )
            user = result.scalar_one_or_none()

            if not user:
                print("No active user found in database. Please create a user first.")
                return

            notifications_created = 0
            notifications_skipped = 0

            for notification_data in SAMPLE_NOTIFICATIONS:
                # Check if notification with same title already exists (idempotent)
                result = await session.execute(
                    select(Notification).where(
                        Notification.user_id == user.id,
                        Notification.title == notification_data["title"]
                    )
                )
                existing_notification = result.scalar_one_or_none()

                if existing_notification:
                    notifications_skipped += 1
                    continue

                # Calculate created_at based on hours_ago
                created_at = datetime.now(timezone.utc) - timedelta(hours=notification_data["hours_ago"])

                # Create new notification
                notification = Notification(
                    user_id=user.id,
                    category=notification_data["category"].value,
                    title=notification_data["title"],
                    message=notification_data["message"],
                    related_entity_type=notification_data["related_entity_type"],
                    is_read=notification_data["is_read"],
                    created_at=created_at,
                    updated_at=created_at
                )

                session.add(notification)
                notifications_created += 1

            await session.commit()

            print(f"Successfully seeded {notifications_created} notifications for user {user.email}")
            if notifications_skipped > 0:
                print(f"Skipped {notifications_skipped} existing notifications")

        except Exception as e:
            await session.rollback()
            print(f"Error seeding notifications: {e}")
            raise


def main():
    """Entry point for running the seed script."""
    asyncio.run(seed_notifications())


if __name__ == "__main__":
    main()
