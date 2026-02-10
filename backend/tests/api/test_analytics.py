from datetime import date, timedelta

import pytest
from httpx import AsyncClient

from app.models.project import Project

API = "/api/v1/analytics"
ENDPOINTS = ["/metrics", "/project-trends", "/distributions"]

METRICS_FIELDS = ["total_projects", "active_projects", "total_inspections", "pending_inspections",
    "completed_inspections", "total_equipment", "approved_equipment", "total_materials",
    "approved_materials", "total_meetings", "approval_rate"]
METRICS_INT_FIELDS = METRICS_FIELDS[:-1]
TREND_FIELDS = ["date", "inspections", "equipment_submissions", "material_submissions"]
DIST_FIELDS = ["inspection_status", "equipment_status", "material_status", "project_status"]
TODAY = date.today()
LAST_MONTH = TODAY - timedelta(days=30)
NEXT_WEEK = TODAY + timedelta(days=7)


class TestGetMetrics:

    @pytest.mark.asyncio
    async def test_metrics_success(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/metrics")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", METRICS_FIELDS)
    async def test_metrics_has_field(self, admin_client: AsyncClient, project: Project, field: str):
        assert field in (await admin_client.get(f"{API}/metrics")).json()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", METRICS_INT_FIELDS)
    async def test_metrics_int_fields_type(self, admin_client: AsyncClient, project: Project, field: str):
        assert isinstance((await admin_client.get(f"{API}/metrics")).json()[field], int)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", METRICS_INT_FIELDS)
    async def test_metrics_non_negative(self, admin_client: AsyncClient, project: Project, field: str):
        assert (await admin_client.get(f"{API}/metrics")).json()[field] >= 0

    @pytest.mark.asyncio
    async def test_metrics_approval_rate_is_numeric(self, admin_client: AsyncClient, project: Project):
        assert isinstance((await admin_client.get(f"{API}/metrics")).json()["approval_rate"], (int, float))

    @pytest.mark.asyncio
    async def test_metrics_approval_rate_range(self, admin_client: AsyncClient, project: Project):
        rate = (await admin_client.get(f"{API}/metrics")).json()["approval_rate"]
        assert 0.0 <= rate <= 100.0

    @pytest.mark.asyncio
    async def test_metrics_empty_project_zeroes(self, admin_client: AsyncClient, project: Project):
        body = (await admin_client.get(f"{API}/metrics")).json()
        for f in ["total_inspections", "total_equipment", "total_materials", "total_meetings"]:
            assert body[f] == 0

    @pytest.mark.asyncio
    async def test_metrics_counts_project(self, admin_client: AsyncClient, project: Project):
        assert (await admin_client.get(f"{API}/metrics")).json()["total_projects"] >= 1

    @pytest.mark.asyncio
    async def test_metrics_active_le_total(self, admin_client: AsyncClient, project: Project):
        body = (await admin_client.get(f"{API}/metrics")).json()
        assert body["active_projects"] <= body["total_projects"]

    @pytest.mark.asyncio
    async def test_metrics_pending_completed_le_total_inspections(self, admin_client: AsyncClient, project: Project):
        body = (await admin_client.get(f"{API}/metrics")).json()
        assert body["pending_inspections"] + body["completed_inspections"] <= body["total_inspections"]

    @pytest.mark.asyncio
    @pytest.mark.parametrize("pair", [("approved_equipment", "total_equipment"), ("approved_materials", "total_materials")])
    async def test_metrics_approved_le_total(self, admin_client: AsyncClient, project: Project, pair):
        body = (await admin_client.get(f"{API}/metrics")).json()
        assert body[pair[0]] <= body[pair[1]]

    @pytest.mark.asyncio
    async def test_metrics_content_type(self, admin_client: AsyncClient, project: Project):
        assert "application/json" in (await admin_client.get(f"{API}/metrics")).headers["content-type"]

    @pytest.mark.asyncio
    async def test_metrics_field_count(self, admin_client: AsyncClient, project: Project):
        assert len((await admin_client.get(f"{API}/metrics")).json()) == len(METRICS_FIELDS)


