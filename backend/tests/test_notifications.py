import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.main import app, seed_initial_superadmin


@pytest.fixture(scope="session", autouse=True)
async def init_db_for_tests():
    """Ensure superadmin is seeded before tests run."""
    await seed_initial_superadmin()


@pytest.mark.asyncio
async def test_security_headers_present():
    """Verify that OWASP Security Headers are enforced on all responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.headers.get("x-content-type-options") == "nosniff"
        assert res.headers.get("x-frame-options") == "DENY"
        assert res.headers.get("x-xss-protection") == "1; mode=block"
        assert "strict-transport-security" in res.headers
        assert "permissions-policy" in res.headers


@pytest.mark.asyncio
async def test_notifications_lifecycle_and_triggers():
    """
    Test End-to-End Notification System:
    1. Admin creates a Job.
    2. Candidate registers and applies -> Triggers notification to candidate & Admin.
    3. Admin shortlists candidate -> Triggers candidate status notification.
    4. Admin schedules an AI Interview -> Triggers interview scheduled notification.
    5. Admin evaluates and publishes result -> Triggers result published notification.
    6. Candidate fetches notifications, marks one read, marks all read.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Admin Login
        admin_login = await client.post(
            "/api/v1/auth/login",
            json={
                "email": settings.FIRST_SUPERADMIN_EMAIL,
                "password": settings.FIRST_SUPERADMIN_PASSWORD,
                "expected_role": "ADMIN",
            },
        )
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # Step 2: Candidate Register
        u_suffix = uuid.uuid4().hex[:6]
        cand_email = f"candidate.notif.{u_suffix}@example.com"
        cand_reg = await client.post(
            "/api/v1/auth/register/candidate",
            json={
                "email": cand_email,
                "password": "Password@123",
                "full_name": f"Notif Candidate {u_suffix}",
                "phone": "+8801900000000",
            },
        )
        assert cand_reg.status_code == 201
        cand_token = cand_reg.json()["access_token"]
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        # Step 3: Admin creates a Job
        job_res = await client.post(
            "/api/v1/jobs",
            headers=admin_headers,
            json={
                "title": f"Staff Systems Engineer {u_suffix}",
                "description": "Lead and architect scalable cloud infrastructure and services.",
                "department": "Infrastructure",
                "location": "Remote",
                "employment_type": "Full-time",
                "required_skills": ["Kubernetes", "FastAPI", "PostgreSQL"],
                "is_published": True,
            },
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # Step 4: Candidate applies -> triggers notifications
        app_res = await client.post(
            "/api/v1/applications",
            headers=cand_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/dummy_cv.pdf",
                "resume_filename": "dummy_cv.pdf",
                "cover_letter": "Passionate systems engineer eager to contribute.",
            },
        )
        assert app_res.status_code == 201
        app_id = app_res.json()["id"]

        # Verify candidate received "Application Submitted" notification
        cand_notifs = await client.get("/api/v1/notifications/my", headers=cand_headers)
        assert cand_notifs.status_code == 200
        c_data = cand_notifs.json()
        assert c_data["total"] >= 1
        assert any("Application Submitted" in n["title"] for n in c_data["items"])

        # Verify admin received "New Application" notification
        admin_notifs = await client.get("/api/v1/notifications/my", headers=admin_headers)
        assert admin_notifs.status_code == 200
        a_data = admin_notifs.json()
        assert any("New Application" in n["title"] for n in a_data["items"])

        # Step 5: Admin shortlists applicant -> candidate notified
        status_update = await client.patch(
            f"/api/v1/applications/{app_id}/status",
            headers=admin_headers,
            json={"status": "SHORTLISTED", "admin_notes": "Profile meets requirements."},
        )
        assert status_update.status_code == 200

        # Step 6: Admin schedules AI technical interview -> candidate notified
        sched_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        interview_res = await client.post(
            "/api/v1/interviews",
            headers=admin_headers,
            json={
                "application_id": app_id,
                "title": f"Technical System Architecture — {u_suffix}",
                "scheduled_at": sched_time,
                "duration_minutes": 30,
            },
        )
        assert interview_res.status_code == 201
        interview_id = interview_res.json()["id"]

        # Step 7: Admin publishes decision (e.g. SELECTED) -> candidate notified
        decision_res = await client.put(
            f"/api/v1/evaluations/interview/{interview_id}/decision",
            headers=admin_headers,
            json={
                "final_decision": "SELECTED",
                "admin_notes": "Outstanding architecture interview performance.",
                "is_published": True,
            },
        )
        assert decision_res.status_code == 200

        # Step 8: Candidate inspects all received notifications
        cand_notifs_updated = await client.get("/api/v1/notifications/my", headers=cand_headers)
        assert cand_notifs_updated.status_code == 200
        updated_data = cand_notifs_updated.json()

        # Should have at least 4 notifications: Submitted, Shortlisted, Interview Scheduled, Decision Published
        assert updated_data["total"] >= 4
        assert updated_data["unread_count"] >= 4

        types_found = {n["type"] for n in updated_data["items"]}
        assert "APPLICATION_STATUS_UPDATED" in types_found
        assert "INTERVIEW_SCHEDULED" in types_found
        assert "RESULT_PUBLISHED" in types_found

        # Step 9: Mark one notification as read
        first_notif_id = updated_data["items"][0]["id"]
        read_res = await client.put(f"/api/v1/notifications/{first_notif_id}/read", headers=cand_headers)
        assert read_res.status_code == 200
        assert read_res.json()["is_read"] is True

        # Check unread count decreased
        check_count = await client.get("/api/v1/notifications/my", headers=cand_headers)
        assert check_count.json()["unread_count"] == updated_data["unread_count"] - 1

        # Step 10: Mark all as read
        mark_all = await client.put("/api/v1/notifications/read-all", headers=cand_headers)
        assert mark_all.status_code == 200
        assert mark_all.json()["count"] >= 1

        # Final check: 0 unread
        final_check = await client.get("/api/v1/notifications/my", headers=cand_headers)
        assert final_check.json()["unread_count"] == 0
