"""
RFI Email Conversation Test Script

This script simulates an RFI conversation between:
- Project Manager (sender) - Creates and sends the RFI
- Architect (recipient) - Responds to the RFI
- Back and forth conversation

IMPORTANT: Update the emails below before running!
"""
import asyncio
import sys
from datetime import datetime, timedelta

sys.path.insert(0, '.')

# ============================================
# TEST EMAIL CONFIGURATION
# ============================================
SENDER_EMAIL = "galhadida80@gmail.com"
RECIPIENT_EMAIL = "galhadida80@gmail.com"
# ============================================

async def run_test():
    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
    from sqlalchemy.orm import sessionmaker

    from app.config import get_settings
    from app.models.project import Project
    from app.models.user import User
    from app.services.email_service import EmailService
    from app.services.rfi_service import RFIService

    settings = get_settings()
    print(f"\n{'='*60}")
    print("RFI EMAIL CONVERSATION TEST")
    print(f"{'='*60}")
    print(f"Environment: {settings.environment}")
    print(f"Email Provider: {settings.email_provider}")
    print(f"From Email: {SENDER_EMAIL}")
    print(f"To Email: {RECIPIENT_EMAIL}")
    print(f"{'='*60}\n")

    # Check email service
    email_service = EmailService()
    if not email_service.enabled:
        print("ERROR: Email service is not configured properly!")
        print("Check your SendGrid API key and email settings in .env")
        return

    print(f"Email service enabled: {email_service.enabled}")
    print(f"Provider type: {type(email_service.provider).__name__}\n")

    # Connect to database
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        # Get a user and project for testing
        user_result = await db.execute(select(User).limit(1))
        user = user_result.scalar_one_or_none()

        if not user:
            print("ERROR: No user found in database. Please seed the database first.")
            return

        project_result = await db.execute(select(Project).limit(1))
        project = project_result.scalar_one_or_none()

        if not project:
            print("ERROR: No project found in database. Please seed the database first.")
            return

        print(f"Using User: {user.full_name} ({user.email})")
        print(f"Using Project: {project.name}\n")

        service = RFIService(db)

        # ============================================
        # STEP 1: Create an RFI
        # ============================================
        print("STEP 1: Creating RFI...")
        print("-" * 40)

        rfi = await service.create_rfi(
            project_id=project.id,
            created_by_id=user.id,
            to_email=RECIPIENT_EMAIL,
            to_name="John Smith (Architect)",
            subject="Clarification needed on Foundation Design",
            question="""Dear John,

We are reviewing the foundation drawings for Building A and need clarification on the following:

1. The drawing shows 12" concrete footings, but the structural calculations reference 14" footings. Which is correct?

2. What is the required rebar spacing for the perimeter foundation walls?

3. Are there any specific waterproofing requirements for the below-grade portions?

Please advise at your earliest convenience as this is holding up the excavation work.

Best regards,
Project Team""",
            category="structural",
            priority="high",
            due_date=datetime.utcnow() + timedelta(days=3),
            location="Building A - Foundation",
            drawing_reference="S-101, S-102",
            specification_reference="Section 03 30 00"
        )

        print(f"RFI Created: {rfi.rfi_number}")
        print(f"Subject: {rfi.subject}")
        print(f"Status: {rfi.status}")
        print(f"To: {rfi.to_email}\n")

        # ============================================
        # STEP 2: Send the RFI (triggers first email)
        # ============================================
        print("STEP 2: Sending RFI (Email #1)...")
        print("-" * 40)

        try:
            rfi = await service.send_rfi(rfi.id)
            print("RFI Sent Successfully!")
            print(f"Status updated to: {rfi.status}")
            print(f"Message ID: {rfi.email_message_id}")
            print(f"Thread ID: {rfi.email_thread_id}\n")
        except Exception as e:
            print(f"ERROR sending RFI: {e}")
            print("\nMake sure:")
            print("1. Your SendGrid API key is correct")
            print("2. The sender email is verified in SendGrid")
            return

        # ============================================
        # STEP 3: Simulate Architect's Response
        # ============================================
        print("STEP 3: Simulating Architect Response (Email #2)...")
        print("-" * 40)

        # Add internal response (simulating the architect replied)
        response1 = await service.add_internal_response(
            rfi_id=rfi.id,
            user_id=user.id,
            response_text="""Hi Team,

Thank you for bringing this to my attention. Here are the clarifications:

1. FOOTINGS: The correct dimension is 14" as per the structural calculations. Drawing S-101 will be revised - please use 14" concrete footings.

2. REBAR SPACING: Perimeter foundation walls should have #5 rebar at 12" O.C. both ways, with additional #4 horizontal bars at 16" O.C.

3. WATERPROOFING: Yes, all below-grade concrete surfaces require:
   - Dampproofing membrane (minimum 40 mil)
   - 4" perforated drain tile at footing level
   - 1" rigid insulation board over dampproofing

I'll issue a revised S-101 drawing by end of day tomorrow.

Best regards,
John Smith, AIA
Senior Architect""",
            send_email=True
        )

        print(f"Response added: {response1.id}")
        print(f"From: {response1.from_name}")
        print(f"Email sent: {bool(response1.email_message_id)}\n")

        # ============================================
        # STEP 4: Project Manager Follow-up
        # ============================================
        print("STEP 4: Project Manager Follow-up (Email #3)...")
        print("-" * 40)

        response2 = await service.add_internal_response(
            rfi_id=rfi.id,
            user_id=user.id,
            response_text="""John,

Thank you for the quick response. One follow-up question:

For the dampproofing membrane - do you have a specific product specification, or is any 40 mil membrane acceptable?

Also, should the drain tile connect to the storm sewer or daylight to grade?

Thanks,
Project Team""",
            send_email=True
        )

        print(f"Follow-up sent: {response2.id}")
        print(f"Email sent: {bool(response2.email_message_id)}\n")

        # ============================================
        # STEP 5: Final Architect Response
        # ============================================
        print("STEP 5: Final Architect Response (Email #4)...")
        print("-" * 40)

        response3 = await service.add_internal_response(
            rfi_id=rfi.id,
            user_id=user.id,
            response_text="""Team,

Good questions:

1. DAMPPROOFING: Use Carlisle CCW MiraDRI 860/861 or approved equal. The spec section 07 11 13 has the full requirements.

2. DRAIN TILE: Connect to the storm sewer system per the civil drawings. See C-201 for connection points.

I'm closing this RFI as resolved. Please let me know if you need anything else.

John""",
            send_email=True
        )

        print(f"Final response sent: {response3.id}")
        print(f"Email sent: {bool(response3.email_message_id)}\n")

        # ============================================
        # STEP 6: Close the RFI
        # ============================================
        print("STEP 6: Closing RFI...")
        print("-" * 40)

        rfi = await service.update_status(rfi.id, "closed")
        print(f"RFI Status: {rfi.status}")
        print(f"Closed at: {rfi.closed_at}\n")

        # ============================================
        # Summary
        # ============================================
        print("=" * 60)
        print("TEST COMPLETE - SUMMARY")
        print("=" * 60)
        print(f"RFI Number: {rfi.rfi_number}")
        print("Total Emails Sent: 4")
        print("  - Initial RFI")
        print("  - Architect Response")
        print("  - PM Follow-up")
        print("  - Final Response")
        print(f"\nCheck your inbox at: {RECIPIENT_EMAIL}")
        print("=" * 60)

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_test())