class TestGetTrends:

    @pytest.mark.asyncio
    async def test_trends_success(self, admin_client: AsyncClient, project: Project):
        assert (await admin_client.get(f"{API}/project-trends")).status_code == 200

    @pytest.mark.asyncio
    async def test_trends_has_data_points_list(self, admin_client: AsyncClient, project: Project):
        body = (await admin_client.get(f"{API}/project-trends")).json()
        assert isinstance(body.get("data_points"), list)

    @pytest.mark.asyncio
    async def test_trends_default_30_days(self, admin_client: AsyncClient, project: Project):
        assert len((await admin_client.get(f"{API}/project-trends")).json()["data_points"]) >= 30

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", TREND_FIELDS)
    async def test_trends_point_has_field(self, admin_client: AsyncClient, project: Project, field: str):
        pts = (await admin_client.get(f"{API}/project-trends")).json()["data_points"]
        if pts:
            assert field in pts[0]

    @pytest.mark.asyncio
    async def test_trends_date_format_yyyy_mm_dd(self, admin_client: AsyncClient, project: Project):
        pts = (await admin_client.get(f"{API}/project-trends")).json()["data_points"]
        if pts:
            assert len(pts[0]["date"]) == 10 and pts[0]["date"][4] == "-"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["inspections", "equipment_submissions", "material_submissions"])
    async def test_trends_counts_non_negative(self, admin_client: AsyncClient, project: Project, field: str):
        for pt in (await admin_client.get(f"{API}/project-trends")).json()["data_points"]:
            assert pt[field] >= 0

    @pytest.mark.asyncio
    async def test_trends_custom_5day_range(self, admin_client: AsyncClient, project: Project):
        start = (TODAY - timedelta(days=5)).isoformat()
        body = (await admin_client.get(f"{API}/project-trends", params={"start_date": start, "end_date": TODAY.isoformat()})).json()
        assert len(body["data_points"]) >= 5

    @pytest.mark.asyncio
    async def test_trends_single_day(self, admin_client: AsyncClient, project: Project):
        d = TODAY.isoformat()
        body = (await admin_client.get(f"{API}/project-trends", params={"start_date": d, "end_date": d})).json()
        assert len(body["data_points"]) >= 1

    @pytest.mark.asyncio
    async def test_trends_dates_sorted_asc(self, admin_client: AsyncClient, project: Project):
        dates = [pt["date"] for pt in (await admin_client.get(f"{API}/project-trends")).json()["data_points"]]
        assert dates == sorted(dates)

    @pytest.mark.asyncio
    async def test_trends_empty_counts_no_data(self, admin_client: AsyncClient, project: Project):
        for pt in (await admin_client.get(f"{API}/project-trends")).json()["data_points"]:
            assert pt["inspections"] == 0 and pt["equipment_submissions"] == 0 and pt["material_submissions"] == 0

    @pytest.mark.asyncio
    async def test_trends_response_single_key(self, admin_client: AsyncClient, project: Project):
        assert list((await admin_client.get(f"{API}/project-trends")).json().keys()) == ["data_points"]

    @pytest.mark.asyncio
    async def test_trends_point_types(self, admin_client: AsyncClient, project: Project):
        pts = (await admin_client.get(f"{API}/project-trends")).json()["data_points"]
        if pts:
            assert isinstance(pts[0]["date"], str)
            assert isinstance(pts[0]["inspections"], int)


class TestGetDistributions:

    @pytest.mark.asyncio
    async def test_distributions_success(self, admin_client: AsyncClient, project: Project):
        assert (await admin_client.get(f"{API}/distributions")).status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", DIST_FIELDS)
    async def test_distributions_has_field(self, admin_client: AsyncClient, project: Project, field: str):
        assert field in (await admin_client.get(f"{API}/distributions")).json()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", DIST_FIELDS)
    async def test_distributions_field_is_list(self, admin_client: AsyncClient, project: Project, field: str):
        assert isinstance((await admin_client.get(f"{API}/distributions")).json()[field], list)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", DIST_FIELDS)
    async def test_distributions_item_schema(self, admin_client: AsyncClient, project: Project, field: str):
        for item in (await admin_client.get(f"{API}/distributions")).json()[field]:
            assert "label" in item and "value" in item

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", DIST_FIELDS)
    async def test_distributions_values_non_negative(self, admin_client: AsyncClient, project: Project, field: str):
        for item in (await admin_client.get(f"{API}/distributions")).json()[field]:
            assert item["value"] >= 0

    @pytest.mark.asyncio
    async def test_distributions_project_status_has_active(self, admin_client: AsyncClient, project: Project):
        labels = [i["label"] for i in (await admin_client.get(f"{API}/distributions")).json()["project_status"]]
        assert "active" in labels

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["inspection_status", "equipment_status", "material_status"])
    async def test_distributions_empty_when_no_records(self, admin_client: AsyncClient, project: Project, field: str):
        assert (await admin_client.get(f"{API}/distributions")).json()[field] == []

    @pytest.mark.asyncio
    async def test_distributions_field_count(self, admin_client: AsyncClient, project: Project):
        assert len((await admin_client.get(f"{API}/distributions")).json()) == len(DIST_FIELDS)

    @pytest.mark.asyncio
    async def test_distributions_item_types(self, admin_client: AsyncClient, project: Project):
        for item in (await admin_client.get(f"{API}/distributions")).json()["project_status"]:
            assert isinstance(item["label"], str) and isinstance(item["value"], int)


