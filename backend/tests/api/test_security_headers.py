import pytest
from httpx import AsyncClient

# Expected security header values
EXPECTED_HEADERS = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
}

# Endpoints to test security headers on
TEST_ENDPOINTS = [
    "/health",
    "/api/v1/auth/login",
    "/api/v1/projects",
    "/api/v1/equipment-templates",
    "/api/v1/notifications",
]


class TestSecurityHeadersPresence:
    @pytest.mark.asyncio
    async def test_health_has_security_headers(self, client: AsyncClient):
        resp = await client.get("/health")
        assert "x-content-type-options" in resp.headers
        assert "x-frame-options" in resp.headers
        assert "strict-transport-security" in resp.headers
        assert "content-security-policy" in resp.headers

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", TEST_ENDPOINTS)
    async def test_all_endpoints_have_security_headers(self, client: AsyncClient, endpoint: str):
        resp = await client.get(endpoint)
        assert "x-content-type-options" in resp.headers
        assert "x-frame-options" in resp.headers
        assert "strict-transport-security" in resp.headers
        assert "content-security-policy" in resp.headers

    @pytest.mark.asyncio
    async def test_404_has_security_headers(self, client: AsyncClient):
        resp = await client.get("/nonexistent-endpoint")
        assert "x-content-type-options" in resp.headers
        assert "x-frame-options" in resp.headers
        assert "strict-transport-security" in resp.headers
        assert "content-security-policy" in resp.headers

    @pytest.mark.asyncio
    async def test_post_request_has_security_headers(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "password"},
        )
        assert "x-content-type-options" in resp.headers
        assert "x-frame-options" in resp.headers
        assert "strict-transport-security" in resp.headers
        assert "content-security-policy" in resp.headers


