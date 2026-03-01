"""
End-to-End tests for Safety KPI Dashboard Calculations

Tests comprehensive KPI calculations including:
1. Incident rate calculations (by severity and status)
2. Near-miss ratio calculations (by severity, anonymous rate)
3. Training compliance percentage (valid/expired/expiring soon)
4. Toolbox talk attendance rates

Verifies that all KPI metrics are accurately calculated from sample data.
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from httpx import AsyncClient

from app.models.project import Project, ProjectMember, UserRole
from app.models.safety_incident import SafetyIncident, IncidentSeverity, IncidentStatus
from app.models.near_miss import NearMiss, NearMissSeverity
from app.models.safety_training import SafetyTraining, TrainingStatus
from app.models.toolbox_talk import ToolboxTalk, TalkStatus, TalkAttendee
from app.models.contact import Contact
from app.models.user import User


@pytest.mark.asyncio
async def test_safety_kpi_dashboard_calculations_e2e(
    db: AsyncSession,
    admin_client: AsyncClient,
    admin_user: User,
):
    """
    Comprehensive end-to-end test for safety KPI dashboard calculations

    Tests all KPI metrics including incidents, near-misses, training compliance,
    and toolbox talk attendance rates.
    """

    # Step 1: Create test project
    test_project = Project(
        name="Safety KPI Test Project",
        description="Project for testing safety KPI calculations",
        status="active",
        created_by_id=admin_user.id,
    )
    db.add(test_project)
    await db.commit()
    await db.refresh(test_project)

    project_member = ProjectMember(
        project_id=test_project.id,
        user_id=admin_user.id,
        role=UserRole.PROJECT_ADMIN
    )
    db.add(project_member)
    await db.commit()

    # Step 2: Create test worker contacts
    test_workers = []
    for i in range(5):
        worker = Contact(
            project_id=test_project.id,
            contact_name=f"Worker {i + 1}",
            contact_type="worker",
            email=f"worker{i + 1}@test.com",
            phone=f"+972-50-{1000000 + i}",
        )
        db.add(worker)
        test_workers.append(worker)
    await db.commit()
    for worker in test_workers:
        await db.refresh(worker)

    # Step 3: Create sample safety incidents (8 total)
    incidents_data = [
        # Critical incidents (2)
        {"severity": IncidentSeverity.CRITICAL, "status": IncidentStatus.OPEN, "title": "Critical Incident 1"},
        {"severity": IncidentSeverity.CRITICAL, "status": IncidentStatus.INVESTIGATING, "title": "Critical Incident 2"},
        # High incidents (3)
        {"severity": IncidentSeverity.HIGH, "status": IncidentStatus.OPEN, "title": "High Incident 1"},
        {"severity": IncidentSeverity.HIGH, "status": IncidentStatus.INVESTIGATING, "title": "High Incident 2"},
        {"severity": IncidentSeverity.HIGH, "status": IncidentStatus.RESOLVED, "title": "High Incident 3"},
        # Medium incidents (2)
        {"severity": IncidentSeverity.MEDIUM, "status": IncidentStatus.OPEN, "title": "Medium Incident 1"},
        {"severity": IncidentSeverity.MEDIUM, "status": IncidentStatus.CLOSED, "title": "Medium Incident 2"},
        # Low incident (1)
        {"severity": IncidentSeverity.LOW, "status": IncidentStatus.RESOLVED, "title": "Low Incident 1"},
    ]

    for idx, incident_data in enumerate(incidents_data):
        incident = SafetyIncident(
            project_id=test_project.id,
            incident_number=idx + 1,
            title=incident_data["title"],
            description=f"Test incident for KPI calculations - {incident_data['title']}",
            severity=incident_data["severity"],
            status=incident_data["status"],
            occurred_at=datetime.utcnow() - timedelta(days=idx),
            created_by_id=admin_user.id,
        )
        db.add(incident)
    await db.commit()

    # Step 4: Create sample near-misses (7 total, 3 anonymous)
    near_misses_data = [
        {"severity": NearMissSeverity.HIGH, "is_anonymous": True, "title": "High Near-Miss 1", "description": "High near-miss 1 (anonymous)"},
        {"severity": NearMissSeverity.HIGH, "is_anonymous": False, "title": "High Near-Miss 2", "description": "High near-miss 2 (identified)"},
        {"severity": NearMissSeverity.MEDIUM, "is_anonymous": True, "title": "Medium Near-Miss 1", "description": "Medium near-miss 1 (anonymous)"},
        {"severity": NearMissSeverity.MEDIUM, "is_anonymous": True, "title": "Medium Near-Miss 2", "description": "Medium near-miss 2 (anonymous)"},
        {"severity": NearMissSeverity.MEDIUM, "is_anonymous": False, "title": "Medium Near-Miss 3", "description": "Medium near-miss 3 (identified)"},
        {"severity": NearMissSeverity.LOW, "is_anonymous": False, "title": "Low Near-Miss 1", "description": "Low near-miss 1 (identified)"},
        {"severity": NearMissSeverity.LOW, "is_anonymous": False, "title": "Low Near-Miss 2", "description": "Low near-miss 2 (identified)"},
    ]

    for idx, near_miss_data in enumerate(near_misses_data):
        near_miss = NearMiss(
            project_id=test_project.id,
            near_miss_number=idx + 1,
            title=near_miss_data["title"],
            description=near_miss_data["description"],
            severity=near_miss_data["severity"],
            is_anonymous=near_miss_data["is_anonymous"],
            occurred_at=datetime.utcnow() - timedelta(days=1),
            created_by_id=admin_user.id,
        )
        db.add(near_miss)
    await db.commit()

    # Step 5: Create sample training records (7 total: 3 valid, 2 expired, 2 expiring soon)
    now = datetime.utcnow()
    trainings_data = [
        {"worker": test_workers[0], "status": TrainingStatus.VALID, "expiry": now + timedelta(days=100)},
        {"worker": test_workers[0], "status": TrainingStatus.EXPIRED, "expiry": now - timedelta(days=10)},
        {"worker": test_workers[1], "status": TrainingStatus.VALID, "expiry": now + timedelta(days=200)},
        {"worker": test_workers[2], "status": TrainingStatus.VALID, "expiry": now + timedelta(days=150)},
        {"worker": test_workers[2], "status": TrainingStatus.EXPIRING_SOON, "expiry": now + timedelta(days=20)},
        {"worker": test_workers[3], "status": TrainingStatus.EXPIRED, "expiry": now - timedelta(days=30)},
        {"worker": test_workers[4], "status": TrainingStatus.EXPIRING_SOON, "expiry": now + timedelta(days=15)},
    ]

    for idx, training_data in enumerate(trainings_data):
        training = SafetyTraining(
            project_id=test_project.id,
            worker_id=training_data["worker"].id,
            training_type=f"Safety Training Type {idx + 1}",
            instructor="Test Safety Instructor",
            training_date=now - timedelta(days=365),
            expiry_date=training_data["expiry"],
            status=training_data["status"],
            created_by_id=admin_user.id,
        )
        db.add(training)
    await db.commit()

    # Step 6: Create sample toolbox talks (5 total, 3 completed)
    talks_data = [
        {
            "status": TalkStatus.COMPLETED,
            "topic": "Fall Protection",
            "attendees": [
                {"worker": test_workers[0], "attended": True},
                {"worker": test_workers[1], "attended": True},
                {"worker": test_workers[2], "attended": True},
                {"worker": test_workers[3], "attended": True},
                {"worker": test_workers[4], "attended": True},
            ]
        },
        {
            "status": TalkStatus.COMPLETED,
            "topic": "PPE Requirements",
            "attendees": [
                {"worker": test_workers[0], "attended": True},
                {"worker": test_workers[1], "attended": True},
                {"worker": test_workers[2], "attended": True},
                {"worker": test_workers[3], "attended": False},
            ]
        },
        {
            "status": TalkStatus.COMPLETED,
            "topic": "Emergency Procedures",
            "attendees": [
                {"worker": test_workers[0], "attended": True},
                {"worker": test_workers[1], "attended": True},
                {"worker": test_workers[2], "attended": False},
            ]
        },
        {
            "status": TalkStatus.SCHEDULED,
            "topic": "Fire Safety",
            "attendees": []
        },
        {
            "status": TalkStatus.SCHEDULED,
            "topic": "Chemical Handling",
            "attendees": []
        },
    ]

    for idx, talk_data in enumerate(talks_data):
        talk = ToolboxTalk(
            project_id=test_project.id,
            title=talk_data["topic"],
            topic=talk_data["topic"],
            description=f"Test toolbox talk: {talk_data['topic']}",
            scheduled_date=datetime.utcnow() - timedelta(days=idx),
            presenter="Safety Supervisor",
            status=talk_data["status"],
            created_by_id=admin_user.id,
        )
        db.add(talk)
        await db.flush()

        for attendee_data in talk_data["attendees"]:
            attendee = TalkAttendee(
                talk_id=talk.id,
                worker_id=attendee_data["worker"].id,
                attended=attendee_data["attended"],
            )
            db.add(attendee)
    await db.commit()

    # Step 7: Verify KPI calculations via API
    response = await admin_client.get(
        f"/api/v1/projects/{test_project.id}/safety/kpi"
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    kpi = response.json()

    # Verify incident calculations
    assert kpi["totalIncidents"] == 8, f"Expected 8 total incidents, got {kpi['totalIncidents']}"
    assert kpi["incidentsBySeverity"]["critical"] == 2, "Expected 2 critical incidents"
    assert kpi["incidentsBySeverity"]["high"] == 3, "Expected 3 high incidents"
    assert kpi["incidentsBySeverity"]["medium"] == 2, "Expected 2 medium incidents"
    assert kpi["incidentsBySeverity"]["low"] == 1, "Expected 1 low incident"

    assert kpi["incidentsByStatus"]["open"] == 3, "Expected 3 open incidents"
    assert kpi["incidentsByStatus"]["investigating"] == 2, "Expected 2 investigating incidents"
    assert kpi["incidentsByStatus"]["resolved"] == 2, "Expected 2 resolved incidents"
    assert kpi["incidentsByStatus"]["closed"] == 1, "Expected 1 closed incident"

    # Verify near-miss calculations
    assert kpi["totalNearMisses"] == 7, f"Expected 7 total near-misses, got {kpi['totalNearMisses']}"
    assert kpi["nearMissesBySeverity"]["high"] == 2, "Expected 2 high near-misses"
    assert kpi["nearMissesBySeverity"]["medium"] == 3, "Expected 3 medium near-misses"
    assert kpi["nearMissesBySeverity"]["low"] == 2, "Expected 2 low near-misses"
    assert kpi["anonymousNearMisses"] == 3, f"Expected 3 anonymous near-misses, got {kpi['anonymousNearMisses']}"

    # Verify training compliance calculations
    assert kpi["totalTrainings"] == 7, f"Expected 7 total trainings, got {kpi['totalTrainings']}"
    assert kpi["validTrainings"] == 3, "Expected 3 valid trainings"
    assert kpi["expiredTrainings"] == 2, "Expected 2 expired trainings"
    assert kpi["expiringSoonTrainings"] == 2, "Expected 2 expiring soon trainings"
    assert kpi["uniqueTrainedWorkers"] == 5, f"Expected 5 unique workers, got {kpi['uniqueTrainedWorkers']}"

    # Verify toolbox talk calculations
    assert kpi["totalToolboxTalks"] == 5, f"Expected 5 total talks, got {kpi['totalToolboxTalks']}"
    assert kpi["completedToolboxTalks"] == 3, "Expected 3 completed talks"
    assert kpi["totalTalkAttendees"] == 12, f"Expected 12 total attendees, got {kpi['totalTalkAttendees']}"
    assert kpi["totalAttended"] == 10, f"Expected 10 attended, got {kpi['totalAttended']}"

    # Verify percentage calculations
    training_compliance = round((kpi["validTrainings"] / kpi["totalTrainings"]) * 100) if kpi["totalTrainings"] > 0 else 0
    assert training_compliance == 43, f"Expected 43% training compliance, got {training_compliance}%"

    attendance_rate = round((kpi["totalAttended"] / kpi["totalTalkAttendees"]) * 100) if kpi["totalTalkAttendees"] > 0 else 0
    assert attendance_rate == 83, f"Expected 83% attendance rate, got {attendance_rate}%"

    near_miss_ratio = kpi["totalNearMisses"] / kpi["totalIncidents"] if kpi["totalIncidents"] > 0 else 0
    assert near_miss_ratio == 0.875, f"Expected 0.875 near-miss ratio, got {near_miss_ratio}"
