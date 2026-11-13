import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.core.database import Base, engine
from app.main import app, seed_initial_superadmin


@pytest.fixture(scope="session", autouse=True)
async def init_db_for_tests():
    """Ensure database tables exist and superadmin is seeded before tests run."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_initial_superadmin()


@pytest.mark.asyncio
async def test_adaptive_interview_lifecycle_and_rules():
    """
    Comprehensive End-to-End Test for the Adaptive AI Interview Feature:
    1. Candidate registers and signs in.
    2. Start assessment with Category='Frontend Developer' and Level='Junior'.
       -> Verifies initial 5 questions are generated for Round 1.
    3. Scenario A: Fail Round 1 with 0 correct out of 5 answers.
       -> Verifies session TERMINATES EARLY immediately upon 5th wrong answer.
       -> Verifies summary report is generated.
    4. Scenario B: Pass Round 1 with >= 1 correct answer.
       -> Verifies next 2 questions (Q6 and Q7) are unlocked (total 7 questions).
    5. Fail Round 2 with 0 correct out of 2.
       -> Verifies session TERMINATES EARLY after Round 2.
    6. Verify Candidate History and Summary endpoint.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Register and login candidate
        unique = uuid.uuid4().hex[:6]
        email = f"candidate.adaptive.{unique}@example.com"
        reg_res = await client.post(
            "/api/v1/auth/register/candidate",
            json={
                "full_name": "Adaptive Candidate",
                "email": email,
                "password": "Password@123",
                "phone": "+8801700112233",
            },
        )
        assert reg_res.status_code == 201, reg_res.text
        token = reg_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Step 2: Start new assessment
        start_res = await client.post(
            "/api/v1/adaptive-interview/start",
            data={
                "job_category": "Frontend Developer",
                "interview_level": "Junior",
                "use_profile_cv": "false",
            },
            headers=headers,
        )
        assert start_res.status_code == 201, start_res.text
        assessment_data = start_res.json()
        assessment_id = assessment_data["id"]
        assert assessment_data["status"] == "IN_PROGRESS"
        assert assessment_data["current_round"] == 1
        assert assessment_data["total_questions_asked"] == 5
        assert len(assessment_data["rounds"]) == 1
        assert len(assessment_data["rounds"][0]["questions"]) == 5

        # Step 3: Scenario A — Submit 0 correct answers for all 5 questions
        for q_idx in range(1, 6):
            ans_res = await client.post(
                f"/api/v1/adaptive-interview/{assessment_id}/answer",
                json={
                    "question_index": q_idx,
                    "answer_text": "I do not know the answer to this question.",
                },
                headers=headers,
            )
            assert ans_res.status_code == 200, ans_res.text
            ans_eval = ans_res.json()
            assert ans_eval["is_correct"] is False
            if q_idx < 5:
                assert ans_eval["round_completed"] is False
                assert ans_eval["session_status"] == "IN_PROGRESS"
                assert ans_eval["next_question"]["index"] == q_idx + 1
            else:
                # 5th question answered with 0/5 correct: Session MUST TERMINATE EARLY!
                assert ans_eval["round_completed"] is True
                assert ans_eval["round_passed"] is False
                assert ans_eval["session_status"] == "TERMINATED_EARLY"
                assert "0 out of 5" in (ans_eval["termination_reason"] or "")
                assert ans_eval["summary_report"] is not None

        # Verify details endpoint shows TERMINATED_EARLY
        check_res = await client.get(f"/api/v1/adaptive-interview/{assessment_id}", headers=headers)
        assert check_res.status_code == 200
        assert check_res.json()["status"] == "TERMINATED_EARLY"
        assert check_res.json()["total_correct"] == 0

        # Step 4: Scenario B — Start a second assessment and get >= 1 correct in Round 1
        start_res_2 = await client.post(
            "/api/v1/adaptive-interview/start",
            data={
                "job_category": "Backend Developer",
                "interview_level": "Junior",
                "use_profile_cv": "false",
            },
            headers=headers,
        )
        assert start_res_2.status_code == 201
        ass_2_id = start_res_2.json()["id"]

        # Questions 1-4: incorrect
        for q_idx in range(1, 5):
            await client.post(
                f"/api/v1/adaptive-interview/{ass_2_id}/answer",
                json={"question_index": q_idx, "answer_text": "pass"},
                headers=headers,
            )

        # Question 5: Provide an accurate, comprehensive answer for Hashing vs Encryption
        good_ans = (
            "Hashing is a one-way cryptographic function that cannot be reversed. "
            "Encryption is two-way and reversible using a secret key. "
            "Passwords must be hashed with salted algorithms like bcrypt or argon2 to protect against data breaches."
        )
        q5_res = await client.post(
            f"/api/v1/adaptive-interview/{ass_2_id}/answer",
            json={"question_index": 5, "answer_text": good_ans},
            headers=headers,
        )
        assert q5_res.status_code == 200
        q5_eval = q5_res.json()
        assert q5_eval["is_correct"] is True
        assert q5_eval["round_completed"] is True
        assert q5_eval["round_passed"] is True
        assert q5_eval["session_status"] == "IN_PROGRESS"
        # Round 2 must be unlocked with 2 new questions (total 7 questions)
        assert q5_eval["next_question"]["index"] == 6

        # Verify assessment 2 has advanced to Round 2 with 7 questions
        check_2 = await client.get(f"/api/v1/adaptive-interview/{ass_2_id}", headers=headers)
        assert check_2.json()["current_round"] == 2
        assert check_2.json()["total_questions_asked"] == 7
        assert check_2.json()["total_correct"] == 1

        # Step 5: In Round 2, fail both Q6 and Q7 (0/2) -> Should terminate early
        await client.post(
            f"/api/v1/adaptive-interview/{ass_2_id}/answer",
            json={"question_index": 6, "answer_text": "none"},
            headers=headers,
        )
        q7_res = await client.post(
            f"/api/v1/adaptive-interview/{ass_2_id}/answer",
            json={"question_index": 7, "answer_text": "no idea"},
            headers=headers,
        )
        assert q7_res.status_code == 200
        q7_eval = q7_res.json()
        assert q7_eval["round_completed"] is True
        assert q7_eval["round_passed"] is False
        assert q7_eval["session_status"] == "TERMINATED_EARLY"
        assert "Round 2" in (q7_eval["termination_reason"] or "")

        # Step 6: Verify candidate history and summary endpoints
        history_res = await client.get("/api/v1/adaptive-interview/history", headers=headers)
        assert history_res.status_code == 200
        history_data = history_res.json()
        assert len(history_data) >= 2

        summary_res = await client.get(f"/api/v1/adaptive-interview/{ass_2_id}/summary", headers=headers)
        assert summary_res.status_code == 200
        summary = summary_res.json()
        assert "verdict" in summary
        assert "total_questions" in summary
        assert summary["total_correct"] == 1
        assert "strengths" in summary
        assert "weaknesses" in summary