class TestXContentTypeOptions:
    @pytest.mark.asyncio
    async def test_x_content_type_options_value(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.headers.get("x-content-type-options") == "nosniff"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", TEST_ENDPOINTS)
    async def test_x_content_type_options_on_all_endpoints(
        self, client: AsyncClient, endpoint: str
    ):
        resp = await client.get(endpoint)
        assert resp.headers.get("x-content-type-options") == "nosniff"

    @pytest.mark.asyncio
    async def test_x_content_type_options_on_404(self, client: AsyncClient):
        resp = await client.get("/nonexistent")
        assert resp.headers.get("x-content-type-options") == "nosniff"


class TestXFrameOptions:
    @pytest.mark.asyncio
    async def test_x_frame_options_value(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.headers.get("x-frame-options") == "DENY"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", TEST_ENDPOINTS)
    async def test_x_frame_options_on_all_endpoints(
        self, client: AsyncClient, endpoint: str
    ):
        resp = await client.get(endpoint)
        assert resp.headers.get("x-frame-options") == "DENY"

    @pytest.mark.asyncio
    async def test_x_frame_options_on_404(self, client: AsyncClient):
        resp = await client.get("/nonexistent")
        assert resp.headers.get("x-frame-options") == "DENY"

    @pytest.mark.asyncio
    async def test_x_frame_options_prevents_framing(self, client: AsyncClient):
        resp = await client.get("/health")
        frame_options = resp.headers.get("x-frame-options")
        assert frame_options in ["DENY", "SAMEORIGIN"]


class TestStrictTransportSecurity:
    @pytest.mark.asyncio
    async def test_hsts_header_present(self, client: AsyncClient):
        resp = await client.get("/health")
        assert "strict-transport-security" in resp.headers

    @pytest.mark.asyncio
    async def test_hsts_max_age_set(self, client: AsyncClient):
        resp = await client.get("/health")
        hsts = resp.headers.get("strict-transport-security")
        assert "max-age=" in hsts
        assert "31536000" in hsts

    @pytest.mark.asyncio
    async def test_hsts_includes_subdomains(self, client: AsyncClient):
        resp = await client.get("/health")
        hsts = resp.headers.get("strict-transport-security")
        assert "includeSubDomains" in hsts

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", TEST_ENDPOINTS)
    async def test_hsts_on_all_endpoints(self, client: AsyncClient, endpoint: str):
        resp = await client.get(endpoint)
        assert resp.headers.get("strict-transport-security") == "max-age=31536000; includeSubDomains"

    @pytest.mark.asyncio
    async def test_hsts_on_404(self, client: AsyncClient):
        resp = await client.get("/nonexistent")
        assert "max-age=31536000" in resp.headers.get("strict-transport-security")


class TestContentSecurityPolicy:
    @pytest.mark.asyncio
    async def test_csp_header_present(self, client: AsyncClient):
        resp = await client.get("/health")
        assert "content-security-policy" in resp.headers

    @pytest.mark.asyncio
    async def test_csp_default_src_self(self, client: AsyncClient):
        resp = await client.get("/health")
        csp = resp.headers.get("content-security-policy")
        assert "default-src 'self'" in csp

    @pytest.mark.asyncio
    async def test_csp_frame_ancestors_none(self, client: AsyncClient):
        resp = await client.get("/health")
        csp = resp.headers.get("content-security-policy")
        assert "frame-ancestors 'none'" in csp

    @pytest.mark.asyncio
    async def test_csp_base_uri_self(self, client: AsyncClient):
        resp = await client.get("/health")
        csp = resp.headers.get("content-security-policy")
        assert "base-uri 'self'" in csp

    @pytest.mark.asyncio
    async def test_csp_form_action_self(self, client: AsyncClient):
        resp = await client.get("/health")
        csp = resp.headers.get("content-security-policy")
        assert "form-action 'self'" in csp

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", TEST_ENDPOINTS)
    async def test_csp_on_all_endpoints(self, client: AsyncClient, endpoint: str):
        resp = await client.get(endpoint)
        csp = resp.headers.get("content-security-policy")
        assert csp is not None
        assert "default-src 'self'" in csp

    @pytest.mark.asyncio
    async def test_csp_on_404(self, client: AsyncClient):
        resp = await client.get("/nonexistent")
        csp = resp.headers.get("content-security-policy")
        assert csp is not None
        assert "frame-ancestors 'none'" in csp


class TestSecurityHeadersOnDifferentMethods:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,endpoint", [
        ("GET", "/health"),
        ("POST", "/api/v1/auth/login"),
        ("OPTIONS", "/api/v1/projects"),
    ])
    async def test_security_headers_on_various_methods(
        self, client: AsyncClient, method: str, endpoint: str
    ):
        if method == "GET":
            resp = await client.get(endpoint)
        elif method == "POST":
            resp = await client.post(endpoint, json={})
        elif method == "OPTIONS":
            resp = await client.options(endpoint)

        assert "x-content-type-options" in resp.headers
        assert "x-frame-options" in resp.headers
        assert "strict-transport-security" in resp.headers
        assert "content-security-policy" in resp.headers

    @pytest.mark.asyncio
    async def test_security_headers_on_authenticated_endpoint(self, client: AsyncClient):
        resp = await client.get("/api/v1/projects")
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.headers.get("x-frame-options") == "DENY"

    @pytest.mark.asyncio
    async def test_security_headers_on_unauthenticated_endpoint(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.headers.get("x-frame-options") == "DENY"


class TestSecurityHeadersComprehensive:
    @pytest.mark.asyncio
    async def test_all_expected_headers_present_and_correct(self, client: AsyncClient):
        resp = await client.get("/health")
        for header_name, expected_value in EXPECTED_HEADERS.items():
            assert resp.headers.get(header_name) == expected_value

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ["/health", "/api/v1/auth/login", "/nonexistent"])
    async def test_complete_security_header_set(self, client: AsyncClient, endpoint: str):
        resp = await client.get(endpoint)
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.headers.get("x-frame-options") == "DENY"
        assert resp.headers.get("strict-transport-security") == "max-age=31536000; includeSubDomains"
        assert "content-security-policy" in resp.headers
        assert len(resp.headers.get("content-security-policy")) > 0

    @pytest.mark.asyncio
    async def test_security_headers_not_duplicated(self, client: AsyncClient):
        resp = await client.get("/health")
        # Verify headers appear exactly once (not duplicated)
        assert resp.headers.get("x-content-type-options") == "nosniff"
        assert resp.headers.get("x-frame-options") == "DENY"
        # If duplicated, get() would return a comma-separated list or fail
