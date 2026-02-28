import logging
from typing import Any, Optional

import stripe

from app.config import get_settings

logger = logging.getLogger(__name__)


class StripeService:
    def __init__(self):
        self.settings = get_settings()
        stripe.api_key = self.settings.stripe_secret_key

    @property
    def enabled(self) -> bool:
        return bool(self.settings.stripe_secret_key)

    def create_customer(
        self,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> stripe.Customer:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata=metadata or {}
            )
            logger.info(f"Created Stripe customer: {customer.id}")
            return customer
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe customer: {e}")
            raise

    def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_period_days: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> stripe.Subscription:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            params: dict[str, Any] = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "metadata": metadata or {}
            }

            if trial_period_days is not None:
                params["trial_period_days"] = trial_period_days

            subscription = stripe.Subscription.create(**params)
            logger.info(f"Created Stripe subscription: {subscription.id}")
            return subscription
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe subscription: {e}")
            raise

    def update_subscription(
        self,
        subscription_id: str,
        price_id: Optional[str] = None,
        quantity: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> stripe.Subscription:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            params: dict[str, Any] = {}

            if price_id is not None:
                subscription = stripe.Subscription.retrieve(subscription_id)
                params["items"] = [{
                    "id": subscription["items"]["data"][0].id,
                    "price": price_id
                }]

            if quantity is not None:
                params["quantity"] = quantity

            if metadata is not None:
                params["metadata"] = metadata

            subscription = stripe.Subscription.modify(subscription_id, **params)
            logger.info(f"Updated Stripe subscription: {subscription_id}")
            return subscription
        except stripe.StripeError as e:
            logger.error(f"Failed to update Stripe subscription: {e}")
            raise

    def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True
    ) -> stripe.Subscription:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            if at_period_end:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                subscription = stripe.Subscription.cancel(subscription_id)

            logger.info(f"Cancelled Stripe subscription: {subscription_id}")
            return subscription
        except stripe.StripeError as e:
            logger.error(f"Failed to cancel Stripe subscription: {e}")
            raise

    def create_payment_intent(
        self,
        amount: int,
        currency: str = "usd",
        customer_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> stripe.PaymentIntent:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            params: dict[str, Any] = {
                "amount": amount,
                "currency": currency,
                "metadata": metadata or {}
            }

            if customer_id:
                params["customer"] = customer_id

            payment_intent = stripe.PaymentIntent.create(**params)
            logger.info(f"Created payment intent: {payment_intent.id}")
            return payment_intent
        except stripe.StripeError as e:
            logger.error(f"Failed to create payment intent: {e}")
            raise

    def attach_payment_method(
        self,
        payment_method_id: str,
        customer_id: str
    ) -> stripe.PaymentMethod:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id
            )
            logger.info(f"Attached payment method {payment_method_id} to customer {customer_id}")
            return payment_method
        except stripe.StripeError as e:
            logger.error(f"Failed to attach payment method: {e}")
            raise

    def detach_payment_method(
        self,
        payment_method_id: str
    ) -> stripe.PaymentMethod:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            payment_method = stripe.PaymentMethod.detach(payment_method_id)
            logger.info(f"Detached payment method: {payment_method_id}")
            return payment_method
        except stripe.StripeError as e:
            logger.error(f"Failed to detach payment method: {e}")
            raise

    def list_payment_methods(
        self,
        customer_id: str,
        type: str = "card"
    ) -> list[stripe.PaymentMethod]:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type=type
            )
            return payment_methods.data
        except stripe.StripeError as e:
            logger.error(f"Failed to list payment methods: {e}")
            raise

    def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_period_days: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> stripe.checkout.Session:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            params: dict[str, Any] = {
                "customer": customer_id,
                "payment_method_types": ["card"],
                "line_items": [{"price": price_id, "quantity": 1}],
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "metadata": metadata or {}
            }

            if trial_period_days is not None:
                params["subscription_data"] = {"trial_period_days": trial_period_days}

            session = stripe.checkout.Session.create(**params)
            logger.info(f"Created checkout session: {session.id}")
            return session
        except stripe.StripeError as e:
            logger.error(f"Failed to create checkout session: {e}")
            raise

    def construct_webhook_event(
        self,
        payload: bytes,
        signature: str
    ) -> stripe.Event:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        if not self.settings.stripe_webhook_secret:
            raise RuntimeError("Stripe webhook secret is not configured")

        try:
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self.settings.stripe_webhook_secret
            )
            logger.info(f"Verified webhook event: {event.type}")
            return event
        except stripe.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {e}")
            raise
        except stripe.StripeError as e:
            logger.error(f"Failed to construct webhook event: {e}")
            raise

    def retrieve_invoice(self, invoice_id: str) -> stripe.Invoice:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            invoice = stripe.Invoice.retrieve(invoice_id)
            return invoice
        except stripe.StripeError as e:
            logger.error(f"Failed to retrieve invoice: {e}")
            raise

    def list_invoices(
        self,
        customer_id: str,
        limit: int = 100
    ) -> list[stripe.Invoice]:
        if not self.enabled:
            raise RuntimeError("Stripe service is not configured")

        try:
            invoices = stripe.Invoice.list(
                customer=customer_id,
                limit=limit
            )
            return invoices.data
        except stripe.StripeError as e:
            logger.error(f"Failed to list invoices: {e}")
            raise
