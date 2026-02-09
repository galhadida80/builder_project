import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.project import Project, ProjectMember


API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_AREA_ID = str(uuid.uuid4())


def areas_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/areas"


def area_detail_url(project_id: str, area_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/areas/{area_id}"


def progress_url(project_id: str, area_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/areas/{area_id}/progress"


def valid_area_payload(**overrides) -> dict:
    base = {
        "name": "Building A - Floor 1",
        "area_type": "residential",
        "floor_number": 1,
        "area_code": "BLD-A-F1",
        "total_units": 10,
    }
    base.update(overrides)
    return base


async def create_area_via_api(client: AsyncClient, project_id: str, payload: dict = None) -> dict:
    data = payload or valid_area_payload()
    resp = await client.post(areas_url(project_id), json=data)
    assert resp.status_code == 200
    return resp.json()


class TestCreateArea:

    @pytest.mark.asyncio
    async def test_create_area_success(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload()
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Building A - Floor 1"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_returns_camel_case_fields(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json=valid_area_payload())
        data = resp.json()
        assert "projectId" in data
        assert "areaType" in data
        assert "floorNumber" in data
        assert "areaCode" in data
        assert "totalUnits" in data
        assert "currentProgress" in data
        assert "createdAt" in data
        assert "parentId" in data

    @pytest.mark.asyncio
    async def test_create_sets_project_id(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json=valid_area_payload())
        assert resp.json()["projectId"] == str(project.id)

    @pytest.mark.asyncio
    async def test_create_with_minimal_fields(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "Simple Area"}
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Simple Area"
        assert data["areaType"] is None
        assert data["floorNumber"] is None
        assert data["areaCode"] is None
        assert data["totalUnits"] == 1

    @pytest.mark.asyncio
    async def test_create_with_all_fields(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload()
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["areaType"] == "residential"
        assert data["floorNumber"] == 1
        assert data["areaCode"] == "BLD-A-F1"
        assert data["totalUnits"] == 10

    @pytest.mark.asyncio
    async def test_create_default_current_progress_zero(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json=valid_area_payload())
        assert float(resp.json()["currentProgress"]) == 0

    @pytest.mark.asyncio
    async def test_create_children_empty_initially(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json=valid_area_payload())
        assert resp.json()["children"] == []

    @pytest.mark.asyncio
    async def test_create_progress_updates_empty_initially(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json=valid_area_payload())
        assert resp.json()["progressUpdates"] == []

    @pytest.mark.asyncio
    async def test_create_missing_name(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json={})
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_id_is_valid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json=valid_area_payload())
        uuid.UUID(resp.json()["id"])

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("Valid Area Name", 200),
    ])
    async def test_create_valid_names(self, admin_client: AsyncClient, project: Project, name, expected_status):
        payload = valid_area_payload(name=name)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name,desc", [
        ("", "empty name"),
        ("A", "single char too short"),
        ("A" * 256, "256 chars too long"),
    ])
    async def test_create_invalid_names(self, admin_client: AsyncClient, project: Project, name, desc):
        payload = valid_area_payload(name=name)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 422, f"Failed for: {desc}"

    @pytest.mark.asyncio
    async def test_create_area_type_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload(area_type="A" * 50)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_create_area_type_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload(area_type="A" * 51)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_create_with_null_optional_fields(self, admin_client: AsyncClient, project: Project):
        payload = {
            "name": "Null Fields",
            "area_type": None,
            "floor_number": None,
            "area_code": None,
        }
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["areaType"] is None
        assert data["floorNumber"] is None
        assert data["areaCode"] is None


class TestCreateAreaFloorNumber:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("floor,expected_status", [
        (0, 200),
        (1, 200),
        (99, 200),
        (999, 200),
        (-1, 200),
        (-99, 200),
        (None, 200),
    ])
    async def test_valid_floor_numbers(self, admin_client: AsyncClient, project: Project, floor, expected_status):
        payload = valid_area_payload(floor_number=floor)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    @pytest.mark.parametrize("floor", [-100, 1000])
    async def test_invalid_floor_numbers(self, admin_client: AsyncClient, project: Project, floor):
        payload = valid_area_payload(floor_number=floor)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 422


