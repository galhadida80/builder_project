"""
Tests for rate limiting on authentication endpoints.

Rate limiting is implemented using slowapi and applies to:
- /register: 5 requests per 5 minutes
- /login: 5 requests per 5 minutes
- /forgot-password: 3 requests per 5 minutes
- /reset-password: 5 requests per 5 minutes

These tests verify that rate limiting works correctly by:
1. Enabling rate limiting (disabled by default in conftest.py)
2. Making N+1 requests where N is the limit
3. Verifying the N+1th request returns 429 Too Many Requests
4. Testing IP-based client identification
"""

import uuid
from typing import AsyncGenerator

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.main import app
from app.middleware.rate_limiter import get_rate_limiter
from app.models.user import User

API = "/api/v1/auth"


@pytest.fixture(scope="function")
async def rate_limited_client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture that provides an HTTP client with rate limiting ENABLED.

    Unlike the default client fixture which disables rate limiting,
    this fixture enables it to test the rate limiting behavior.
    Uses in-memory storage for test isolation.
    """
    # Enable rate limiting for this test
    get_settings().rate_limit_enabled = True

    # Access the limiter from app.state (the actual instance used by routes)
    limiter = app.state.limiter
    limiter.enabled = True

    # Reset all rate limits for this test by calling the storage reset method
    limiter._storage.reset()

    async def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    # Restore default (disabled) after test
    get_settings().rate_limit_enabled = False
    limiter.enabled = False
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def test_user(db: AsyncSession) -> User:
    """Create a test user for login rate limiting tests."""
    from app.core.security import get_password_hash

    user = User(
        id=uuid.uuid4(),
        email="ratelimit@test.com",
        password_hash=get_password_hash("TestPass123!"),
        full_name="Rate Limit Test User",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


class TestRegisterRateLimiting:
    """Test rate limiting on /register endpoint (5 requests per 5 minutes)."""

    @pytest.mark.asyncio
    async def test_register_rate_limit_blocks_6th_request(self, rate_limited_client: AsyncClient):
        """Verify that 6th registration attempt is blocked with 429."""
        # Make 5 successful requests (at the limit)
        for i in range(5):
            resp = await rate_limited_client.post(
                f"{API}/register",
                json={
                    "email": f"user{i}@test.com",
                    "password": "StrongP1ss!",
                    "full_name": "Test User"
                }
            )
            assert resp.status_code == 201, f"Request {i+1} should succeed"

        # 6th request should be rate limited
        resp = await rate_limited_client.post(
            f"{API}/register",
            json={
                "email": "user6@test.com",
                "password": "StrongP1ss!",
                "full_name": "Test User"
            }
        )
        assert resp.status_code == 429, "6th request should be rate limited"

    @pytest.mark.asyncio
    async def test_register_rate_limit_error_message(self, rate_limited_client: AsyncClient):
        """Verify rate limit error response format."""
        # Exhaust the rate limit
        for i in range(5):
            await rate_limited_client.post(
                f"{API}/register",
                json={
                    "email": f"user{i}@test.com",
                    "password": "StrongP1ss!",
                    "full_name": "Test User"
                }
            )

        # Check error message
        resp = await rate_limited_client.post(
            f"{API}/register",
            json={
                "email": "user6@test.com",
                "password": "StrongP1ss!",
                "full_name": "Test User"
            }
        )
        assert resp.status_code == 429
        body = resp.json()
        # slowapi returns error in "error" key, not "detail"
        assert "error" in body
        error_str = str(body["error"]).lower()
        assert "limit" in error_str or "rate" in error_str or "exceeded" in error_str

    @pytest.mark.asyncio
    async def test_register_different_ips_tracked_separately(self, rate_limited_client: AsyncClient):
        """Verify that different IPs get separate rate limits."""
        # Make 5 requests from IP1
        for i in range(5):
            resp = await rate_limited_client.post(
                f"{API}/register",
                json={
                    "email": f"ip1user{i}@test.com",
                    "password": "StrongP1ss!",
                    "full_name": "Test User"
                },
                headers={"X-Forwarded-For": "192.168.1.1"}
            )
            assert resp.status_code == 201

        # 6th request from IP1 should be blocked
        resp = await rate_limited_client.post(
            f"{API}/register",
            json={
                "email": "ip1user6@test.com",
                "password": "StrongP1ss!",
                "full_name": "Test User"
            },
            headers={"X-Forwarded-For": "192.168.1.1"}
        )
        assert resp.status_code == 429

        # But request from IP2 should succeed (separate limit)
        resp = await rate_limited_client.post(
            f"{API}/register",
            json={
                "email": "ip2user1@test.com",
                "password": "StrongP1ss!",
                "full_name": "Test User"
            },
            headers={"X-Forwarded-For": "192.168.1.2"}
        )
        assert resp.status_code == 201


class TestLoginRateLimiting:
    """Test rate limiting on /login endpoint (5 requests per 5 minutes)."""

    @pytest.mark.asyncio
    async def test_login_rate_limit_blocks_6th_request(
        self, rate_limited_client: AsyncClient, test_user: User
    ):
        """Verify that 6th login attempt is blocked with 429."""
        login_data = {"email": test_user.email, "password": "TestPass123!"}

        # Make 5 requests (at the limit)
        for i in range(5):
            resp = await rate_limited_client.post(f"{API}/login", json=login_data)
            # First request succeeds, others might fail due to auth but not rate limiting
            assert resp.status_code in [200, 401], f"Request {i+1} should not be rate limited"

        # 6th request should be rate limited (regardless of auth)
        resp = await rate_limited_client.post(f"{API}/login", json=login_data)
        assert resp.status_code == 429, "6th request should be rate limited"

    @pytest.mark.asyncio
    async def test_login_rate_limit_applies_to_failed_attempts(
        self, rate_limited_client: AsyncClient
    ):
        """Verify rate limiting applies to failed login attempts (brute force protection)."""
        # Make 5 failed login attempts
        for i in range(5):
            resp = await rate_limited_client.post(
                f"{API}/login",
                json={"email": "nonexistent@test.com", "password": "WrongPass123!"}
            )
            assert resp.status_code == 401, f"Request {i+1} should fail auth but not rate limit"

        # 6th attempt should be rate limited
        resp = await rate_limited_client.post(
            f"{API}/login",
            json={"email": "nonexistent@test.com", "password": "WrongPass123!"}
        )
        assert resp.status_code == 429, "6th failed login should be rate limited"

    @pytest.mark.asyncio
    async def test_login_x_forwarded_for_handling(
        self, rate_limited_client: AsyncClient, test_user: User
    ):
        """Verify that X-Forwarded-For header is used for client identification."""
        login_data = {"email": test_user.email, "password": "TestPass123!"}

        # Make 5 requests with X-Forwarded-For header
        for i in range(5):
            resp = await rate_limited_client.post(
                f"{API}/login",
                json=login_data,
                headers={"X-Forwarded-For": "10.0.0.1"}
            )
            assert resp.status_code in [200, 401]

        # 6th request with same IP should be blocked
        resp = await rate_limited_client.post(
            f"{API}/login",
            json=login_data,
            headers={"X-Forwarded-For": "10.0.0.1"}
        )
        assert resp.status_code == 429

        # Request from different IP should succeed
        resp = await rate_limited_client.post(
            f"{API}/login",
            json=login_data,
            headers={"X-Forwarded-For": "10.0.0.2"}
        )
        assert resp.status_code in [200, 401], "Different IP should not be rate limited"

    @pytest.mark.asyncio
    async def test_login_x_forwarded_for_multiple_ips(
        self, rate_limited_client: AsyncClient, test_user: User
    ):
        """Verify that first IP in X-Forwarded-For chain is used."""
        login_data = {"email": test_user.email, "password": "TestPass123!"}

        # X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
        # We should use the first one (client IP)
        for i in range(5):
            resp = await rate_limited_client.post(
                f"{API}/login",
                json=login_data,
                headers={"X-Forwarded-For": "203.0.113.1, 198.51.100.1, 192.0.2.1"}
            )
            assert resp.status_code in [200, 401]

        # 6th request with same client IP should be blocked
        resp = await rate_limited_client.post(
            f"{API}/login",
            json=login_data,
            headers={"X-Forwarded-For": "203.0.113.1, 198.51.100.99, 192.0.2.99"}
        )
        assert resp.status_code == 429


class TestForgotPasswordRateLimiting:
    """Test rate limiting on /forgot-password endpoint (3 requests per 5 minutes)."""

    @pytest.mark.asyncio
    async def test_forgot_password_rate_limit_blocks_4th_request(
        self, rate_limited_client: AsyncClient, test_user: User
    ):
        """Verify that 4th forgot-password request is blocked with 429."""
        # Make 3 requests (at the limit - note: forgot-password has lower limit)
        for i in range(3):
            resp = await rate_limited_client.post(
                f"{API}/forgot-password",
                json={"email": test_user.email}
            )
            assert resp.status_code == 200, f"Request {i+1} should succeed"

        # 4th request should be rate limited
        resp = await rate_limited_client.post(
            f"{API}/forgot-password",
            json={"email": test_user.email}
        )
        assert resp.status_code == 429, "4th request should be rate limited"

    @pytest.mark.asyncio
    async def test_forgot_password_prevents_email_bombing(
        self, rate_limited_client: AsyncClient
    ):
        """Verify rate limiting prevents email bombing via forgot-password."""
        # Attempt to spam forgot-password requests
        for i in range(3):
            resp = await rate_limited_client.post(
                f"{API}/forgot-password",
                json={"email": "victim@test.com"}
            )
            # Email might not exist, but request should not be rate limited yet
            assert resp.status_code in [200, 404]

        # 4th attempt should be blocked
        resp = await rate_limited_client.post(
            f"{API}/forgot-password",
            json={"email": "victim@test.com"}
        )
        assert resp.status_code == 429

    @pytest.mark.asyncio
    async def test_forgot_password_different_ips_separate_limits(
        self, rate_limited_client: AsyncClient, test_user: User
    ):
        """Verify different IPs get separate rate limits for forgot-password."""
        # Exhaust limit for IP1
        for i in range(3):
            resp = await rate_limited_client.post(
                f"{API}/forgot-password",
                json={"email": test_user.email},
                headers={"X-Forwarded-For": "172.16.0.1"}
            )
            assert resp.status_code == 200

        # IP1 should be blocked
        resp = await rate_limited_client.post(
            f"{API}/forgot-password",
            json={"email": test_user.email},
            headers={"X-Forwarded-For": "172.16.0.1"}
        )
        assert resp.status_code == 429

        # IP2 should still work
        resp = await rate_limited_client.post(
            f"{API}/forgot-password",
            json={"email": test_user.email},
            headers={"X-Forwarded-For": "172.16.0.2"}
        )
        assert resp.status_code == 200


class TestResetPasswordRateLimiting:
    """Test rate limiting on /reset-password endpoint (5 requests per 5 minutes)."""

    @pytest.mark.asyncio
    async def test_reset_password_rate_limit_blocks_6th_request(
        self, rate_limited_client: AsyncClient
    ):
        """Verify that 6th reset-password request is blocked with 429."""
        reset_data = {
            "token": "fake-token-for-rate-limit-test",
            "new_password": "NewPass123!"
        }

        # Make 5 requests (at the limit)
        for i in range(5):
            resp = await rate_limited_client.post(f"{API}/reset-password", json=reset_data)
            # Token is fake, so we expect 400/401, but not 429
            assert resp.status_code in [400, 401], f"Request {i+1} should not be rate limited"

        # 6th request should be rate limited
        resp = await rate_limited_client.post(f"{API}/reset-password", json=reset_data)
        assert resp.status_code == 429, "6th request should be rate limited"

    @pytest.mark.asyncio
    async def test_reset_password_rate_limit_error_response(
        self, rate_limited_client: AsyncClient
    ):
        """Verify rate limit error response on reset-password."""
        reset_data = {
            "token": "fake-token",
            "new_password": "NewPass123!"
        }

        # Exhaust the limit
        for i in range(5):
            await rate_limited_client.post(f"{API}/reset-password", json=reset_data)

        # Check error format
        resp = await rate_limited_client.post(f"{API}/reset-password", json=reset_data)
        assert resp.status_code == 429
        body = resp.json()
        assert "error" in body


class TestRateLimiterMiddleware:
    """Test rate limiter middleware integration."""

    @pytest.mark.asyncio
    async def test_rate_limiter_middleware(self, rate_limited_client: AsyncClient):
        """Verify rate limiter middleware is properly integrated into the application."""
        # Test that middleware is attached to app
        assert hasattr(app.state, "limiter"), "Rate limiter should be attached to app.state"
        assert app.state.limiter is not None, "Rate limiter instance should exist"

        # Test that limiter is enabled in this test context
        assert app.state.limiter.enabled is True, "Rate limiter should be enabled"

        # Verify middleware has in-memory storage for tests
        assert app.state.limiter._storage is not None, "Rate limiter should have storage configured"

        # Test that middleware can track requests by making requests to login endpoint
        # Make 5 requests (at the limit for login)
        for i in range(5):
            resp = await rate_limited_client.post(
                f"{API}/login",
                json={"email": "middleware@test.com", "password": "Pass123!"}
            )
            # Should not be rate limited yet (status 401 for bad auth, but not 429)
            assert resp.status_code != 429, f"Request {i+1}/5 should not be rate limited"

        # 6th request should trigger rate limiting
        resp = await rate_limited_client.post(
            f"{API}/login",
            json={"email": "middleware@test.com", "password": "Pass123!"}
        )
        # This verifies the middleware is actually enforcing limits
        assert resp.status_code == 429, "6th request should be rate limited, confirming middleware is active"

    @pytest.mark.asyncio
    async def test_rate_limiter_identifies_clients_by_ip(
        self, rate_limited_client: AsyncClient
    ):
        """Verify rate limiter correctly identifies clients by IP address."""
        # Two different endpoints should share the same IP-based limit tracking
        # but have independent limits per endpoint

        # Use up login limit
        for i in range(5):
            resp = await rate_limited_client.post(
                f"{API}/login",
                json={"email": "test@test.com", "password": "Test123!"},
                headers={"X-Forwarded-For": "1.2.3.4"}
            )
            assert resp.status_code in [200, 401]

        # Login should be blocked for this IP
        resp = await rate_limited_client.post(
            f"{API}/login",
            json={"email": "test@test.com", "password": "Test123!"},
            headers={"X-Forwarded-For": "1.2.3.4"}
        )
        assert resp.status_code == 429

        # But forgot-password should still work (different endpoint limit)
        resp = await rate_limited_client.post(
            f"{API}/forgot-password",
            json={"email": "test@test.com"},
            headers={"X-Forwarded-For": "1.2.3.4"}
        )
        assert resp.status_code in [200, 404], "Different endpoint should have separate limit"

    @pytest.mark.asyncio
    async def test_rate_limiter_handles_missing_forwarded_header(
        self, rate_limited_client: AsyncClient, test_user: User
    ):
        """Verify rate limiter works when X-Forwarded-For is absent."""
        # Make requests without X-Forwarded-For header
        # Should fall back to remote address
        for i in range(5):
            resp = await rate_limited_client.post(
                f"{API}/login",
                json={"email": test_user.email, "password": "TestPass123!"}
            )
            assert resp.status_code in [200, 401]

        resp = await rate_limited_client.post(
            f"{API}/login",
            json={"email": test_user.email, "password": "TestPass123!"}
        )
        assert resp.status_code == 429

    @pytest.mark.asyncio
    async def test_rate_limiter_exception_returns_429(
        self, rate_limited_client: AsyncClient
    ):
        """Verify that rate limit exceptions are properly caught and return 429."""
        # Exhaust the limit
        for i in range(5):
            await rate_limited_client.post(
                f"{API}/register",
                json={
                    "email": f"user{i}@test.com",
                    "password": "StrongP1ss!",
                    "full_name": "Test"
                }
            )

        # Rate limited request should return 429 (not 500 or other error)
        resp = await rate_limited_client.post(
            f"{API}/register",
            json={
                "email": "blocked@test.com",
                "password": "StrongP1ss!",
                "full_name": "Test"
            }
        )
        assert resp.status_code == 429
        # Should not be a server error
        assert resp.status_code < 500
