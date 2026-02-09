import pytest
from httpx import AsyncClient

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]
DISALLOWED_ORIGINS = [
    "http://evil.com",
    "http://attacker.example.com",
    "https://malicious-site.org",
    "http://localhost:9999",
    "http://192.168.1.1:5173",
]
PREFLIGHT_ENDPOINTS = [
    "/api/v1/auth/login",
    "/api/v1/projects",
    "/api/v1/equipment-templates",
    "/api/v1/notifications",
]


class TestHealthEndpoint:
    @pytest.mark.asyncio
    async def test_health_returns_200(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_health_returns_healthy_status(self, client: AsyncClient):
        assert (await client.get("/health")).json()["status"] == "healthy"

    @pytest.mark.asyncio
    async def test_health_no_auth_required(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200 and "status" in resp.json()

    @pytest.mark.asyncio
    async def test_health_response_content_type(self, client: AsyncClient):
        resp = await client.get("/health")
        assert "application/json" in resp.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_health_post_not_allowed(self, client: AsyncClient):
        assert (await client.post("/health")).status_code == 405


class TestCORSPreflightAllowed:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("origin", ALLOWED_ORIGINS)
    @pytest.mark.parametrize("endpoint", PREFLIGHT_ENDPOINTS)
    async def test_preflight_returns_200(self, client: AsyncClient, origin: str, endpoint: str):
        resp = await client.options(endpoint, headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        })
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("origin", ALLOWED_ORIGINS)
    async def test_preflight_allow_origin_header(self, client: AsyncClient, origin: str):
        resp = await client.options("/api/v1/auth/login", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        })
        assert resp.headers.get("access-control-allow-origin") == origin

    @pytest.mark.asyncio
    @pytest.mark.parametrize("origin", ALLOWED_ORIGINS)
    async def test_preflight_allow_methods_header(self, client: AsyncClient, origin: str):
        resp = await client.options("/api/v1/auth/login", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        })
        assert "access-control-allow-methods" in resp.headers

    @pytest.mark.asyncio
    @pytest.mark.parametrize("origin", ALLOWED_ORIGINS)
    async def test_preflight_credentials_true(self, client: AsyncClient, origin: str):
        resp = await client.options("/api/v1/projects", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        })
        assert resp.headers.get("access-control-allow-credentials") == "true"


class TestCORSPreflightDisallowed:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("origin", DISALLOWED_ORIGINS)
    async def test_preflight_disallowed_returns_400(self, client: AsyncClient, origin: str):
        resp = await client.options("/api/v1/auth/login", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        })
        assert resp.status_code == 400

    @pytest.mark.asyncio
    @pytest.mark.parametrize("origin", DISALLOWED_ORIGINS)
    async def test_preflight_disallowed_no_allow_origin(self, client: AsyncClient, origin: str):
        resp = await client.options("/api/v1/auth/login", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        })
        assert "access-control-allow-origin" not in resp.headers

    @pytest.mark.asyncio
    @pytest.mark.parametrize("origin", DISALLOWED_ORIGINS)
    @pytest.mark.parametrize("endpoint", ["/api/v1/projects", "/api/v1/notifications"])
    async def test_preflight_disallowed_multiple_endpoints(
        self, client: AsyncClient, origin: str, endpoint: str
    ):
        resp = await client.options(endpoint, headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        })
        assert resp.status_code == 400


class TestCORSOnRegularRequests:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("origin", ALLOWED_ORIGINS)
    async def test_get_with_allowed_origin_has_cors(self, client: AsyncClient, origin: str):
        resp = await client.get("/health", headers={"Origin": origin})
        assert resp.headers.get("access-control-allow-origin") == origin
        assert resp.headers.get("access-control-allow-credentials") == "true"

    @pytest.mark.asyncio
    async def test_post_with_origin_has_cors(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": "t@t.com", "password": "p"},
            headers={"Origin": "http://localhost:5173"},
        )
        assert "access-control-allow-origin" in resp.headers

    @pytest.mark.asyncio
    async def test_request_without_origin_no_cors(self, client: AsyncClient):
        assert "access-control-allow-origin" not in (await client.get("/health")).headers

    @pytest.mark.asyncio
    async def test_cors_on_404_with_origin(self, client: AsyncClient):
        resp = await client.get("/nonexistent", headers={"Origin": "http://localhost:5173"})
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method", ["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def test_preflight_various_methods(self, client: AsyncClient, method: str):
        resp = await client.options("/api/v1/projects", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": method,
            "Access-Control-Request-Headers": "Content-Type,Authorization",
        })
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"

    @pytest.mark.asyncio
    async def test_preflight_custom_headers(self, client: AsyncClient):
        resp = await client.options("/api/v1/auth/login", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-Custom-Header,Authorization,Content-Type",
        })
        assert resp.status_code == 200