class TestCreateAreaTotalUnits:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("units,expected_status", [
        (1, 200),
        (10, 200),
        (100, 200),
        (10000, 200),
    ])
    async def test_valid_total_units(self, admin_client: AsyncClient, project: Project, units, expected_status):
        payload = valid_area_payload(total_units=units)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    @pytest.mark.parametrize("units", [0, -1, 10001])
    async def test_invalid_total_units(self, admin_client: AsyncClient, project: Project, units):
        payload = valid_area_payload(total_units=units)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_default_total_units_is_one(self, admin_client: AsyncClient, project: Project):
        payload = {"name": "No Units Specified"}
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["totalUnits"] == 1


class TestCreateAreaCode:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("code,expected_status", [
        ("A1", 200),
        ("BLD-A", 200),
        ("FLOOR_01", 200),
        (None, 200),
    ])
    async def test_valid_area_codes(self, admin_client: AsyncClient, project: Project, code, expected_status):
        payload = valid_area_payload(area_code=code)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    async def test_area_code_uppercased(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload(area_code="bld-a")
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["areaCode"] == "BLD-A"

    @pytest.mark.asyncio
    async def test_area_code_max_length(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload(area_code="A" * 50)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_area_code_too_long(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload(area_code="A" * 51)
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 422


class TestCreateAreaXSS:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["name", "area_type"])
    @pytest.mark.parametrize("xss_payload,marker", [
        ('<script>alert("xss")</script>', "<script"),
        ('javascript:alert(1)', "javascript:"),
        ('<img src=x onerror=alert(1)>', "<img"),
        ('<iframe src="evil"></iframe>', "<iframe"),
    ])
    async def test_xss_sanitization(self, admin_client: AsyncClient, project: Project, field, xss_payload, marker):
        if field == "name":
            payload = valid_area_payload(name=f"Safe {xss_payload} Name")
        else:
            payload = valid_area_payload(**{field: f"Safe {xss_payload} Text"})
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        if resp.status_code == 200:
            camel_map = {"name": "name", "area_type": "areaType"}
            val = resp.json().get(camel_map[field], "")
            if val:
                assert marker not in val.lower()


class TestCreateAreaWithParent:

    @pytest.mark.asyncio
    async def test_create_child_area(self, admin_client: AsyncClient, project: Project):
        parent = await create_area_via_api(admin_client, str(project.id),
                                            valid_area_payload(name="Parent Area"))
        child_payload = valid_area_payload(name="Child Area", parent_id=parent["id"])
        resp = await admin_client.post(areas_url(str(project.id)), json=child_payload)
        assert resp.status_code == 200
        assert resp.json()["parentId"] == parent["id"]

    @pytest.mark.asyncio
    async def test_parent_area_is_null_by_default(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(areas_url(str(project.id)), json=valid_area_payload())
        assert resp.json()["parentId"] is None


class TestGetArea:

    @pytest.mark.asyncio
    async def test_get_area_by_id(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.get(area_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]
        assert resp.json()["name"] == created["name"]

    @pytest.mark.asyncio
    async def test_get_area_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.get(area_detail_url(str(project.id), created["id"]))
        data = resp.json()
        assert "projectId" in data
        assert "areaType" in data
        assert "floorNumber" in data
        assert "areaCode" in data
        assert "totalUnits" in data
        assert "currentProgress" in data
        assert "createdAt" in data

    @pytest.mark.asyncio
    async def test_get_nonexistent_area(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(area_detail_url(str(project.id), FAKE_AREA_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_area_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(area_detail_url(FAKE_PROJECT_ID, FAKE_AREA_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_area_wrong_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        created = await create_area_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other Project", code="OTH-AREA",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(area_detail_url(str(other_project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_area_invalid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(f"{API_V1}/projects/{project.id}/areas/not-a-uuid")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_area_has_all_expected_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.get(area_detail_url(str(project.id), created["id"]))
        data = resp.json()
        expected_fields = [
            "id", "projectId", "parentId", "name", "areaType",
            "floorNumber", "areaCode", "totalUnits", "currentProgress",
            "createdAt", "children", "progressUpdates",
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


class TestListAreas:

    @pytest.mark.asyncio
    async def test_list_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(areas_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_list_single_item(self, admin_client: AsyncClient, project: Project):
        await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.get(areas_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    @pytest.mark.asyncio
    async def test_list_multiple_items(self, admin_client: AsyncClient, project: Project):
        for i in range(3):
            await create_area_via_api(
                admin_client, str(project.id),
                valid_area_payload(name=f"Area {i}", area_code=f"A{i}")
            )
        resp = await admin_client.get(areas_url(str(project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 3

    @pytest.mark.asyncio
    async def test_list_scoped_to_project(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        await create_area_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-AR2",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.get(areas_url(str(other_project.id)))
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    async def test_list_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.get(areas_url(str(project.id)))
        item = resp.json()[0]
        assert "areaType" in item
        assert "floorNumber" in item

    @pytest.mark.asyncio
    async def test_list_ordered_by_name(self, admin_client: AsyncClient, project: Project):
        names = ["Charlie", "Alpha", "Bravo"]
        for name in names:
            await create_area_via_api(
                admin_client, str(project.id),
                valid_area_payload(name=name, area_code=name[:2].upper())
            )
        resp = await admin_client.get(areas_url(str(project.id)))
        items = resp.json()
        result_names = [item["name"] for item in items]
        assert result_names == sorted(result_names)

    @pytest.mark.asyncio
    async def test_list_response_is_array(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(areas_url(str(project.id)))
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_list_only_returns_root_areas(self, admin_client: AsyncClient, project: Project):
        parent = await create_area_via_api(admin_client, str(project.id),
                                            valid_area_payload(name="Parent"))
        await create_area_via_api(admin_client, str(project.id),
                                   valid_area_payload(name="Child", parent_id=parent["id"], area_code="CH"))
        resp = await admin_client.get(areas_url(str(project.id)))
        items = resp.json()
        assert len(items) == 1
        assert items[0]["name"] == "Parent"

    @pytest.mark.asyncio
    @pytest.mark.parametrize("count", [1, 5, 10])
    async def test_list_n_areas(self, admin_client: AsyncClient, project: Project, count):
        for i in range(count):
            await create_area_via_api(
                admin_client, str(project.id),
                valid_area_payload(name=f"Area #{i}", area_code=f"A{i}")
            )
        resp = await admin_client.get(areas_url(str(project.id)))
        assert len(resp.json()) == count


class TestUpdateArea:

    @pytest.mark.asyncio
    async def test_update_name(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"name": "Updated Area Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Area Name"

    @pytest.mark.asyncio
    async def test_update_area_type(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"area_type": "commercial"},
        )
        assert resp.status_code == 200
        assert resp.json()["areaType"] == "commercial"

    @pytest.mark.asyncio
    async def test_update_floor_number(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"floor_number": 5},
        )
        assert resp.status_code == 200
        assert resp.json()["floorNumber"] == 5

    @pytest.mark.asyncio
    async def test_update_area_code(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"area_code": "NEW-CODE"},
        )
        assert resp.status_code == 200
        assert resp.json()["areaCode"] == "NEW-CODE"

    @pytest.mark.asyncio
    async def test_update_total_units(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"total_units": 50},
        )
        assert resp.status_code == 200
        assert resp.json()["totalUnits"] == 50

    @pytest.mark.asyncio
    async def test_update_preserves_unchanged_fields(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        original_type = created["areaType"]
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"name": "Only Name Changed"},
        )
        assert resp.status_code == 200
        assert resp.json()["areaType"] == original_type

    @pytest.mark.asyncio
    async def test_update_nonexistent_area(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.put(
            area_detail_url(str(project.id), FAKE_AREA_ID),
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"name": "Camel Test"},
        )
        data = resp.json()
        assert "areaType" in data
        assert "floorNumber" in data
        assert "totalUnits" in data

    @pytest.mark.asyncio
    @pytest.mark.parametrize("name,expected_status", [
        ("AB", 200),
        ("A" * 255, 200),
        ("A", 422),
        ("", 422),
        ("A" * 256, 422),
    ])
    async def test_update_name_validation(self, admin_client: AsyncClient, project: Project, name, expected_status):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"name": name},
        )
        assert resp.status_code == expected_status

    @pytest.mark.asyncio
    async def test_update_floor_number_out_of_range(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"floor_number": 1000},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_total_units_zero(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"total_units": 0},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_total_units_too_large(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"total_units": 10001},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_area_type_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"area_type": "A" * 51},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_area_code_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"area_code": "A" * 51},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_update_multiple_fields_at_once(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={
                "name": "Multi Update",
                "area_type": "industrial",
                "floor_number": 3,
                "total_units": 25,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Multi Update"
        assert data["areaType"] == "industrial"
        assert data["floorNumber"] == 3
        assert data["totalUnits"] == 25

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field", ["name", "area_type"])
    async def test_update_xss_sanitization(self, admin_client: AsyncClient, project: Project, field):
        created = await create_area_via_api(admin_client, str(project.id))
        xss = '<script>alert("xss")</script>'
        val = f"Safe {xss}" if field != "name" else f"Safe {xss} Name"
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={field: val},
        )
        if resp.status_code == 200:
            camel_map = {"name": "name", "area_type": "areaType"}
            result_val = resp.json().get(camel_map[field], "")
            if result_val:
                assert "<script" not in result_val.lower()

    @pytest.mark.asyncio
    async def test_update_with_empty_json(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == created["name"]


class TestDeleteArea:

    @pytest.mark.asyncio
    async def test_delete_area_success(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert resp.json()["message"] == "Area deleted"

    @pytest.mark.asyncio
    async def test_delete_then_get_returns_404(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(area_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_area(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.delete(area_detail_url(str(project.id), FAKE_AREA_ID))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_removes_from_list(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        resp = await admin_client.get(areas_url(str(project.id)))
        assert len(resp.json()) == 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize("delete_index", [0, 1, 2])
    async def test_delete_one_of_three(self, admin_client: AsyncClient, project: Project, delete_index):
        ids = []
        for i in range(3):
            a = await create_area_via_api(
                admin_client, str(project.id),
                valid_area_payload(name=f"Area {i}", area_code=f"A{i}")
            )
            ids.append(a["id"])
        await admin_client.delete(area_detail_url(str(project.id), ids[delete_index]))
        resp = await admin_client.get(areas_url(str(project.id)))
        remaining_ids = [a["id"] for a in resp.json()]
        assert ids[delete_index] not in remaining_ids
        assert len(remaining_ids) == 2

    @pytest.mark.asyncio
    async def test_delete_area_from_wrong_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        created = await create_area_via_api(admin_client, str(project.id))
        other_project = Project(
            id=uuid.uuid4(), name="Other", code="OTH-ADEL",
            status="active", created_by_id=admin_user.id,
        )
        db.add(other_project)
        await db.flush()
        db.add(ProjectMember(project_id=other_project.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        resp = await admin_client.delete(area_detail_url(str(other_project.id), created["id"]))
        assert resp.status_code == 404


class TestAreaProgress:

    @pytest.mark.asyncio
    async def test_add_progress_update(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 25.5, "notes": "Foundation complete"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["progressPercentage"]) == 25.5
        assert data["notes"] == "Foundation complete"

    @pytest.mark.asyncio
    async def test_add_progress_updates_area_current_progress(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 50},
        )
        resp = await admin_client.get(area_detail_url(str(project.id), created["id"]))
        assert float(resp.json()["currentProgress"]) == 50

    @pytest.mark.asyncio
    async def test_add_progress_with_photos(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={
                "progress_percentage": 30,
                "photos": ["photo1.jpg", "photo2.jpg"],
            },
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_add_progress_zero_percent(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 0},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_add_progress_100_percent(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 100},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_add_progress_over_100_rejected(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 101},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_add_progress_negative_rejected(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": -1},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_add_progress_nonexistent_area(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            progress_url(str(project.id), FAKE_AREA_ID),
            json={"progress_percentage": 50},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_list_progress_updates(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 25, "notes": "Phase 1"},
        )
        await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 50, "notes": "Phase 2"},
        )
        resp = await admin_client.get(progress_url(str(project.id), created["id"]))
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    @pytest.mark.asyncio
    async def test_list_progress_returns_camel_case(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 25},
        )
        resp = await admin_client.get(progress_url(str(project.id), created["id"]))
        item = resp.json()[0]
        assert "progressPercentage" in item
        assert "reportedAt" in item
        assert "areaId" in item

    @pytest.mark.asyncio
    async def test_add_progress_notes_max_length(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 50, "notes": "A" * 5000},
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_add_progress_notes_too_long(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 50, "notes": "A" * 5001},
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_multiple_progress_updates_latest_wins(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 25},
        )
        await admin_client.post(
            progress_url(str(project.id), created["id"]),
            json={"progress_percentage": 75},
        )
        resp = await admin_client.get(area_detail_url(str(project.id), created["id"]))
        assert float(resp.json()["currentProgress"]) == 75


class TestAuthRequirements:

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(areas_url(str(project.id)))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(area_detail_url(str(project.id), FAKE_AREA_ID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.post(areas_url(str(project.id)), json=valid_area_payload())
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_update_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.put(
            area_detail_url(str(project.id), FAKE_AREA_ID),
            json={"name": "Auth Test"},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_delete_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.delete(area_detail_url(str(project.id), FAKE_AREA_ID))
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_add_progress_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.post(
            progress_url(str(project.id), FAKE_AREA_ID),
            json={"progress_percentage": 50},
        )
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_list_progress_requires_auth(self, client: AsyncClient, project: Project):
        resp = await client.get(progress_url(str(project.id), FAKE_AREA_ID))
        assert resp.status_code == 401


class TestProjectAccessControl:

    @pytest.mark.asyncio
    async def test_create_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.post(areas_url(FAKE_PROJECT_ID), json=valid_area_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_list_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(areas_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_get_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.get(area_detail_url(FAKE_PROJECT_ID, FAKE_AREA_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_update_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.put(
            area_detail_url(FAKE_PROJECT_ID, FAKE_AREA_ID),
            json={"name": "No Access"},
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.delete(area_detail_url(FAKE_PROJECT_ID, FAKE_AREA_ID))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_with_project_access_can_create(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User
    ):
        db.add(ProjectMember(project_id=project.id, user_id=regular_user.id, role="contractor"))
        await db.commit()
        resp = await user_client.post(areas_url(str(project.id)), json=valid_area_payload())
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_create(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.post(areas_url(str(project.id)), json=valid_area_payload())
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_user_without_project_access_cannot_list(
        self, user_client: AsyncClient, project: Project
    ):
        resp = await user_client.get(areas_url(str(project.id)))
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_add_progress_on_nonexistent_project(self, admin_client: AsyncClient):
        resp = await admin_client.post(
            progress_url(FAKE_PROJECT_ID, FAKE_AREA_ID),
            json={"progress_percentage": 50},
        )
        assert resp.status_code == 403


class TestFullCRUDWorkflow:

    @pytest.mark.asyncio
    async def test_full_area_lifecycle(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload()
        create_resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert create_resp.status_code == 200
        area_id = create_resp.json()["id"]

        get_resp = await admin_client.get(area_detail_url(str(project.id), area_id))
        assert get_resp.status_code == 200
        assert get_resp.json()["name"] == payload["name"]

        list_resp = await admin_client.get(areas_url(str(project.id)))
        assert any(a["id"] == area_id for a in list_resp.json())

        await admin_client.post(
            progress_url(str(project.id), area_id),
            json={"progress_percentage": 50, "notes": "Halfway done"},
        )

        update_resp = await admin_client.put(
            area_detail_url(str(project.id), area_id),
            json={"name": "Updated Area", "total_units": 20},
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["name"] == "Updated Area"
        assert update_resp.json()["totalUnits"] == 20

        delete_resp = await admin_client.delete(area_detail_url(str(project.id), area_id))
        assert delete_resp.status_code == 200

        gone_resp = await admin_client.get(area_detail_url(str(project.id), area_id))
        assert gone_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_parent_child_area_workflow(self, admin_client: AsyncClient, project: Project):
        parent = await create_area_via_api(admin_client, str(project.id),
                                            valid_area_payload(name="Building A"))
        child1 = await create_area_via_api(admin_client, str(project.id),
                                            valid_area_payload(name="Floor 1", parent_id=parent["id"], area_code="F1"))
        child2 = await create_area_via_api(admin_client, str(project.id),
                                            valid_area_payload(name="Floor 2", parent_id=parent["id"], area_code="F2"))
        resp = await admin_client.get(area_detail_url(str(project.id), parent["id"]))
        parent_data = resp.json()
        child_ids = [c["id"] for c in parent_data["children"]]
        assert child1["id"] in child_ids
        assert child2["id"] in child_ids


class TestNotFoundAndEdgeCases:

    @pytest.mark.asyncio
    async def test_double_delete(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        resp = await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_update_deleted_area(self, admin_client: AsyncClient, project: Project):
        created = await create_area_via_api(admin_client, str(project.id))
        await admin_client.delete(area_detail_url(str(project.id), created["id"]))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={"name": "Ghost"},
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_create_with_unicode_name(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload(name="אזור בנייה ראשי")
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["name"] == "אזור בנייה ראשי"

    @pytest.mark.asyncio
    async def test_create_with_special_chars_in_name(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload(name="Area #1 - Phase (A)")
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_areas_from_different_projects_not_visible(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        proj_a = project
        proj_b = Project(
            id=uuid.uuid4(), name="Project B", code="PRJ-AB",
            status="active", created_by_id=admin_user.id,
        )
        db.add(proj_b)
        await db.flush()
        db.add(ProjectMember(project_id=proj_b.id, user_id=admin_user.id, role="project_admin"))
        await db.commit()
        await create_area_via_api(admin_client, str(proj_a.id),
                                   valid_area_payload(name="Area A"))
        await create_area_via_api(admin_client, str(proj_b.id),
                                   valid_area_payload(name="Area B"))
        resp_a = await admin_client.get(areas_url(str(proj_a.id)))
        resp_b = await admin_client.get(areas_url(str(proj_b.id)))
        names_a = [a["name"] for a in resp_a.json()]
        names_b = [a["name"] for a in resp_b.json()]
        assert "Area A" in names_a
        assert "Area B" not in names_a
        assert "Area B" in names_b
        assert "Area A" not in names_b

    @pytest.mark.asyncio
    async def test_negative_floor_number_allowed(self, admin_client: AsyncClient, project: Project):
        payload = valid_area_payload(name="Basement", floor_number=-2, area_code="BSM2")
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == 200
        assert resp.json()["floorNumber"] == -2


class TestParametrizedCreateAllFields:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("payload,expected_status,desc", [
        ({"name": "AB"}, 200, "minimal payload"),
        ({"name": "Area", "area_type": "residential"}, 200, "with area_type"),
        ({"name": "Area", "floor_number": 5}, 200, "with floor_number"),
        ({"name": "Area", "area_code": "A1"}, 200, "with area_code"),
        ({"name": "Area", "total_units": 50}, 200, "with total_units"),
        ({}, 422, "empty payload"),
        ({"area_type": "residential"}, 422, "missing name"),
        ({"name": ""}, 422, "empty name"),
        ({"name": "A"}, 422, "name too short"),
        ({"name": "A" * 256}, 422, "name too long"),
        ({"name": "Area", "floor_number": -100}, 422, "floor too low"),
        ({"name": "Area", "floor_number": 1000}, 422, "floor too high"),
        ({"name": "Area", "total_units": 0}, 422, "zero units"),
        ({"name": "Area", "total_units": 10001}, 422, "too many units"),
    ])
    async def test_create_parametrized(self, admin_client: AsyncClient, project: Project, payload, expected_status, desc):
        resp = await admin_client.post(areas_url(str(project.id)), json=payload)
        assert resp.status_code == expected_status, f"Failed: {desc}"


class TestParametrizedUpdateFields:

    @pytest.mark.asyncio
    @pytest.mark.parametrize("field,value,camel_key,expected_status", [
        ("name", "Updated", "name", 200),
        ("name", "AB", "name", 200),
        ("name", "A" * 255, "name", 200),
        ("name", "A", "name", 422),
        ("name", "A" * 256, "name", 422),
        ("area_type", "commercial", "areaType", 200),
        ("area_type", "A" * 50, "areaType", 200),
        ("area_type", "A" * 51, "areaType", 422),
        ("floor_number", 0, "floorNumber", 200),
        ("floor_number", -99, "floorNumber", 200),
        ("floor_number", 999, "floorNumber", 200),
        ("floor_number", -100, "floorNumber", 422),
        ("floor_number", 1000, "floorNumber", 422),
        ("total_units", 1, "totalUnits", 200),
        ("total_units", 10000, "totalUnits", 200),
        ("total_units", 0, "totalUnits", 422),
        ("total_units", 10001, "totalUnits", 422),
    ])
    async def test_update_field_parametrized(
        self, admin_client: AsyncClient, project: Project, field, value, camel_key, expected_status
    ):
        created = await create_area_via_api(admin_client, str(project.id))
        resp = await admin_client.put(
            area_detail_url(str(project.id), created["id"]),
            json={field: value},
        )
        assert resp.status_code == expected_status, f"Update {field}={repr(value)}"
        if expected_status == 200:
            assert resp.json()[camel_key] == value
