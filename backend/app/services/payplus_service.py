import hashlib
import logging
from typing import Any, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class PayPlusService:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://restapi.payplus.co.il"
        self.api_key = self.settings.payplus_api_key
        self.secret_key = self.settings.payplus_secret_key

    @property
    def enabled(self) -> bool:
        return bool(self.api_key and self.secret_key)

    def _get_headers(self) -> dict[str, str]:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[dict] = None
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()

        async with httpx.AsyncClient() as client:
            try:
                if method == "GET":
                    response = await client.get(url, headers=headers)
                elif method == "POST":
                    response = await client.post(url, headers=headers, json=data)
                elif method == "PUT":
                    response = await client.put(url, headers=headers, json=data)
                elif method == "DELETE":
                    response = await client.delete(url, headers=headers)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")

                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"PayPlus API error: {e.response.status_code} - {e.response.text}")
                raise
            except httpx.RequestError as e:
                logger.error(f"PayPlus request failed: {e}")
                raise

    async def create_customer(
        self,
        customer_name: str,
        email: str,
        phone: Optional[str] = None,
        customer_external_number: Optional[str] = None
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        try:
            data = {
                "customer_name": customer_name,
                "email": email
            }

            if phone:
                data["phone"] = phone
            if customer_external_number:
                data["customer_external_number"] = customer_external_number

            result = await self._make_request("POST", "/api/v1.0/Customers/Add", data)
            logger.info(f"Created PayPlus customer: {result.get('customer_uid')}")
            return result
        except Exception as e:
            logger.error(f"Failed to create PayPlus customer: {e}")
            raise

    async def create_payment_page(
        self,
        amount: float,
        currency_code: str = "ILS",
        customer_name: Optional[str] = None,
        email: Optional[str] = None,
        description: Optional[str] = None,
        payment_page_uid: Optional[str] = None,
        customer_uid: Optional[str] = None,
        success_url: Optional[str] = None,
        failure_url: Optional[str] = None,
        notification_url: Optional[str] = None
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        try:
            data: dict[str, Any] = {
                "payment_page_uid": payment_page_uid or "",
                "amount": amount,
                "currency_code": currency_code
            }

            if customer_name:
                data["customer_name"] = customer_name
            if email:
                data["email"] = email
            if description:
                data["description"] = description
            if customer_uid:
                data["customer_uid"] = customer_uid
            if success_url:
                data["success_url"] = success_url
            if failure_url:
                data["failure_url"] = failure_url
            if notification_url:
                data["notification_url"] = notification_url

            result = await self._make_request("POST", "/api/v1.0/PaymentPages/generateLink", data)
            logger.info(f"Created PayPlus payment page: {result.get('payment_page_link')}")
            return result
        except Exception as e:
            logger.error(f"Failed to create PayPlus payment page: {e}")
            raise

    async def create_subscription(
        self,
        customer_uid: str,
        amount: float,
        currency_code: str = "ILS",
        interval: str = "month",
        interval_count: int = 1,
        trial_period_days: Optional[int] = None,
        description: Optional[str] = None
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        try:
            data: dict[str, Any] = {
                "customer_uid": customer_uid,
                "amount": amount,
                "currency_code": currency_code,
                "interval": interval,
                "interval_count": interval_count
            }

            if trial_period_days is not None:
                data["trial_period_days"] = trial_period_days
            if description:
                data["description"] = description

            result = await self._make_request("POST", "/api/v1.0/Subscriptions/Create", data)
            logger.info(f"Created PayPlus subscription: {result.get('subscription_uid')}")
            return result
        except Exception as e:
            logger.error(f"Failed to create PayPlus subscription: {e}")
            raise

    async def update_subscription(
        self,
        subscription_uid: str,
        amount: Optional[float] = None,
        status: Optional[str] = None
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        try:
            data: dict[str, Any] = {
                "subscription_uid": subscription_uid
            }

            if amount is not None:
                data["amount"] = amount
            if status is not None:
                data["status"] = status

            result = await self._make_request("PUT", "/api/v1.0/Subscriptions/Update", data)
            logger.info(f"Updated PayPlus subscription: {subscription_uid}")
            return result
        except Exception as e:
            logger.error(f"Failed to update PayPlus subscription: {e}")
            raise

    async def cancel_subscription(
        self,
        subscription_uid: str
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        try:
            data = {
                "subscription_uid": subscription_uid,
                "status": "canceled"
            }

            result = await self._make_request("PUT", "/api/v1.0/Subscriptions/Update", data)
            logger.info(f"Cancelled PayPlus subscription: {subscription_uid}")
            return result
        except Exception as e:
            logger.error(f"Failed to cancel PayPlus subscription: {e}")
            raise

    async def get_transaction(
        self,
        transaction_uid: str
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        try:
            result = await self._make_request(
                "GET",
                f"/api/v1.0/Transactions/Get?transaction_uid={transaction_uid}"
            )
            return result
        except Exception as e:
            logger.error(f"Failed to retrieve PayPlus transaction: {e}")
            raise

    async def refund_transaction(
        self,
        transaction_uid: str,
        amount: Optional[float] = None
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        try:
            data: dict[str, Any] = {
                "transaction_uid": transaction_uid
            }

            if amount is not None:
                data["amount"] = amount

            result = await self._make_request("POST", "/api/v1.0/Transactions/Refund", data)
            logger.info(f"Refunded PayPlus transaction: {transaction_uid}")
            return result
        except Exception as e:
            logger.error(f"Failed to refund PayPlus transaction: {e}")
            raise

    def verify_webhook_signature(
        self,
        payload: dict[str, Any],
        signature: str
    ) -> bool:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        if not self.settings.payplus_webhook_secret:
            raise RuntimeError("PayPlus webhook secret is not configured")

        try:
            payload_string = str(payload)
            expected_signature = hashlib.sha256(
                f"{payload_string}{self.settings.payplus_webhook_secret}".encode()
            ).hexdigest()

            is_valid = signature == expected_signature
            if is_valid:
                logger.info("PayPlus webhook signature verified successfully")
            else:
                logger.warning("PayPlus webhook signature verification failed")

            return is_valid
        except Exception as e:
            logger.error(f"Failed to verify PayPlus webhook signature: {e}")
            return False

    async def get_invoice(
        self,
        invoice_uid: str
    ) -> dict[str, Any]:
        if not self.enabled:
            raise RuntimeError("PayPlus service is not configured")

        try:
            result = await self._make_request(
                "GET",
                f"/api/v1.0/Invoices/Get?invoice_uid={invoice_uid}"
            )
            return result
        except Exception as e:
            logger.error(f"Failed to retrieve PayPlus invoice: {e}")
            raise
