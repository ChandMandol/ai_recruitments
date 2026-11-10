import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_job_application_pipeline_and_duplicate_prevention():
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

        # 2. Admin creates a published Job
        job_res = await ac.post(
            f"{settings.API_V1_STR}/jobs",
            headers=admin_headers,
            json={
                "title": "Principal AI Architect",
                "description": "Design and lead next-gen AI interviewing infrastructure with Gemini Live.",
                "required_skills": ["Python", "FastAPI", "WebRTC", "Google Gemini API"],
                "employment_type": "Full-time",
                "is_published": True,
            },
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # 3. Register a candidate
        cand_email = f"app_cand_{uuid.uuid4().hex[:6]}@example.com"
        cand_reg = await ac.post(
            f"{settings.API_V1_STR}/auth/register/candidate",
            json={
                "full_name": "Applicant Test Candidate",
                "email": cand_email,
                "password": "Password123!",
            },
        )
        assert cand_reg.status_code == 201
        cand_token = cand_reg.json()["access_token"]
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        # 4. Candidate submits first application
        app_res1 = await ac.post(
            f"{settings.API_V1_STR}/applications",
            headers=cand_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/test_resume.pdf",
                "resume_filename": "Test_Resume.pdf",
                "cover_letter": "I am deeply excited about AI recruitment innovation.",
            },
        )
        assert app_res1.status_code == 201, f"Application failed: {app_res1.text}"
        app_data = app_res1.json()
        assert app_data["job_id"] == job_id
        assert app_data["status"] == "APPLIED"
        app_id = app_data["id"]

        # 5. Candidate attempts duplicate application to the SAME job -> MUST FAIL (400)
        app_res_dup = await ac.post(
            f"{settings.API_V1_STR}/applications",
            headers=cand_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/test_resume.pdf",
                "resume_filename": "Test_Resume.pdf",
            },
        )
        assert app_res_dup.status_code == 400
        assert "already submitted an application" in app_res_dup.json()["detail"].lower()

        # 6. Candidate retrieves their applications
        my_apps = await ac.get(f"{settings.API_V1_STR}/applications/my", headers=cand_headers)
        assert my_apps.status_code == 200
        items = my_apps.json()["items"]
        assert len(items) >= 1
        assert any(a["id"] == app_id for a in items)
        assert any(a["job"]["title"] == "Principal AI Architect" for a in items)

        # 7. Check status endpoint
        chk_res = await ac.get(f"{settings.API_V1_STR}/applications/check/{job_id}", headers=cand_headers)
        assert chk_res.status_code == 200
        assert chk_res.json()["has_applied"] is True
        assert chk_res.json()["application_id"] == app_id

        # 8. Admin lists applications
        admin_apps = await ac.get(f"{settings.API_V1_STR}/applications/admin/all", headers=admin_headers)
        assert admin_apps.status_code == 200
        admin_items = admin_apps.json()["items"]
        assert any(a["id"] == app_id for a in admin_items)

        # 9. Admin updates application status to SHORTLISTED
        status_res = await ac.patch(
            f"{settings.API_V1_STR}/applications/{app_id}/status",
            headers=admin_headers,
            json={"status": "SHORTLISTED", "ai_match_score": 95},
        )
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "SHORTLISTED"
        assert status_res.json()["ai_match_score"] == 95

