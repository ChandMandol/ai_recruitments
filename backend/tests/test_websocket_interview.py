"""
Tests for WebSocket Real-time Turn-Based Interview Integration (Phase 13).
Validates:
1. Authentication & room validation
2. Turn states (AI_SPEAKING -> CANDIDATE_SPEAKING -> AI_PROCESSING -> INTERVIEW_COMPLETED)
3. Mutual exclusion & turn-taking
4. Ping/pong keepalive
5. Clean session termination
"""

import asyncio
import base64
import json
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


class ASGIWebSocketSession:
    """Async in-memory ASGI WebSocket client that runs in the same event loop."""

    def __init__(self, app, path: str, query_string: str = ""):
        self.app = app
        self.path = path
        self.query_string = query_string
        self.to_app: asyncio.Queue = asyncio.Queue()
        self.from_app: asyncio.Queue = asyncio.Queue()
        self.task: asyncio.Task | None = None
        self.closed = False

    async def __aenter__(self):
        scope = {
            "type": "websocket",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "scheme": "ws",
            "server": ("127.0.0.1", 80),
            "client": ("127.0.0.1", 12345),
            "path": self.path,
            "raw_path": self.path.encode("ascii"),
            "query_string": self.query_string.encode("ascii"),
            "headers": [(b"host", b"127.0.0.1")],
            "subprotocols": [],
        }

        async def receive():
            return await self.to_app.get()

        async def send(message):
            await self.from_app.put(message)

        self.task = asyncio.create_task(self.app(scope, receive, send))

        # Send initial connect frame
        await self.to_app.put({"type": "websocket.connect"})

        # Wait for accept or close
        first_msg = await asyncio.wait_for(self.from_app.get(), timeout=5.0)
        self.first_msg = first_msg
        return self

    async def send_json(self, data: dict):
        await self.to_app.put({"type": "websocket.receive", "text": json.dumps(data)})

    async def receive_json(self, timeout: float = 5.0) -> dict:
        msg = await asyncio.wait_for(self.from_app.get(), timeout=timeout)
        if msg["type"] == "websocket.close":
            self.closed = True
            return {"type": "closed", "code": msg.get("code", 1000)}
        text = msg.get("text", "{}")
        return json.loads(text)

    async def close(self, code: int = 1000):
        if not self.closed:
            self.closed = True
            await self.to_app.put({"type": "websocket.disconnect", "code": code})
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await self.task
            except (asyncio.CancelledError, Exception):
                pass

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


