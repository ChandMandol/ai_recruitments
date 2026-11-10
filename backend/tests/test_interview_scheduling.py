import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_interview_scheduling_lifecycle_and_overlap_detection():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Login as Admin
        admin_login = await ac.post(
            f"{settings.API_V1_STR}/auth/login",
            json={
                "email": settings.FIRST_SUPERADMIN_EMAIL,
                "password": settings.FIRST_SUPERADMIN_PASSWORD,
            },
        )
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Admin creates a Job
        job_res = await ac.post(
            f"{settings.API_V1_STR}/jobs",
            headers=admin_headers,
            json={
                "title": f"Staff AI Engineer {uuid.uuid4().hex[:4]}",
                "description": "Lead LLM fine-tuning and multimodal agent systems.",
                "required_skills": ["Python", "PyTorch", "FastAPI", "WebRTC"],
                "employment_type": "Full-time",
                "is_published": True,
            },
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # 3. Register Candidate
        cand_email = f"sched_cand_{uuid.uuid4().hex[:6]}@example.com"
        cand_reg = await ac.post(
            f"{settings.API_V1_STR}/auth/register/candidate",
            json={
                "full_name": "Scheduling Test Candidate",
                "email": cand_email,
                "password": "Password123!",
            },
        )
        assert cand_reg.status_code == 201
        cand_token = cand_reg.json()["access_token"]
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        # Candidate applies
        app_res = await ac.post(
            f"{settings.API_V1_STR}/applications",
            headers=cand_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/dummy.pdf",
                "resume_filename": "CV_Schedule.pdf",
            },
        )
        assert app_res.status_code == 201
        application_id = app_res.json()["id"]

        # 4. Schedule first interview: Tomorrow at 10:00 AM UTC, 45 minutes
        now_utc = datetime.now(timezone.utc)
        start_time_1 = now_utc + timedelta(days=1, hours=2)
        sched_res_1 = await ac.post(
            f"{settings.API_V1_STR}/interviews",
            headers=admin_headers,
            json={
                "application_id": application_id,
                "scheduled_at": start_time_1.isoformat(),
                "duration_minutes": 45,
                "title": "Multimodal AI Architecture Round",
                "instructions": "Be prepared to discuss transformer attention mechanisms.",
            },
        )
        assert sched_res_1.status_code == 201
        interview_1 = sched_res_1.json()
        assert interview_1["status"] == "SCHEDULED"
        assert interview_1["duration_minutes"] == 45
        assert "room_live_" in interview_1["room_token"]
        assert interview_1["candidate_name"] == "Scheduling Test Candidate"
        interview_id = interview_1["id"]

        # 5. Overlap Prevention: Attempt to schedule 2nd interview overlapping with the 1st
        # 1st interview ends at start_time_1 + 45 mins. Try scheduling 20 mins after start_time_1.
        overlapping_start = start_time_1 + timedelta(minutes=20)
        overlap_res = await ac.post(
            f"{settings.API_V1_STR}/interviews",
            headers=admin_headers,
            json={
                "application_id": application_id,
                "scheduled_at": overlapping_start.isoformat(),
                "duration_minutes": 30,
                "title": "Conflicting Second Interview",
            },
        )
        assert overlap_res.status_code == 400
        assert "Scheduling Conflict" in overlap_res.json()["detail"]

        # 6. Candidate retrieves their scheduled interviews
        cand_interviews = await ac.get(f"{settings.API_V1_STR}/interviews/my", headers=cand_headers)
        assert cand_interviews.status_code == 200
        cand_list = cand_interviews.json()
        assert cand_list["total"] >= 1
        assert any(i["id"] == interview_id for i in cand_list["items"])

        # 7. Admin updates/reschedules the interview
        new_start = start_time_1 + timedelta(hours=3)
        update_res = await ac.put(
            f"{settings.API_V1_STR}/interviews/{interview_id}",
            headers=admin_headers,
            json={
                "scheduled_at": new_start.isoformat(),
                "duration_minutes": 60,
                "instructions": "Updated: System design problem included.",
            },
        )
        assert update_res.status_code == 200
        updated = update_res.json()
        assert updated["duration_minutes"] == 60
        assert "System design" in updated["instructions"]

        # 8. Admin cancels the interview
        cancel_res = await ac.post(
            f"{settings.API_V1_STR}/interviews/{interview_id}/cancel",
            headers=admin_headers,
            json={"cancellation_reason": "Candidate requested postponement."},
        )
        assert cancel_res.status_code == 200
        cancelled = cancel_res.json()
        assert cancelled["status"] == "CANCELLED"
        assert cancelled["cancellation_reason"] == "Candidate requested postponement."

