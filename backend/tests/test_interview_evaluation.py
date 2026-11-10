"""
Tests for AI Interview Evaluation & Final Result Management (Phase 14).
Validates:
1. Generation of comprehensive Gemini AI interview evaluations (all 6 criteria + questions + strengths/weaknesses)
2. Admin human review and final hiring decision (SELECTED, REJECTED, WAITLISTED)
3. Publishing control gate: candidate cannot see results until published by Admin
4. Candidate visibility of published scorecard and feedback in dashboard
5. Human decision authority: Admin decision updates application status
"""

import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_interview_evaluation_and_admin_decision_flow():
    """Complete lifecycle test for Phase 14."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # ── 1. Admin Login ───────────────────────────────────────────────────
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

        # ── 2. Create Job ────────────────────────────────────────────────────
        job_res = await ac.post(
            f"{settings.API_V1_STR}/jobs",
            headers=admin_headers,
            json={
                "title": f"Lead Distributed Architect {uuid.uuid4().hex[:4]}",
                "description": "Architect high-throughput, low-latency microservices.",
                "required_skills": ["Python", "Go", "Kubernetes", "PostgreSQL"],
                "employment_type": "Full-time",
                "is_published": True,
            },
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # ── 3. Register Candidate ───────────────────────────────────────────
        cand_email = f"eval_cand_{uuid.uuid4().hex[:6]}@example.com"
        cand_reg = await ac.post(
            f"{settings.API_V1_STR}/auth/register/candidate",
            json={
                "full_name": "Tariqul Islam",
                "email": cand_email,
                "password": "Password123!",
            },
        )
        assert cand_reg.status_code == 201
        cand_token = cand_reg.json()["access_token"]
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        # ── 4. Candidate Applies ────────────────────────────────────────────
        app_res = await ac.post(
            f"{settings.API_V1_STR}/applications",
            headers=cand_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/tariqul_cv.pdf",
                "resume_filename": "Tariqul_Islam_CV.pdf",
                "cover_letter": "Passionate about high-scale distributed backend systems.",
            },
        )
        assert app_res.status_code == 201
        application_id = app_res.json()["id"]

        # ── 5. Admin Schedules Interview ────────────────────────────────────
        scheduled_time = datetime.now(timezone.utc) + timedelta(days=1)
        sched_res = await ac.post(
            f"{settings.API_V1_STR}/interviews",
            headers=admin_headers,
            json={
                "application_id": application_id,
                "scheduled_at": scheduled_time.isoformat(),
                "duration_minutes": 45,
                "title": "System Architecture Deep Dive",
                "instructions": "Be prepared to design a distributed cache.",
            },
        )
        assert sched_res.status_code == 201
        interview_id = sched_res.json()["id"]

        # ── 6. Trigger AI Evaluation ─────────────────────────────────────────
        eval_trigger = await ac.post(
            f"{settings.API_V1_STR}/evaluations/interview/evaluate/{interview_id}",
            headers=admin_headers,
        )
        assert eval_trigger.status_code == 200
        report = eval_trigger.json()

        # Verify all 6 mandatory criteria are scored
        assert "technical_knowledge" in report
        assert "problem_solving" in report
        assert "answer_relevance" in report
        assert "conceptual_understanding" in report
        assert "communication_clarity" in report
        assert "job_compatibility" in report
        assert report["overall_score"] > 0

        # Verify AI Report content
        assert len(report["question_analysis"]) >= 1
        assert len(report["strengths"]) >= 1
        assert len(report["weaknesses"]) >= 1
        assert len(report["improvement_suggestions"]) >= 1
        assert len(report["overall_evaluation"]) > 20
        assert report["ai_recommendation"] in ("RECOMMENDED", "CONSIDER", "NOT_RECOMMENDED")

        # Verify human admin control: default state is PENDING and UNPUBLISHED
        assert report["final_decision"] == "PENDING"
        assert report["is_published"] is False

        # ── 7. Candidate Access Gate (Unpublished) ──────────────────────────
        # Direct fetch should be forbidden for candidate before publishing
        cand_direct_get = await ac.get(
            f"{settings.API_V1_STR}/evaluations/interview/{interview_id}",
            headers=cand_headers,
        )
        assert cand_direct_get.status_code == 403

        # Candidate dashboard results view shows "UNDER_REVIEW"
        cand_results = await ac.get(
            f"{settings.API_V1_STR}/evaluations/candidate/my-results",
            headers=cand_headers,
        )
        assert cand_results.status_code == 200
        my_results = cand_results.json()
        assert len(my_results) >= 1
        first_res = my_results[0]
        assert first_res["is_published"] is False
        assert "under review" in first_res["status_message"].lower()

        # ── 8. Admin Reviews Report & Records Decision ───────────────────────
        decision_payload = {
            "final_decision": "SELECTED",
            "admin_notes": "Exceeded all expectations in distributed systems and systems design.",
            "is_published": True,
        }
        decide_res = await ac.put(
            f"{settings.API_V1_STR}/evaluations/interview/{interview_id}/decision",
            headers=admin_headers,
            json=decision_payload,
        )
        assert decide_res.status_code == 200
        updated_report = decide_res.json()
        assert updated_report["final_decision"] == "SELECTED"
        assert updated_report["is_published"] is True
        assert updated_report["admin_notes"] == decision_payload["admin_notes"]
        assert updated_report["decided_at"] is not None
        assert updated_report["published_at"] is not None

        # Verify Application status synchronized to ACCEPTED
        app_check = await ac.get(
            f"{settings.API_V1_STR}/applications/admin/all",
            headers=admin_headers,
        )
        assert app_check.status_code == 200
        app_data = app_check.json()
        app_list = app_data["items"] if "items" in app_data else app_data
        matched_app = next(a for a in app_list if a["id"] == application_id)
        assert matched_app["status"] == "ACCEPTED"

        # ── 9. Candidate Views Published Result & Feedback ───────────────────
        cand_published_results = await ac.get(
            f"{settings.API_V1_STR}/evaluations/candidate/my-results",
            headers=cand_headers,
        )
        assert cand_published_results.status_code == 200
        pub_list = cand_published_results.json()
        assert len(pub_list) >= 1
        published_item = pub_list[0]
        assert published_item["is_published"] is True
        assert published_item["final_decision"] == "SELECTED"
        assert published_item["overall_score"] > 0
        assert published_item["admin_feedback"] == decision_payload["admin_notes"]
        assert len(published_item["strengths"]) >= 1
        assert len(published_item["weaknesses"]) >= 1
        assert len(published_item["improvement_suggestions"]) >= 1

        # Direct fetch by candidate now succeeds
        cand_direct_pub = await ac.get(
            f"{settings.API_V1_STR}/evaluations/interview/{interview_id}",
            headers=cand_headers,
        )
        assert cand_direct_pub.status_code == 200
        assert cand_direct_pub.json()["final_decision"] == "SELECTED"