class TestAnalyticsDateFilters:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_start_date_only(self, admin_client: AsyncClient, project: Project, endpoint: str):
        assert (await admin_client.get(f"{API}{endpoint}", params={"start_date": LAST_MONTH.isoformat()})).status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_end_date_only(self, admin_client: AsyncClient, project: Project, endpoint: str):
        assert (await admin_client.get(f"{API}{endpoint}", params={"end_date": TODAY.isoformat()})).status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_both_dates(self, admin_client: AsyncClient, project: Project, endpoint: str):
        resp = await admin_client.get(f"{API}{endpoint}", params={"start_date": LAST_MONTH.isoformat(), "end_date": TODAY.isoformat()})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_no_dates(self, admin_client: AsyncClient, project: Project, endpoint: str):
        assert (await admin_client.get(f"{API}{endpoint}")).status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_same_start_and_end(self, admin_client: AsyncClient, project: Project, endpoint: str):
        d = TODAY.isoformat()
        assert (await admin_client.get(f"{API}{endpoint}", params={"start_date": d, "end_date": d})).status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_future_range(self, admin_client: AsyncClient, project: Project, endpoint: str):
        resp = await admin_client.get(f"{API}{endpoint}", params={"start_date": NEXT_WEEK.isoformat(), "end_date": (NEXT_WEEK + timedelta(days=7)).isoformat()})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint,param", [
        ("/metrics", "start_date"), ("/metrics", "end_date"),
        ("/project-trends", "start_date"), ("/project-trends", "end_date"),
        ("/distributions", "start_date"), ("/distributions", "end_date"),
    ])
    async def test_invalid_date_raises(self, admin_client: AsyncClient, project: Project, endpoint: str, param: str):
        with pytest.raises((ValueError, Exception)):
            await admin_client.get(f"{API}{endpoint}", params={param: "not-a-date"})

    @pytest.mark.asyncio
    @pytest.mark.parametrize("bad", ["2024-13-01", "2024-00-15", "abc", "01/01/2024"])
    async def test_metrics_bad_dates_raise(self, admin_client: AsyncClient, project: Project, bad: str):
        with pytest.raises((ValueError, Exception)):
            await admin_client.get(f"{API}/metrics", params={"start_date": bad})

    @pytest.mark.asyncio
    async def test_metrics_empty_date_ignored(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API}/metrics", params={"start_date": ""})
        assert resp.status_code == 200

    @pytest.mark.asyncio
    @pytest.mark.parametrize("days_back", [1, 7, 14, 30, 90])
    async def test_trends_various_ranges(self, admin_client: AsyncClient, project: Project, days_back: int):
        start = (TODAY - timedelta(days=days_back)).isoformat()
        body = (await admin_client.get(f"{API}/project-trends", params={"start_date": start, "end_date": TODAY.isoformat()})).json()
        assert len(body["data_points"]) >= days_back

    @pytest.mark.asyncio
    async def test_metrics_future_range_returns_zeros(self, admin_client: AsyncClient, project: Project):
        body = (await admin_client.get(f"{API}/metrics", params={"start_date": (TODAY + timedelta(days=100)).isoformat(), "end_date": (TODAY + timedelta(days=200)).isoformat()})).json()
        assert body["total_inspections"] == 0 and body["total_equipment"] == 0


class TestAnalyticsNoAuth:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_unauthenticated_401(self, client: AsyncClient, endpoint: str):
        assert (await client.get(f"{API}{endpoint}")).status_code == 401

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_unauthenticated_with_params(self, client: AsyncClient, endpoint: str):
        assert (await client.get(f"{API}{endpoint}", params={"start_date": TODAY.isoformat()})).status_code == 401

    @pytest.mark.asyncio
    @pytest.mark.parametrize("method,endpoint", [
        ("post", "/metrics"), ("put", "/metrics"), ("delete", "/metrics"),
        ("post", "/project-trends"), ("put", "/project-trends"), ("delete", "/project-trends"),
        ("post", "/distributions"), ("put", "/distributions"), ("delete", "/distributions"),
    ])
    async def test_non_get_methods_405(self, admin_client: AsyncClient, method: str, endpoint: str):
        assert (await getattr(admin_client, method)(f"{API}{endpoint}")).status_code == 405

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_response_is_dict(self, admin_client: AsyncClient, project: Project, endpoint: str):
        assert isinstance((await admin_client.get(f"{API}{endpoint}")).json(), dict)

    @pytest.mark.asyncio
    @pytest.mark.parametrize("endpoint", ENDPOINTS)
    async def test_content_type_json(self, admin_client: AsyncClient, project: Project, endpoint: str):
        assert "application/json" in (await admin_client.get(f"{API}{endpoint}")).headers["content-type"]
