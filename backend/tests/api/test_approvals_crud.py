import uuid
from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.approval import ApprovalRequest, ApprovalStep
from app.models.equipment import Equipment, ApprovalStatus
from app.models.material import Material
from app.models.user import User
from app.models.project import Project, ProjectMember


API_V1 = "/api/v1"
FAKE_PROJECT_ID = str(uuid.uuid4())
FAKE_APPROVAL_ID = str(uuid.uuid4())
FAKE_STEP_ID = str(uuid.uuid4())


def approvals_url(project_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/approvals"


def approval_detail_url(project_id: str, approval_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/approvals/{approval_id}"


def step_action_url(project_id: str, approval_id: str, step_id: str) -> str:
    return f"{API_V1}/projects/{project_id}/approvals/{approval_id}/steps/{step_id}/action"


def approve_url(approval_id: str) -> str:
    return f"{API_V1}/approvals/{approval_id}/approve"


def reject_url(approval_id: str) -> str:
    return f"{API_V1}/approvals/{approval_id}/reject"


def all_approvals_url() -> str:
    return f"{API_V1}/approvals"


def my_approvals_url() -> str:
    return f"{API_V1}/my-approvals"


async def create_equipment(db: AsyncSession, project: Project, user: User) -> Equipment:
    eq = Equipment(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Test Equipment",
        equipment_type="Crane",
        status=ApprovalStatus.DRAFT.value,
        created_by_id=user.id,
    )
    db.add(eq)
    await db.commit()
    await db.refresh(eq)
    return eq


async def create_material(db: AsyncSession, project: Project, user: User) -> Material:
    mat = Material(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Test Material",
        material_type="Concrete",
        status=ApprovalStatus.DRAFT.value,
        created_by_id=user.id,
    )
    db.add(mat)
    await db.commit()
    await db.refresh(mat)
    return mat


async def create_approval_request(
    db: AsyncSession,
    project: Project,
    user: User,
    entity_type: str = "equipment",
    entity_id: uuid.UUID = None,
    num_steps: int = 1,
) -> ApprovalRequest:
    if entity_id is None:
        entity_id = uuid.uuid4()
    approval = ApprovalRequest(
        id=uuid.uuid4(),
        project_id=project.id,
        entity_type=entity_type,
        entity_id=entity_id,
        current_step=1,
        current_status=ApprovalStatus.SUBMITTED.value,
        created_by_id=user.id,
    )
    db.add(approval)
    await db.flush()

    for i in range(1, num_steps + 1):
        step = ApprovalStep(
            id=uuid.uuid4(),
            approval_request_id=approval.id,
            step_order=i,
            approver_role=f"approver_level_{i}",
            status="pending",
        )
        db.add(step)

    await db.commit()
    await db.refresh(approval)
    return approval


async def get_approval_steps(db: AsyncSession, approval_id: uuid.UUID) -> list[ApprovalStep]:
    from sqlalchemy import select
    result = await db.execute(
        select(ApprovalStep)
        .where(ApprovalStep.approval_request_id == approval_id)
        .order_by(ApprovalStep.step_order)
    )
    return list(result.scalars().all())


async def create_second_project(db: AsyncSession, user: User) -> Project:
    proj = Project(
        id=uuid.uuid4(),
        name="Second Project",
        code="PROJ-002",
        description="Another project",
        status="active",
        created_by_id=user.id,
    )
    db.add(proj)
    await db.flush()
    member = ProjectMember(
        project_id=proj.id,
        user_id=user.id,
        role="project_admin",
    )
    db.add(member)
    await db.commit()
    await db.refresh(proj)
    return proj


class TestListApprovals:

    async def test_list_approvals_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(approvals_url(str(project.id)))
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_approvals_returns_created(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approvals_url(str(project.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    async def test_list_approvals_multiple(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        await create_approval_request(db, project, admin_user)
        await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approvals_url(str(project.id)))
        data = resp.json()
        assert len(data) == 3

    async def test_list_approvals_project_scoped(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        proj2 = await create_second_project(db, admin_user)
        await create_approval_request(db, proj2, admin_user)
        resp1 = await admin_client.get(approvals_url(str(project.id)))
        resp2 = await admin_client.get(approvals_url(str(proj2.id)))
        assert len(resp1.json()) == 1
        assert len(resp2.json()) == 1

    async def test_list_approvals_no_access(self, user_client: AsyncClient):
        resp = await user_client.get(approvals_url(FAKE_PROJECT_ID))
        assert resp.status_code == 403

    async def test_list_approvals_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(approvals_url(str(project.id)))
        assert resp.status_code == 401

    async def test_list_approvals_includes_steps(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user, num_steps=2)
        resp = await admin_client.get(approvals_url(str(project.id)))
        data = resp.json()
        assert len(data[0]["steps"]) == 2

    async def test_list_approvals_includes_created_by(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approvals_url(str(project.id)))
        data = resp.json()
        assert data[0]["createdBy"] is not None

    async def test_list_approvals_ordered_by_created_at_desc(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        a1 = await create_approval_request(db, project, admin_user)
        a2 = await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approvals_url(str(project.id)))
        data = resp.json()
        assert data[0]["createdAt"] >= data[1]["createdAt"]


class TestGetApproval:

    async def test_get_approval_success(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(approval.id)

    async def test_get_approval_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(approval_detail_url(str(project.id), FAKE_APPROVAL_ID))
        assert resp.status_code == 404

    async def test_get_approval_wrong_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.get(approval_detail_url(str(proj2.id), str(approval.id)))
        assert resp.status_code == 404

    async def test_get_approval_includes_steps(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        data = resp.json()
        assert len(data["steps"]) == 3

    async def test_get_approval_no_access(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(approval_detail_url(str(project.id), FAKE_APPROVAL_ID))
        assert resp.status_code == 403

    async def test_get_approval_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.get(approval_detail_url(str(project.id), FAKE_APPROVAL_ID))
        assert resp.status_code == 401

    async def test_get_approval_entity_type_field(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, entity_type="equipment")
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["entityType"] == "equipment"

    async def test_get_approval_current_status_field(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "submitted"


class TestProcessApprovalStep:

    async def test_approve_step_success(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve", "comments": "Looks good"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "approved"

    async def test_reject_step_success(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "reject", "comments": "Does not meet requirements"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rejected"

    async def test_revision_step_success(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "revision", "comments": "Please revise section 3"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "revision_requested"

    async def test_invalid_action(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "invalid_action"},
        )
        assert resp.status_code == 400

    async def test_step_not_found(self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), FAKE_STEP_ID),
            json={"action": "approve"},
        )
        assert resp.status_code == 404

    async def test_cannot_act_on_already_approved_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "reject"},
        )
        assert resp.status_code == 400

    async def test_cannot_act_on_already_rejected_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "reject"},
        )
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        assert resp.status_code == 400

    async def test_approve_with_no_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        assert resp.status_code == 200

    async def test_step_action_no_access(self, user_client: AsyncClient, project: Project):
        resp = await user_client.post(
            step_action_url(str(project.id), FAKE_APPROVAL_ID, FAKE_STEP_ID),
            json={"action": "approve"},
        )
        assert resp.status_code == 403

    async def test_step_action_unauthenticated(self, client: AsyncClient, project: Project):
        resp = await client.post(
            step_action_url(str(project.id), FAKE_APPROVAL_ID, FAKE_STEP_ID),
            json={"action": "approve"},
        )
        assert resp.status_code == 401


class TestMultiStepApprovalWorkflow:

    async def test_approve_first_step_advances_to_second(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve", "comments": "Step 1 OK"},
        )
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        data = resp.json()
        assert data["currentStatus"] == "under_review"

    async def test_approve_all_steps_marks_approved(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[1].id)),
            json={"action": "approve"},
        )
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        data = resp.json()
        assert data["currentStatus"] == "approved"

    async def test_reject_any_step_marks_rejected(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[1].id)),
            json={"action": "reject", "comments": "Failed at step 2"},
        )
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        data = resp.json()
        assert data["currentStatus"] == "rejected"

    async def test_revision_request_marks_revision_requested(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "revision", "comments": "Needs changes"},
        )
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        data = resp.json()
        assert data["currentStatus"] == "revision_requested"

    async def test_three_step_full_approval(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        steps = await get_approval_steps(db, approval.id)
        for step in steps:
            resp = await admin_client.post(
                step_action_url(str(project.id), str(approval.id), str(step.id)),
                json={"action": "approve", "comments": f"Step {step.step_order} approved"},
            )
            assert resp.status_code == 200
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "approved"


class TestApproveRejectShortcuts:

    async def test_approve_shortcut(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.post(
            approve_url(str(approval.id)),
            json={"comments": "Approved via shortcut"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["currentStatus"] == "approved"

    async def test_reject_shortcut(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.post(
            reject_url(str(approval.id)),
            json={"comments": "Rejected via shortcut"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["currentStatus"] == "rejected"

    async def test_approve_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(approve_url(FAKE_APPROVAL_ID), json={})
        assert resp.status_code == 404

    async def test_reject_not_found(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(reject_url(FAKE_APPROVAL_ID), json={})
        assert resp.status_code == 404

    async def test_approve_without_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 200

    async def test_reject_without_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.post(reject_url(str(approval.id)))
        assert resp.status_code == 200

    async def test_approve_multi_step_advances(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["currentStatus"] == "under_review"

    async def test_approve_multi_step_fully(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["currentStatus"] == "approved"

    async def test_reject_multi_step_at_first(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        resp = await admin_client.post(reject_url(str(approval.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["currentStatus"] == "rejected"

    async def test_approve_already_fully_approved_no_pending(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 400

    async def test_reject_already_rejected_no_pending(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        await admin_client.post(reject_url(str(approval.id)))
        resp = await admin_client.post(reject_url(str(approval.id)))
        assert resp.status_code == 400

    async def test_approve_unauthenticated(self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await client.post(approve_url(str(approval.id)))
        assert resp.status_code == 401

    async def test_reject_unauthenticated(self, client: AsyncClient, project: Project, db: AsyncSession, admin_user: User):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await client.post(reject_url(str(approval.id)))
        assert resp.status_code == 401


class TestEntityStatusUpdates:

    async def test_approve_updates_equipment_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id, num_steps=1
        )
        await admin_client.post(approve_url(str(approval.id)))
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.APPROVED.value

    async def test_reject_updates_equipment_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id, num_steps=1
        )
        await admin_client.post(reject_url(str(approval.id)))
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.REJECTED.value

    async def test_approve_updates_material_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_material(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="material", entity_id=mat.id, num_steps=1
        )
        await admin_client.post(approve_url(str(approval.id)))
        await db.refresh(mat)
        assert mat.status == ApprovalStatus.APPROVED.value

    async def test_reject_updates_material_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_material(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="material", entity_id=mat.id, num_steps=1
        )
        await admin_client.post(reject_url(str(approval.id)))
        await db.refresh(mat)
        assert mat.status == ApprovalStatus.REJECTED.value

    async def test_revision_updates_equipment_status_via_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id, num_steps=1
        )
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "revision", "comments": "Revise specs"},
        )
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.REVISION_REQUESTED.value

    async def test_unknown_entity_type_no_error(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(
            db, project, admin_user, entity_type="unknown_type", num_steps=1
        )
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 200


class TestAllApprovalsEndpoint:

    async def test_list_all_approvals_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(all_approvals_url())
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_list_all_approvals_returns_accessible(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(all_approvals_url())
        data = resp.json()
        assert len(data) >= 1

    async def test_list_all_approvals_unauthenticated(self, client: AsyncClient):
        resp = await client.get(all_approvals_url())
        assert resp.status_code == 401

    async def test_list_all_approvals_filters_by_membership(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User, regular_user: User
    ):
        await create_approval_request(db, project, admin_user)
        resp = await user_client.get(all_approvals_url())
        data = resp.json()
        assert len(data) == 0


class TestMyPendingApprovals:

    async def test_my_approvals_empty(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(my_approvals_url())
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_my_approvals_returns_pending(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.get(my_approvals_url())
        data = resp.json()
        assert len(data) >= 1

    async def test_my_approvals_excludes_completed(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.get(my_approvals_url())
        data = resp.json()
        approved_ids = [a["id"] for a in data]
        assert str(approval.id) not in approved_ids

    async def test_my_approvals_unauthenticated(self, client: AsyncClient):
        resp = await client.get(my_approvals_url())
        assert resp.status_code == 401

    async def test_my_approvals_user_without_membership(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await user_client.get(my_approvals_url())
        data = resp.json()
        assert len(data) == 0


class TestApprovalResponseShape:

    async def test_approval_response_has_camel_case_fields(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, entity_type="equipment")
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        data = resp.json()
        assert "id" in data
        assert "projectId" in data
        assert "entityType" in data
        assert "entityId" in data
        assert "currentStatus" in data
        assert "createdAt" in data
        assert "steps" in data

    async def test_step_response_has_camel_case_fields(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        step = resp.json()["steps"][0]
        assert "id" in step
        assert "approvalRequestId" in step
        assert "stepOrder" in step
        assert "approverRole" in step
        assert "status" in step

    async def test_step_response_after_action_has_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve", "comments": "Well done"},
        )
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        step_data = resp.json()["steps"][0]
        assert step_data["comments"] == "Well done"


class TestApprovalEdgeCases:

    async def test_approval_with_nonexistent_entity(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        fake_entity_id = uuid.uuid4()
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=fake_entity_id, num_steps=1
        )
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 200

    async def test_multiple_approvals_for_same_entity(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        a1 = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id, num_steps=1
        )
        a2 = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id, num_steps=1
        )
        assert a1.id != a2.id

    async def test_approval_invalid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.get(approval_detail_url(str(project.id), "not-a-uuid"))
        assert resp.status_code == 422

    async def test_step_action_invalid_uuid(self, admin_client: AsyncClient, project: Project):
        resp = await admin_client.post(
            step_action_url(str(project.id), "not-a-uuid", "not-a-uuid"),
            json={"action": "approve"},
        )
        assert resp.status_code == 422


class TestApprovalAccessControl:

    async def test_non_member_cannot_list_approvals(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(approvals_url(str(project.id)))
        assert resp.status_code == 403

    async def test_non_member_cannot_get_approval(self, user_client: AsyncClient, project: Project):
        resp = await user_client.get(approval_detail_url(str(project.id), FAKE_APPROVAL_ID))
        assert resp.status_code == 403

    async def test_non_member_cannot_act_on_step(self, user_client: AsyncClient, project: Project):
        resp = await user_client.post(
            step_action_url(str(project.id), FAKE_APPROVAL_ID, FAKE_STEP_ID),
            json={"action": "approve"},
        )
        assert resp.status_code == 403

    async def test_member_can_list_approvals(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User, admin_user: User
    ):
        member = ProjectMember(
            project_id=project.id,
            user_id=regular_user.id,
            role="member",
        )
        db.add(member)
        await db.commit()
        await create_approval_request(db, project, admin_user)
        resp = await user_client.get(approvals_url(str(project.id)))
        assert resp.status_code == 200

    async def test_member_can_approve_step(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User, admin_user: User
    ):
        member = ProjectMember(
            project_id=project.id,
            user_id=regular_user.id,
            role="member",
        )
        db.add(member)
        await db.commit()
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await user_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 200

    async def test_non_member_cannot_approve_shortcut(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await user_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 403

    async def test_non_member_cannot_reject_shortcut(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await user_client.post(reject_url(str(approval.id)))
        assert resp.status_code == 403

    async def test_unauthenticated_cannot_list_project_approvals(self, client: AsyncClient, project: Project):
        resp = await client.get(approvals_url(str(project.id)))
        assert resp.status_code == 401

    async def test_unauthenticated_cannot_get_approval(self, client: AsyncClient, project: Project):
        resp = await client.get(approval_detail_url(str(project.id), FAKE_APPROVAL_ID))
        assert resp.status_code == 401

    async def test_unauthenticated_cannot_act_on_step(self, client: AsyncClient, project: Project):
        resp = await client.post(
            step_action_url(str(project.id), FAKE_APPROVAL_ID, FAKE_STEP_ID),
            json={"action": "approve"},
        )
        assert resp.status_code == 401

    async def test_member_can_reject_step(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User, admin_user: User
    ):
        member = ProjectMember(
            project_id=project.id,
            user_id=regular_user.id,
            role="member",
        )
        db.add(member)
        await db.commit()
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await user_client.post(reject_url(str(approval.id)))
        assert resp.status_code == 200

    async def test_member_can_get_approval_detail(
        self, user_client: AsyncClient, project: Project, db: AsyncSession, regular_user: User, admin_user: User
    ):
        member = ProjectMember(
            project_id=project.id,
            user_id=regular_user.id,
            role="member",
        )
        db.add(member)
        await db.commit()
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await user_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.status_code == 200


class TestApprovalStepDetails:

    async def test_step_has_pending_status_initially(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        step = resp.json()["steps"][0]
        assert step["status"] == "pending"

    async def test_step_approver_role_is_set(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        step = resp.json()["steps"][0]
        assert step["approverRole"] == "approver_level_1"

    async def test_multi_step_orders_are_sequential(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        steps = resp.json()["steps"]
        for i, step in enumerate(steps):
            assert step["stepOrder"] == i + 1

    async def test_step_comments_null_initially(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        step = resp.json()["steps"][0]
        assert step["comments"] is None

    async def test_approved_step_records_approver(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve", "comments": "LGTM"},
        )
        data = resp.json()
        assert data["status"] == "approved"


class TestApprovalEntityTypes:

    async def test_equipment_entity_type(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, entity_type="equipment")
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["entityType"] == "equipment"

    async def test_material_entity_type(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, entity_type="material")
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["entityType"] == "material"

    async def test_different_entity_types_in_same_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user, entity_type="equipment")
        await create_approval_request(db, project, admin_user, entity_type="material")
        resp = await admin_client.get(approvals_url(str(project.id)))
        data = resp.json()
        entity_types = {a["entityType"] for a in data}
        assert "equipment" in entity_types
        assert "material" in entity_types


class TestApprovalMultiStepEdgeCases:

    async def test_five_step_approval(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=5)
        for i in range(5):
            resp = await admin_client.post(approve_url(str(approval.id)))
            assert resp.status_code == 200
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "approved"

    async def test_reject_at_step_3_of_5(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=5)
        await admin_client.post(approve_url(str(approval.id)))
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.post(reject_url(str(approval.id)))
        assert resp.status_code == 200
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "rejected"

    async def test_approval_with_single_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.json()["currentStatus"] == "approved"

    async def test_many_approvals_in_project(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        for _ in range(10):
            await create_approval_request(db, project, admin_user, num_steps=1)
        resp = await admin_client.get(approvals_url(str(project.id)))
        assert len(resp.json()) == 10

    async def test_approval_status_after_first_step_approval(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        resp = await admin_client.post(approve_url(str(approval.id)))
        data = resp.json()
        assert data["currentStatus"] == "under_review"

    async def test_approval_step_statuses_after_partial_approval(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        steps = resp.json()["steps"]
        assert steps[0]["status"] == "approved"
        assert steps[1]["status"] == "pending"
        assert steps[2]["status"] == "pending"

    async def test_approve_url_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.post(approve_url("not-a-uuid"))
        assert resp.status_code == 422

    async def test_reject_url_invalid_uuid(self, admin_client: AsyncClient):
        resp = await admin_client.post(reject_url("not-a-uuid"))
        assert resp.status_code == 422

    async def test_all_approvals_across_projects(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        proj2 = await create_second_project(db, admin_user)
        await create_approval_request(db, proj2, admin_user)
        resp = await admin_client.get(all_approvals_url())
        data = resp.json()
        assert len(data) >= 2

    async def test_my_approvals_excludes_rejected(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        await admin_client.post(reject_url(str(approval.id)))
        resp = await admin_client.get(my_approvals_url())
        ids = [a["id"] for a in resp.json()]
        assert str(approval.id) not in ids

    async def test_my_approvals_includes_under_review(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.get(my_approvals_url())
        ids = [a["id"] for a in resp.json()]
        assert str(approval.id) in ids


class TestApprovalStatusProgression:

    async def test_initial_status_is_submitted(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "submitted"

    async def test_status_changes_to_under_review_after_first_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "under_review"

    async def test_status_stays_under_review_during_intermediate_steps(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=4)
        await admin_client.post(approve_url(str(approval.id)))
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "under_review"

    async def test_status_becomes_approved_on_last_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        await admin_client.post(approve_url(str(approval.id)))
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "approved"

    async def test_status_becomes_rejected_immediately(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        await admin_client.post(reject_url(str(approval.id)))
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "rejected"

    async def test_status_becomes_revision_requested_immediately(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "revision", "comments": "Needs revision"},
        )
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "revision_requested"

    async def test_reject_at_second_step_after_first_approved(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        await admin_client.post(approve_url(str(approval.id)))
        await admin_client.post(reject_url(str(approval.id)))
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["currentStatus"] == "rejected"


class TestApprovalCommentsDetail:

    async def test_approve_with_long_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        long_comment = "A" * 500
        resp = await admin_client.post(
            approve_url(str(approval.id)),
            json={"comments": long_comment},
        )
        assert resp.status_code == 200

    async def test_reject_with_long_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        long_comment = "R" * 500
        resp = await admin_client.post(
            reject_url(str(approval.id)),
            json={"comments": long_comment},
        )
        assert resp.status_code == 200

    async def test_step_action_with_unicode_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve", "comments": "אושר - הכל תקין"},
        )
        assert resp.status_code == 200

    async def test_step_action_with_empty_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve", "comments": ""},
        )
        assert resp.status_code == 200

    async def test_step_action_with_null_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve", "comments": None},
        )
        assert resp.status_code == 200


class TestApprovalMultiProjectIsolation:

    async def test_approval_from_project_a_not_visible_in_project_b(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.get(approvals_url(str(proj2.id)))
        assert len(resp.json()) == 0

    async def test_get_approval_from_wrong_project_returns_404(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        proj2 = await create_second_project(db, admin_user)
        resp = await admin_client.get(approval_detail_url(str(proj2.id), str(approval.id)))
        assert resp.status_code == 404

    async def test_list_all_approvals_spans_projects(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        proj2 = await create_second_project(db, admin_user)
        await create_approval_request(db, proj2, admin_user)
        resp = await admin_client.get(all_approvals_url())
        project_ids = {a["projectId"] for a in resp.json()}
        assert str(project.id) in project_ids
        assert str(proj2.id) in project_ids

    async def test_my_approvals_spans_projects(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user, num_steps=1)
        proj2 = await create_second_project(db, admin_user)
        await create_approval_request(db, proj2, admin_user, num_steps=1)
        resp = await admin_client.get(my_approvals_url())
        assert len(resp.json()) >= 2


class TestApprovalStepActionValidation:

    async def test_action_missing_action_field(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"comments": "No action provided"},
        )
        assert resp.status_code == 422

    async def test_action_empty_string(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": ""},
        )
        assert resp.status_code == 400

    async def test_action_unknown_string(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "escalate"},
        )
        assert resp.status_code == 400

    async def test_action_case_sensitive(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "APPROVE"},
        )
        assert resp.status_code == 400


class TestApprovalMaterialEntityUpdates:

    async def test_approve_material_multi_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_material(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="material", entity_id=mat.id, num_steps=2
        )
        await admin_client.post(approve_url(str(approval.id)))
        await db.refresh(mat)
        assert mat.status != ApprovalStatus.APPROVED.value
        await admin_client.post(approve_url(str(approval.id)))
        await db.refresh(mat)
        assert mat.status == ApprovalStatus.APPROVED.value

    async def test_reject_material_multi_step_at_step_2(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_material(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="material", entity_id=mat.id, num_steps=2
        )
        await admin_client.post(approve_url(str(approval.id)))
        await admin_client.post(reject_url(str(approval.id)))
        await db.refresh(mat)
        assert mat.status == ApprovalStatus.REJECTED.value

    async def test_revision_requested_material_via_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_material(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="material", entity_id=mat.id, num_steps=1
        )
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "revision", "comments": "Need more specs"},
        )
        await db.refresh(mat)
        assert mat.status == ApprovalStatus.REVISION_REQUESTED.value

    async def test_approve_equipment_multi_step_entity_update_only_on_last(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id, num_steps=3
        )
        await admin_client.post(approve_url(str(approval.id)))
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.DRAFT.value
        await admin_client.post(approve_url(str(approval.id)))
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.DRAFT.value
        await admin_client.post(approve_url(str(approval.id)))
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.APPROVED.value


class TestApprovalCreatedByField:

    async def test_approval_has_created_by(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        data = resp.json()
        assert data["createdBy"] is not None
        assert data["createdBy"]["email"] == "admin@test.com"

    async def test_all_approvals_include_created_by(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(all_approvals_url())
        for approval in resp.json():
            assert "createdBy" in approval

    async def test_list_project_approvals_include_steps(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user, num_steps=2)
        resp = await admin_client.get(approvals_url(str(project.id)))
        for approval in resp.json():
            assert "steps" in approval
            assert len(approval["steps"]) == 2

    async def test_approval_entity_id_is_correct(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id
        )
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["entityId"] == str(eq.id)

    async def test_approval_project_id_is_correct(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["projectId"] == str(project.id)

    async def test_approval_created_at_is_set(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert resp.json()["createdAt"] is not None


class TestApprovalEquipmentIntegration:

    async def test_approve_updates_equipment_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id
        )
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.APPROVED.value

    async def test_reject_updates_equipment_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id
        )
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "reject"},
        )
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.REJECTED.value

    async def test_revision_updates_equipment_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        eq = await create_equipment(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="equipment", entity_id=eq.id
        )
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "revision", "comments": "Please fix."},
        )
        await db.refresh(eq)
        assert eq.status == ApprovalStatus.REVISION_REQUESTED.value


class TestApprovalMaterialIntegration:

    async def test_approve_updates_material_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_material(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="material", entity_id=mat.id
        )
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        await db.refresh(mat)
        assert mat.status == ApprovalStatus.APPROVED.value

    async def test_reject_updates_material_status(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        mat = await create_material(db, project, admin_user)
        approval = await create_approval_request(
            db, project, admin_user, entity_type="material", entity_id=mat.id
        )
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "reject"},
        )
        await db.refresh(mat)
        assert mat.status == ApprovalStatus.REJECTED.value


class TestApprovalShortcutsMultiStep:

    async def test_approve_shortcut_advances_to_next_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 200
        data = resp.json()
        assert data["currentStatus"] == ApprovalStatus.UNDER_REVIEW.value

    async def test_approve_shortcut_all_steps(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 200
        assert resp.json()["currentStatus"] == ApprovalStatus.APPROVED.value

    async def test_reject_shortcut_on_second_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=2)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.post(reject_url(str(approval.id)))
        assert resp.status_code == 200
        assert resp.json()["currentStatus"] == ApprovalStatus.REJECTED.value

    async def test_approve_shortcut_with_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        resp = await admin_client.post(
            approve_url(str(approval.id)),
            json={"comments": "Looks good to me."},
        )
        assert resp.status_code == 200

    async def test_reject_shortcut_with_comments(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        resp = await admin_client.post(
            reject_url(str(approval.id)),
            json={"comments": "Does not meet specs."},
        )
        assert resp.status_code == 200

    async def test_approve_nonexistent_approval(self, admin_client: AsyncClient):
        resp = await admin_client.post(approve_url(FAKE_APPROVAL_ID))
        assert resp.status_code == 404

    async def test_reject_nonexistent_approval(self, admin_client: AsyncClient):
        resp = await admin_client.post(reject_url(FAKE_APPROVAL_ID))
        assert resp.status_code == 404

    async def test_double_approve_returns_error(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.post(approve_url(str(approval.id)))
        assert resp.status_code == 400

    async def test_double_reject_returns_error(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user)
        await admin_client.post(reject_url(str(approval.id)))
        resp = await admin_client.post(reject_url(str(approval.id)))
        assert resp.status_code == 400


class TestApprovalThreeStepWorkflow:

    async def test_three_step_approve_all(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        steps = await get_approval_steps(db, approval.id)
        for step in steps:
            resp = await admin_client.post(
                step_action_url(str(project.id), str(approval.id), str(step.id)),
                json={"action": "approve", "comments": f"Step {step.step_order} ok"},
            )
            assert resp.status_code == 200
        detail = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert detail.json()["currentStatus"] == ApprovalStatus.APPROVED.value

    async def test_three_step_reject_at_step_two(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[1].id)),
            json={"action": "reject", "comments": "Rejected at step 2"},
        )
        assert resp.status_code == 200
        detail = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert detail.json()["currentStatus"] == ApprovalStatus.REJECTED.value

    async def test_three_step_revision_at_step_three(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        steps = await get_approval_steps(db, approval.id)
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[0].id)),
            json={"action": "approve"},
        )
        await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[1].id)),
            json={"action": "approve"},
        )
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[2].id)),
            json={"action": "revision", "comments": "Needs revision"},
        )
        assert resp.status_code == 200
        detail = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert detail.json()["currentStatus"] == ApprovalStatus.REVISION_REQUESTED.value

    async def test_three_step_can_approve_any_pending_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        steps = await get_approval_steps(db, approval.id)
        resp = await admin_client.post(
            step_action_url(str(project.id), str(approval.id), str(steps[1].id)),
            json={"action": "approve"},
        )
        assert resp.status_code == 200

    async def test_three_step_step_count(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=3)
        resp = await admin_client.get(approval_detail_url(str(project.id), str(approval.id)))
        assert len(resp.json()["steps"]) == 3

    async def test_my_approvals_includes_multi_step(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        await create_approval_request(db, project, admin_user, num_steps=3)
        resp = await admin_client.get(my_approvals_url())
        assert len(resp.json()) >= 1

    async def test_approved_not_in_my_approvals(
        self, admin_client: AsyncClient, project: Project, db: AsyncSession, admin_user: User
    ):
        approval = await create_approval_request(db, project, admin_user, num_steps=1)
        await admin_client.post(approve_url(str(approval.id)))
        resp = await admin_client.get(my_approvals_url())
        ids = [a["id"] for a in resp.json()]
        assert str(approval.id) not in ids
