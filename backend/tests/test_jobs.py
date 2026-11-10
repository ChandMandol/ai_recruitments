import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_job_lifecycle_crud():
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
        assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Register and Login a Candidate
        cand_email = f"job_cand_{uuid.uuid4().hex[:6]}@example.com"
        cand_reg = await ac.post(
            f"{settings.API_V1_STR}/auth/register/candidate",
            json={
                "full_name": "Test Job Seeker",
                "email": cand_email,
                "password": "CandidatePassword123",
            },
        )
        assert cand_reg.status_code == 201
        cand_token = cand_reg.json()["access_token"]
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        # 3. Candidate attempts to create a job -> Must be rejected (403 Forbidden)
        forbidden_job = await ac.post(
            f"{settings.API_V1_STR}/jobs",
            headers=cand_headers,
            json={
                "title": "Unauthorized Job",
                "description": "This should fail because caller is candidate",
            },
        )
        assert forbidden_job.status_code == 403

        # 4. Admin creates a new Job with all 11 fields
        job_payload = {
            "title": "Senior AI Systems Engineer",
            "description": "Lead design and deployment of Gemini Live & WebRTC pipelines.",
            "responsibilities": "- Architect scalable AI interview systems\n- Integrate WebSockets and Redis tasks\n- Optimize audio/video streaming",
            "required_skills": ["Python", "FastAPI", "WebRTC", "Google Gemini API", "PostgreSQL"],
            "qualifications": "Proven experience in distributed AI architectures.",
            "education": "B.Sc or M.Sc in Computer Science or related STEM field",
            "experience": "5+ years",
            "salary": "$120,000 - $160,000 / year",
            "employment_type": "Full-time",
            "vacancies": 3,
            "application_deadline": "2026-12-31T23:59:59Z",
            "department": "AI Engineering",
            "location": "Remote (Global)",
            "is_published": False,
        }

        create_res = await ac.post(
            f"{settings.API_V1_STR}/jobs",
            headers=admin_headers,
            json=job_payload,
        )
        assert create_res.status_code == 201, f"Job creation failed: {create_res.text}"
        job_data = create_res.json()
        job_id = job_data["id"]
        assert job_data["title"] == "Senior AI Systems Engineer"
        assert job_data["status"] == "DRAFT"
        assert job_data["is_published"] is False
        assert len(job_data["required_skills"]) == 5

        # 5. List admin jobs -> newly created draft job should be listed
        admin_list = await ac.get(f"{settings.API_V1_STR}/jobs/admin/all", headers=admin_headers)
        assert admin_list.status_code == 200
        admin_items = admin_list.json()["items"]
        assert any(j["id"] == job_id for j in admin_items)

        # 6. Public list -> draft job should NOT be visible
        public_list = await ac.get(f"{settings.API_V1_STR}/jobs")
        assert public_list.status_code == 200
        public_items = public_list.json()["items"]
        assert not any(j["id"] == job_id for j in public_items)

        # 7. Admin publishes the job
        pub_res = await ac.patch(f"{settings.API_V1_STR}/jobs/{job_id}/publish", headers=admin_headers)
        assert pub_res.status_code == 200
        assert pub_res.json()["is_published"] is True
        assert pub_res.json()["status"] == "PUBLISHED"

        # 8. Public list -> job should NOW be visible
        public_list_after = await ac.get(f"{settings.API_V1_STR}/jobs")
        assert public_list_after.status_code == 200
        assert any(j["id"] == job_id for j in public_list_after.json()["items"])

        # 9. Admin edits the job
        edit_res = await ac.put(
            f"{settings.API_V1_STR}/jobs/{job_id}",
            headers=admin_headers,
            json={
                "title": "Lead AI Systems Architect",
                "salary": "$150,000 - $190,000 / year",
                "vacancies": 4,
            },
        )
        assert edit_res.status_code == 200
        assert edit_res.json()["title"] == "Lead AI Systems Architect"
        assert edit_res.json()["vacancies"] == 4

        # 10. Admin unpublishes the job
        unpub_res = await ac.patch(f"{settings.API_V1_STR}/jobs/{job_id}/unpublish", headers=admin_headers)
        assert unpub_res.status_code == 200
        assert unpub_res.json()["is_published"] is False
        assert unpub_res.json()["status"] == "DRAFT"

        # 11. Admin deletes the job
        del_res = await ac.delete(f"{settings.API_V1_STR}/jobs/{job_id}", headers=admin_headers)
        assert del_res.status_code == 200
        assert del_res.json()["id"] == job_id

        # 12. Verify job is gone
        get_deleted = await ac.get(f"{settings.API_V1_STR}/jobs/{job_id}")
        assert get_deleted.status_code == 404
