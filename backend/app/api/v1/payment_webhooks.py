import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.services.stripe_service import StripeService
from app.services.payplus_service import PayPlusService
from app.services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["payment_webhooks"])
settings = get_settings()


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhook events for payment and subscription updates."""
    stripe_service = StripeService()

    if not stripe_service.enabled:
        raise HTTPException(status_code=503, detail="Stripe service not configured")

    signature = request.headers.get("Stripe-Signature", "")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        body = await request.body()
        event = stripe_service.verify_webhook_signature(body.decode("utf-8"), signature)
    except ValueError as e:
        logger.warning(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception as e:
        logger.warning(f"Webhook signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type", "unknown")
    logger.info(f"Received Stripe webhook event: {event_type}")

    # Process event in background
    background_tasks.add_task(
        process_stripe_event,
        event=event,
        event_type=event_type
    )

    return {"status": "ok", "event_type": event_type}


@router.post("/payplus")
async def payplus_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Handle PayPlus webhook events for payment and subscription updates."""
    payplus_service = PayPlusService()

    if not payplus_service.enabled:
        raise HTTPException(status_code=503, detail="PayPlus service not configured")

    signature = request.headers.get("X-PayPlus-Signature", "")
    if not signature:
        raise HTTPException(status_code=400, detail="Missing X-PayPlus-Signature header")

    try:
        body = await request.body()
        is_valid = payplus_service.verify_webhook_signature(body.decode("utf-8"), signature)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Invalid signature")

        import json
        payload = json.loads(body)
    except json.JSONDecodeError:
        logger.warning("Invalid PayPlus webhook payload")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.warning(f"PayPlus webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Verification failed")

    event_type = payload.get("event_type", "unknown")
    logger.info(f"Received PayPlus webhook event: {event_type}")

    # Process event in background
    background_tasks.add_task(
        process_payplus_event,
        payload=payload,
        event_type=event_type
    )

    return {"status": "ok", "event_type": event_type}


async def process_stripe_event(event: dict[str, Any], event_type: str):
    """Process Stripe webhook events asynchronously."""
    from app.db.session import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as db:
            subscription_service = SubscriptionService(db)

            event_data = event.get("data", {}).get("object", {})

            if event_type == "payment_intent.succeeded":
                await handle_payment_succeeded(subscription_service, event_data, "stripe")

            elif event_type == "payment_intent.payment_failed":
                await handle_payment_failed(subscription_service, event_data, "stripe")

            elif event_type == "customer.subscription.updated":
                await handle_subscription_updated(subscription_service, event_data, "stripe")

            elif event_type == "customer.subscription.deleted":
                await handle_subscription_canceled(subscription_service, event_data, "stripe")

            elif event_type == "invoice.payment_succeeded":
                await handle_invoice_payment_succeeded(subscription_service, event_data, "stripe")

            elif event_type == "invoice.payment_failed":
                await handle_invoice_payment_failed(subscription_service, event_data, "stripe")

            else:
                logger.info(f"Unhandled Stripe event type: {event_type}")

    except Exception as e:
        logger.error(f"Failed to process Stripe event {event_type}: {e}")


async def process_payplus_event(payload: dict[str, Any], event_type: str):
    """Process PayPlus webhook events asynchronously."""
    from app.db.session import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as db:
            subscription_service = SubscriptionService(db)

            event_data = payload.get("data", {})

            if event_type == "payment.succeeded":
                await handle_payment_succeeded(subscription_service, event_data, "payplus")

            elif event_type == "payment.failed":
                await handle_payment_failed(subscription_service, event_data, "payplus")

            elif event_type == "subscription.updated":
                await handle_subscription_updated(subscription_service, event_data, "payplus")

            elif event_type == "subscription.canceled":
                await handle_subscription_canceled(subscription_service, event_data, "payplus")

            else:
                logger.info(f"Unhandled PayPlus event type: {event_type}")

    except Exception as e:
        logger.error(f"Failed to process PayPlus event {event_type}: {e}")


