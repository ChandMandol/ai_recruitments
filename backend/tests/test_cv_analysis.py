import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_ai_cv_analysis_and_gemini_config():
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

        # 2. Test Gemini Settings: update key from Admin Dashboard
        test_key = "AIzaSyFakeTestKeyForRecruitmentPlatform12345"
        set_key_res = await ac.post(
            f"{settings.API_V1_STR}/admin/settings/gemini",
            headers=admin_headers,
            json={"api_key": test_key, "model": "gemini-2.0-flash"},
        )
        assert set_key_res.status_code == 200
        key_data = set_key_res.json()
        assert key_data["has_api_key"] is True
        assert key_data["key_source"] == "DATABASE"
        assert key_data["masked_key"] == "AIzaSy...2345"
        # Verify raw key was NEVER leaked in response
        assert test_key not in set_key_res.text

        # 3. Get Gemini Settings status
        get_key_res = await ac.get(f"{settings.API_V1_STR}/admin/settings/gemini", headers=admin_headers)
        assert get_key_res.status_code == 200
        assert get_key_res.json()["has_api_key"] is True

        # 4. Create a Job with specific requirements
        job_res = await ac.post(
            f"{settings.API_V1_STR}/jobs",
            headers=admin_headers,
            json={
                "title": "Lead Full Stack AI Engineer",
                "description": "Architect end-to-end recruitment pipelines with FastAPI, React, PostgreSQL, and Google Gemini.",
                "required_skills": ["Python", "FastAPI", "React", "PostgreSQL", "Google Gemini API"],
                "experience": "4+ years",
                "education": "B.Sc in Computer Science",
                "is_published": True,
            },
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # 5. Register and submit application for a candidate
        cand_email = f"ai_cand_{uuid.uuid4().hex[:6]}@example.com"
        cand_reg = await ac.post(
            f"{settings.API_V1_STR}/auth/register/candidate",
            json={
                "full_name": "Rahim Chowdhury",
                "email": cand_email,
                "password": "Password123!",
            },
        )
        assert cand_reg.status_code == 201
        cand_token = cand_reg.json()["access_token"]
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        # Update candidate profile with matching background
        await ac.put(
            f"{settings.API_V1_STR}/candidate/profile",
            headers=cand_headers,
            json={
                "headline": "Full Stack Software Architect with 5 years experience",
                "skills": ["Python", "FastAPI", "React", "PostgreSQL", "Docker", "Tailwind CSS"],
                "experience": [{"title": "Senior Engineer", "years": "5", "company": "Tech Corp"}],
                "education": [{"degree": "B.Sc in Computer Science", "institution": "Dhaka University"}],
            },
        )

        # Apply for the job
        app_res = await ac.post(
            f"{settings.API_V1_STR}/applications",
            headers=cand_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/demo_cv.pdf",
                "resume_filename": "Rahim_Chowdhury_Resume.pdf",
                "cover_letter": "I have extensive experience with FastAPI and React.",
            },
        )
        assert app_res.status_code == 201
        app_id = app_res.json()["id"]

        # 6. Admin triggers AI CV Analysis
        analysis_res = await ac.post(
            f"{settings.API_V1_STR}/evaluations/cv/analyze/{app_id}",
            headers=admin_headers,
        )
        assert analysis_res.status_code == 200, f"Analysis failed: {analysis_res.text}"
        report = analysis_res.json()

        # 7. Verify all analysis fields
        assert report["overall_score"] >= 60 and report["overall_score"] <= 100
        assert report["recommendation"] in [
            "RECOMMENDED_FOR_INTERVIEW",
            "CONSIDER_WITH_RESERVATIONS",
            "REQUIRES_FURTHER_REVIEW",
        ]
        assert "skill_matching" in report
        assert "matched_skills" in report["skill_matching"]
        assert "missing_skills" in report["skill_matching"]
        assert "experience_matching" in report
        assert "education_matching" in report
        assert len(report["strengths"]) >= 1
        assert len(report["weaknesses"]) >= 1
        assert len(report["suggested_questions"]) >= 1

        # 8. Check that report is persisted in PostgreSQL
        get_rep = await ac.get(
            f"{settings.API_V1_STR}/evaluations/cv/{app_id}",
            headers=admin_headers,
        )
        assert get_rep.status_code == 200
        assert get_rep.json()["id"] == report["id"]

        # 9. Verify that candidate was NOT automatically rejected
        app_check = await ac.get(f"{settings.API_V1_STR}/applications/check/{job_id}", headers=cand_headers)
        assert app_check.status_code == 200
        assert app_check.json()["status"] != "REJECTED"

