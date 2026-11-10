import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_applicant_management_and_shortlisting():
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

        # 2. Create a Job
        job_res = await ac.post(
            f"{settings.API_V1_STR}/jobs",
            headers=admin_headers,
            json={
                "title": f"DevOps Engineer {uuid.uuid4().hex[:4]}",
                "description": "Maintain cloud k8s infrastructure and CI/CD pipelines.",
                "required_skills": ["Docker", "Kubernetes", "AWS", "Terraform"],
                "employment_type": "Full-time",
                "is_published": True,
            },
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # 3. Create Candidate A
        cand_a_email = f"cand_a_{uuid.uuid4().hex[:6]}@example.com"
        cand_a_reg = await ac.post(
            f"{settings.API_V1_STR}/auth/register/candidate",
            json={
                "full_name": "Candidate Alpha",
                "email": cand_a_email,
                "password": "Password123!",
            },
        )
        assert cand_a_reg.status_code == 201
        cand_a_token = cand_a_reg.json()["access_token"]
        cand_a_headers = {"Authorization": f"Bearer {cand_a_token}"}

        # Candidate A sets profile details
        prof_res_a = await ac.put(
            f"{settings.API_V1_STR}/candidate/profile",
            headers=cand_a_headers,
            json={
                "headline": "Lead DevOps & Cloud Engineer",
                "bio": "Experienced architect with 7+ years building enterprise pipelines.",
                "skills": ["Docker", "Kubernetes", "Terraform", "Go"],
                "experience": [{"role": "Senior DevOps", "company": "Cloud Corp", "years": 4}],
                "education": [{"degree": "B.Sc. CSE", "institution": "Tech University"}],
            },
        )
        assert prof_res_a.status_code == 200

        # Candidate A applies
        app_a_res = await ac.post(
            f"{settings.API_V1_STR}/applications",
            headers=cand_a_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/cand_a.pdf",
                "resume_filename": "Candidate_Alpha_CV.pdf",
                "cover_letter": "I would love to lead your DevOps infrastructure.",
            },
        )
        assert app_a_res.status_code == 201
        app_a_id = app_a_res.json()["id"]

        # 4. Create Candidate B
        cand_b_email = f"cand_b_{uuid.uuid4().hex[:6]}@example.com"
        cand_b_reg = await ac.post(
            f"{settings.API_V1_STR}/auth/register/candidate",
            json={
                "full_name": "Candidate Beta",
                "email": cand_b_email,
                "password": "Password123!",
            },
        )
        assert cand_b_reg.status_code == 201
        cand_b_token = cand_b_reg.json()["access_token"]
        cand_b_headers = {"Authorization": f"Bearer {cand_b_token}"}

        app_b_res = await ac.post(
            f"{settings.API_V1_STR}/applications",
            headers=cand_b_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/cand_b.pdf",
                "resume_filename": "Candidate_Beta_CV.pdf",
            },
        )
        assert app_b_res.status_code == 201
        app_b_id = app_b_res.json()["id"]

        # 5. Admin updates Candidate A status to SHORTLISTED with Admin Notes
        update_a = await ac.patch(
            f"{settings.API_V1_STR}/applications/{app_a_id}/status",
            headers=admin_headers,
            json={
                "status": "SHORTLISTED",
                "admin_notes": "Strong Kubernetes background. Fast-track to interview.",
            },
        )
        assert update_a.status_code == 200
        assert update_a.json()["status"] == "SHORTLISTED"
        assert update_a.json()["admin_notes"] == "Strong Kubernetes background. Fast-track to interview."

        # 6. Admin updates Candidate B status to WAITING_LIST
        update_b = await ac.patch(
            f"{settings.API_V1_STR}/applications/{app_b_id}/status",
            headers=admin_headers,
            json={
                "status": "WAITING_LIST",
                "admin_notes": "Solid skills but waiting on capacity.",
            },
        )
        assert update_b.status_code == 200
        assert update_b.json()["status"] == "WAITING_LIST"

        # 7. Candidate checks My Applications and sees updated status
        cand_a_apps = await ac.get(f"{settings.API_V1_STR}/applications/my", headers=cand_a_headers)
        assert cand_a_apps.status_code == 200
        assert cand_a_apps.json()["items"][0]["status"] == "SHORTLISTED"

        # 8. Admin fetches application details
        details_res = await ac.get(
            f"{settings.API_V1_STR}/applications/{app_a_id}/details",
            headers=admin_headers,
        )
        assert details_res.status_code == 200
        details = details_res.json()
        assert details["candidate_profile"]["headline"] == "Lead DevOps & Cloud Engineer"
        assert "Kubernetes" in details["candidate_profile"]["skills"]

        # 9. Admin compares Candidate A and Candidate B
        compare_res = await ac.post(
            f"{settings.API_V1_STR}/applications/admin/compare",
            headers=admin_headers,
            json={"application_ids": [app_a_id, app_b_id]},
        )
        assert compare_res.status_code == 200
        compare_data = compare_res.json()
        assert len(compare_data["applications"]) == 2
        assert "Comparing 2 candidates" in compare_data["comparison_summary"]

        # 10. Admin filters by job_id
        filtered_list = await ac.get(
            f"{settings.API_V1_STR}/applications/admin/all?job_id={job_id}",
            headers=admin_headers,
        )
        assert filtered_list.status_code == 200
        assert filtered_list.json()["total"] == 2