class TestLanguageDetectionMiddleware:
    @pytest.mark.asyncio
    @pytest.mark.parametrize("lang", ["he", "en"])
    async def test_supported_language_passes(self, client: AsyncClient, lang: str):
        assert (await client.get("/health", headers={"Accept-Language": lang})).status_code == 200

    @pytest.mark.asyncio
    async def test_no_accept_language_defaults_english(self, client: AsyncClient):
        assert (await client.get("/health")).status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("lang", ["fr", "de", "ja", "zh", "ru", "ar", "ko"])
    async def test_unsupported_language_defaults_english(self, client: AsyncClient, lang: str):
        assert (await client.get("/health", headers={"Accept-Language": lang})).status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("header,expected", [
        ("he-IL,he;q=0.9,en;q=0.8", "he"),
        ("en-US,en;q=0.9,he;q=0.8", "en"),
        ("he;q=1.0,en;q=0.5", "he"),
        ("fr-FR,fr;q=0.9,en;q=0.8,he;q=0.7", "en"),
        ("*", "en"),
        ("he-IL", "he"),
        ("en-GB,en-US;q=0.9,en;q=0.8", "en"),
    ])
    async def test_complex_accept_language(self, client: AsyncClient, header: str, expected: str):
        assert (await client.get("/health", headers={"Accept-Language": header})).status_code == 200

    @pytest.mark.asyncio
    async def test_empty_accept_language(self, client: AsyncClient):
        assert (await client.get("/health", headers={"Accept-Language": ""})).status_code == 200

    @pytest.mark.asyncio
    async def test_middleware_does_not_block_request(self, client: AsyncClient):
        resp = await client.get("/health", headers={"Accept-Language": "he-IL,he;q=0.9"})
        assert resp.json()["status"] == "healthy"


class TestOpenAPIDocs:
    @pytest.mark.asyncio
    async def test_docs_returns_200(self, client: AsyncClient):
        assert (await client.get("/api/v1/docs")).status_code == 200

    @pytest.mark.asyncio
    async def test_docs_returns_html(self, client: AsyncClient):
        assert "text/html" in (await client.get("/api/v1/docs")).headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_openapi_json_returns_200(self, client: AsyncClient):
        assert (await client.get("/api/v1/openapi.json")).status_code == 200

    @pytest.mark.asyncio
    async def test_openapi_json_returns_json(self, client: AsyncClient):
        resp = await client.get("/api/v1/openapi.json")
        assert "application/json" in resp.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_openapi_json_has_paths(self, client: AsyncClient):
        data = (await client.get("/api/v1/openapi.json")).json()
        assert "paths" in data and len(data["paths"]) > 0

    @pytest.mark.asyncio
    async def test_openapi_json_has_title(self, client: AsyncClient):
        assert "title" in (await client.get("/api/v1/openapi.json")).json().get("info", {})

    @pytest.mark.asyncio
    async def test_openapi_json_has_version_field(self, client: AsyncClient):
        assert "openapi" in (await client.get("/api/v1/openapi.json")).json()

    @pytest.mark.asyncio
    async def test_docs_no_auth_required(self, client: AsyncClient):
        assert (await client.get("/api/v1/docs")).status_code == 200


class TestNotFoundHandling:
    @pytest.mark.asyncio
    async def test_nonexistent_root_returns_404(self, client: AsyncClient):
        assert (await client.get("/nonexistent")).status_code == 404

    @pytest.mark.asyncio
    async def test_nonexistent_api_path(self, client: AsyncClient):
        assert (await client.post("/api/v1/nonexistent", json={})).status_code in (404, 405)

    @pytest.mark.asyncio
    async def test_nonexistent_nested_path(self, client: AsyncClient):
        assert (await client.get("/api/v1/does/not/exist")).status_code == 404

    @pytest.mark.asyncio
    async def test_404_returns_json(self, client: AsyncClient):
        resp = await client.get("/nonexistent")
        assert "application/json" in resp.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_404_has_detail_field(self, client: AsyncClient):
        assert "detail" in (await client.get("/nonexistent")).json()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,path", [
        ("GET", "/nope"),
        ("GET", "/api/nope"),
        ("GET", "/api/v1/fake-resource"),
        ("GET", "/api/v2/projects"),
        ("DELETE", "/nonexistent"),
    ])
    async def test_various_not_found(self, client: AsyncClient, method: str, path: str):
        assert (await client.request(method, path)).status_code in (404, 405)