async def handle_payment_succeeded(
    service: SubscriptionService,
    data: dict[str, Any],
    provider: str
):
    """Handle successful payment event."""
    try:
        # Extract relevant info based on provider
        if provider == "stripe":
            customer_id = data.get("customer")
            amount = data.get("amount", 0) / 100  # Stripe uses cents
            payment_id = data.get("id")
        else:  # payplus
            customer_id = data.get("customer_uid")
            amount = data.get("amount", 0)
            payment_id = data.get("transaction_uid")

        logger.info(f"Payment succeeded for customer {customer_id}: ${amount} ({provider})")

        # Mark invoice as paid if applicable
        await service.mark_invoice_paid(payment_id, provider)

    except Exception as e:
        logger.error(f"Error handling payment succeeded: {e}")


async def handle_payment_failed(
    service: SubscriptionService,
    data: dict[str, Any],
    provider: str
):
    """Handle failed payment event."""
    try:
        if provider == "stripe":
            customer_id = data.get("customer")
            payment_id = data.get("id")
            error = data.get("last_payment_error", {}).get("message", "Unknown error")
        else:  # payplus
            customer_id = data.get("customer_uid")
            payment_id = data.get("transaction_uid")
            error = data.get("error_message", "Unknown error")

        logger.warning(f"Payment failed for customer {customer_id}: {error} ({provider})")

        # Mark invoice as failed
        await service.mark_invoice_failed(payment_id, provider, error)

    except Exception as e:
        logger.error(f"Error handling payment failed: {e}")


async def handle_subscription_updated(
    service: SubscriptionService,
    data: dict[str, Any],
    provider: str
):
    """Handle subscription update event."""
    try:
        if provider == "stripe":
            subscription_id = data.get("id")
            status = data.get("status")
            items = data.get("items", {}).get("data", [])
            plan_id = items[0].get("price", {}).get("id") if items else None
        else:  # payplus
            subscription_id = data.get("subscription_uid")
            status = data.get("status")
            plan_id = data.get("plan_uid")

        logger.info(f"Subscription updated: {subscription_id} -> {status} ({provider})")

        # Sync subscription status
        await service.sync_subscription_from_webhook(subscription_id, status, plan_id, provider)

    except Exception as e:
        logger.error(f"Error handling subscription update: {e}")


async def handle_subscription_canceled(
    service: SubscriptionService,
    data: dict[str, Any],
    provider: str
):
    """Handle subscription cancellation event."""
    try:
        if provider == "stripe":
            subscription_id = data.get("id")
        else:  # payplus
            subscription_id = data.get("subscription_uid")

        logger.info(f"Subscription canceled: {subscription_id} ({provider})")

        # Mark subscription as canceled
        await service.handle_subscription_cancellation(subscription_id, provider)

    except Exception as e:
        logger.error(f"Error handling subscription cancellation: {e}")


async def handle_invoice_payment_succeeded(
    service: SubscriptionService,
    data: dict[str, Any],
    provider: str
):
    """Handle successful invoice payment."""
    try:
        invoice_id = data.get("id")
        amount_paid = data.get("amount_paid", 0) / 100  # Stripe uses cents

        logger.info(f"Invoice {invoice_id} paid: ${amount_paid} ({provider})")

        await service.mark_invoice_paid(invoice_id, provider)

    except Exception as e:
        logger.error(f"Error handling invoice payment: {e}")


async def handle_invoice_payment_failed(
    service: SubscriptionService,
    data: dict[str, Any],
    provider: str
):
    """Handle failed invoice payment."""
    try:
        invoice_id = data.get("id")

        logger.warning(f"Invoice {invoice_id} payment failed ({provider})")

        await service.mark_invoice_failed(invoice_id, provider, "Payment failed")

    except Exception as e:
        logger.error(f"Error handling invoice payment failure: {e}")