@pytest.mark.asyncio
async def test_websocket_interview_connection_and_messaging():
    """
    Complete lifecycle test for Turn-Based Interview WebSocket:
    1. Admin creates a job and candidate
    2. Admin schedules an interview
    3. Test unauthenticated WS connection (rejected)
    4. Test invalid room_token WS connection (rejected)
    5. Test turn-based state machine:
       - Connected -> AI_SPEAKING
       - Hand off to CANDIDATE_SPEAKING
       - Candidate answers -> sends candidate_turn_done
       - Transitions to AI_PROCESSING -> Next turn
       - End session -> INTERVIEW_COMPLETED
    """
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # ── Step 1: Admin Login ──────────────────────────────────────────────
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

        # ── Step 2: Create Job ───────────────────────────────────────────────
        job_res = await ac.post(
            f"{settings.API_V1_STR}/jobs",
            headers=admin_headers,
            json={
                "title": f"Turn-Based AI Specialist {uuid.uuid4().hex[:4]}",
                "description": "Expert in VAD, full-duplex suppression and conversational turn taking.",
                "required_skills": ["Python", "FastAPI", "WebRTC"],
                "employment_type": "Full-time",
                "is_published": True,
            },
        )
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # ── Step 3: Register Candidate & Login ──────────────────────────────
        cand_email = f"tb_candidate_{uuid.uuid4().hex[:6]}@example.com"
        cand_reg = await ac.post(
            f"{settings.API_V1_STR}/auth/register/candidate",
            json={
                "full_name": "Turn-Based Candidate",
                "email": cand_email,
                "password": "Password123!",
            },
        )
        assert cand_reg.status_code == 201
        cand_data = cand_reg.json()
        cand_token = cand_data["access_token"]
        cand_headers = {"Authorization": f"Bearer {cand_token}"}

        # ── Step 4: Candidate applies to job ────────────────────────────────
        app_res = await ac.post(
            f"{settings.API_V1_STR}/applications",
            headers=cand_headers,
            json={
                "job_id": job_id,
                "resume_url": "/uploads/resumes/dummy_turn.pdf",
                "resume_filename": "CV_TurnBased.pdf",
                "cover_letter": "Excited for turn-based AI interview.",
            },
        )
        assert app_res.status_code == 201
        application_id = app_res.json()["id"]

        # ── Step 5: Admin schedules interview ───────────────────────────────
        scheduled_time = datetime.now(timezone.utc) + timedelta(days=2)
        sched_res = await ac.post(
            f"{settings.API_V1_STR}/interviews",
            headers=admin_headers,
            json={
                "application_id": application_id,
                "scheduled_at": scheduled_time.isoformat(),
                "duration_minutes": 30,
                "title": "Turn-Based Technical Interview",
                "instructions": "Be prepared to take structured speaking turns.",
            },
        )
        assert sched_res.status_code == 201
        interview_data = sched_res.json()
        room_token = interview_data["room_token"]
        assert room_token.startswith("room_live_")

    # ── Step 6: WebSocket Tests ──────────────────────────────────────────────

    # A. Unauthenticated connection rejected
    async with ASGIWebSocketSession(
        app,
        path=f"{settings.API_V1_STR}/ws/interview/{room_token}",
        query_string="",
    ) as ws:
        assert ws.first_msg["type"] == "websocket.accept"
        err_msg = await ws.receive_json()
        assert err_msg["type"] == "error"
        assert "Authentication required" in err_msg["message"]
        close_frame = await ws.receive_json()
        assert close_frame["type"] == "closed"
        assert close_frame["code"] == 1008

    # B. Invalid room token rejected
    async with ASGIWebSocketSession(
        app,
        path=f"{settings.API_V1_STR}/ws/interview/invalid_room_token_999",
        query_string=f"token={cand_token}",
    ) as ws:
        assert ws.first_msg["type"] == "websocket.accept"
        err_msg = await ws.receive_json()
        assert err_msg["type"] == "error"
        assert "not found" in err_msg["message"]
        close_frame = await ws.receive_json()
        assert close_frame["type"] == "closed"
        assert close_frame["code"] == 1008

    # C. Valid authenticated connection to valid interview room
    async with ASGIWebSocketSession(
        app,
        path=f"{settings.API_V1_STR}/ws/interview/{room_token}",
        query_string=f"token={cand_token}",
    ) as ws:
        assert ws.first_msg["type"] == "websocket.accept"

        # 1. First message must be "connected" handshake with Turn info
        init_msg = await ws.receive_json()
        assert init_msg["type"] == "connected"
        assert init_msg["room_token"] == room_token
        assert init_msg["candidate_name"] == "Turn-Based Candidate"
        assert "state" in init_msg
        assert init_msg["state"] == "AI_SPEAKING"
        assert init_msg["current_turn"] == 1
        assert init_msg["total_turns"] == 5

        # Drain initial server messages until candidate turn is reached
        # (Could be error on dummy Gemini key, followed by AI intro text, and state_change to CANDIDATE_SPEAKING)
        candidate_turn_reached = False
        for _ in range(5):
            msg = await ws.receive_json()
            if msg.get("type") == "state_change" and msg.get("state") == "CANDIDATE_SPEAKING":
                candidate_turn_reached = True
                break

        assert candidate_turn_reached, "Expected state to transition to CANDIDATE_SPEAKING"

        # 2. Ping-pong keepalive test
        await ws.send_json({"type": "ping"})
        pong_msg = await ws.receive_json()
        assert pong_msg["type"] == "pong"

        # 3. Audio chunk forwarding protocol during candidate's turn
        dummy_audio = base64.b64encode(b"\x00\x01\x02\x03\x04").decode()
        await ws.send_json({
            "type": "audio",
            "data": dummy_audio,
            "mime_type": "audio/webm;codecs=opus",
        })

        # 4. Candidate completes speaking turn (via VAD / Done Speaking)
        await ws.send_json({"type": "candidate_turn_done", "turn": 1})

        # Must receive state_change -> AI_PROCESSING
        proc_msg = await ws.receive_json()
        assert proc_msg["type"] == "state_change"
        assert proc_msg["state"] == "AI_PROCESSING"

        # 5. Clean session termination
        await ws.send_json({"type": "end_session"})

        # Read remaining messages until session_ended
        session_ended_received = False
        completed_state_received = False
        for _ in range(10):
            msg = await ws.receive_json()
            if msg.get("type") == "state_change" and msg.get("state") == "INTERVIEW_COMPLETED":
                completed_state_received = True
            if msg.get("type") == "session_ended":
                session_ended_received = True
                break

        assert completed_state_received, "Expected INTERVIEW_COMPLETED state_change"
        assert session_ended_received, "Expected session_ended confirmation"
