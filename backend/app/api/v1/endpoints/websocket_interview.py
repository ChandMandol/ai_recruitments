"""
WebSocket Interview Endpoint — Turn-Based Real-time AI Interview Integration (Phase 13)
Enforces strict turn-taking rules:
1. AI_SPEAKING (Candidate listens; mic gated off to prevent echo/feedback)
2. CANDIDATE_SPEAKING (Candidate speaks; VAD & silence detection active; AI silent)
3. AI_PROCESSING (Candidate answer finished; AI analyzes & prepares next question)
4. INTERVIEW_COMPLETED (Session completed; triggers evaluation)
"""

import asyncio
import base64
import json
import logging
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.models.interview import InterviewSchedule, InterviewStatus
from app.models.job import Job
from app.models.user import User
from app.services.cv_analyzer import get_effective_gemini_api_key
from app.services.gemini_live import GeminiLiveSession

logger = logging.getLogger("ai_recruitment_hub.ws_interview")

router = APIRouter()

MAX_INTERVIEW_TURNS = 5  # Structured 5-turn interview


class InterviewState(str, Enum):
    AI_SPEAKING = "AI_SPEAKING"
    CANDIDATE_LISTENING = "CANDIDATE_LISTENING"
    CANDIDATE_SPEAKING = "CANDIDATE_SPEAKING"
    AI_PROCESSING = "AI_PROCESSING"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"


async def _get_interview_info(db: AsyncSession, room_token: str) -> Optional[dict]:
    """Return interview metadata dict for the given room_token."""
    stmt = (
        select(
            InterviewSchedule.id,
            InterviewSchedule.status,
            InterviewSchedule.title,
            InterviewSchedule.duration_minutes,
            Job.title.label("job_title"),
            User.full_name.label("candidate_name"),
        )
        .join(Job, Job.id == InterviewSchedule.job_id)
        .join(User, User.id == InterviewSchedule.candidate_id)
        .where(InterviewSchedule.room_token == room_token)
    )
    result = await db.execute(stmt)
    row = result.mappings().one_or_none()
    if row is None:
        return None
    return {
        "id": str(row["id"]),
        "status": row["status"],
        "title": row["title"],
        "duration_minutes": row["duration_minutes"],
        "job_title": row["job_title"] or "Software Engineer",
        "candidate_name": row["candidate_name"] or "Candidate",
    }


async def _mark_interview_in_progress(db: AsyncSession, interview_id: str):
    """Update interview schedule status to IN_PROGRESS upon joining."""
    stmt = select(InterviewSchedule).where(InterviewSchedule.id == interview_id)
    res = await db.execute(stmt)
    interview = res.scalar_one_or_none()
    if interview and interview.status == InterviewStatus.SCHEDULED.value:
        interview.status = InterviewStatus.IN_PROGRESS.value
        await db.commit()


async def _mark_interview_completed(db: AsyncSession, interview_id: str):
    """Update interview schedule status to COMPLETED."""
    stmt = select(InterviewSchedule).where(InterviewSchedule.id == interview_id)
    res = await db.execute(stmt)
    interview = res.scalar_one_or_none()
    if interview:
        interview.status = InterviewStatus.COMPLETED.value
        await db.commit()


@router.websocket("/ws/interview/{room_token}")
async def interview_websocket(
    websocket: WebSocket,
    room_token: str,
    token: Optional[str] = Query(default=None, description="JWT access token"),
):
    """
    WebSocket endpoint for the Turn-Based AI Live Interview Room.

    Strict Turn-Based Conversation States:
      - AI_SPEAKING: AI is speaking. Candidate mic transmission is rejected.
      - CANDIDATE_SPEAKING: Candidate's turn. Candidate speaks. AI is silent.
      - AI_PROCESSING: Candidate finished answer. AI parses and generates next turn.
      - INTERVIEW_COMPLETED: Max turns reached or session concluded.
    """
    await websocket.accept()
    logger.info(f"WebSocket connection accepted for room: {room_token}")

    async with AsyncSessionLocal() as db:
        # ── 1. JWT Authentication ───────────────────────────────────────────
        if not token:
            await websocket.send_json({
                "type": "error",
                "message": "Authentication required. Provide ?token=<jwt>",
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        payload = decode_token(token)
        if payload is None:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid or expired authentication token.",
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user_id = payload.get("sub")
        logger.info(f"WS auth OK — user_id={user_id}, room={room_token}")

        # ── 2. Validate Room Token via DB ───────────────────────────────────
        interview_info = await _get_interview_info(db, room_token)
        if interview_info is None:
            await websocket.send_json({
                "type": "error",
                "message": f"Interview room '{room_token}' not found or has expired.",
            })
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        interview_id = interview_info["id"]
        job_title = interview_info["job_title"]
        candidate_name = interview_info["candidate_name"]

        # Mark interview IN_PROGRESS in DB
        await _mark_interview_in_progress(db, interview_id)

        # ── 3. Load Gemini API Key from DB / env ────────────────────────────
        api_key = await get_effective_gemini_api_key(db)
        gemini_available = bool(api_key)

        # ── 4. Initial Turn-Based State Initialization ──────────────────────
        current_state = InterviewState.AI_SPEAKING
        current_turn = 1
        total_turns = MAX_INTERVIEW_TURNS

        # Send initial "connected" handshake
        await websocket.send_json({
            "type": "connected",
            "room_token": room_token,
            "job_title": job_title,
            "candidate_name": candidate_name,
            "gemini_available": gemini_available,
            "state": current_state.value,
            "current_turn": current_turn,
            "total_turns": total_turns,
        })

        if not gemini_available:
            await websocket.send_json({
                "type": "error",
                "message": (
                    "Gemini API key is not configured. "
                    "AI voice is unavailable. Ask admin to set it in Settings."
                ),
            })

        # ── Helper: Broadcast State Change ──────────────────────────────────
        async def broadcast_state(new_state: InterviewState, reason: str = ""):
            nonlocal current_state
            current_state = new_state
            logger.info(f"Room {room_token} state -> {new_state.value} ({reason})")
            try:
                await websocket.send_json({
                    "type": "state_change",
                    "state": new_state.value,
                    "current_turn": current_turn,
                    "total_turns": total_turns,
                    "reason": reason,
                })
            except Exception:
                pass

        # ── 5. Connect to Gemini Live API ───────────────────────────────────
        gemini_session: Optional[GeminiLiveSession] = None
        gemini_receive_task: Optional[asyncio.Task] = None

        if gemini_available and api_key:
            gemini_session = GeminiLiveSession(
                api_key=api_key,
                job_title=job_title,
                candidate_name=candidate_name,
            )
            connected = await gemini_session.connect()
            if not connected:
                await websocket.send_json({
                    "type": "error",
                    "message": (
                        "Could not connect to Gemini Live API. "
                        "AI voice responses are unavailable — check your API key."
                    ),
                })
                gemini_session = None
                gemini_available = False
            else:
                logger.info(f"Gemini Live connected for room {room_token}")
                await websocket.send_json({"type": "gemini_connected"})
                await broadcast_state(InterviewState.AI_SPEAKING, "Gemini greeting start")

                # Background task: forward Gemini responses → WebSocket client
                async def _stream_gemini_to_client():
                    nonlocal current_turn, current_state
                    try:
                        async for chunk in gemini_session.receive_responses():  # type: ignore[union-attr]
                            chunk_type = chunk["type"]

                            if chunk_type == "audio":
                                # Ensure state is AI_SPEAKING when audio chunks arrive
                                if current_state != InterviewState.AI_SPEAKING:
                                    await broadcast_state(InterviewState.AI_SPEAKING, "AI audio streaming")

                                audio_b64 = base64.b64encode(chunk["data"]).decode()
                                await websocket.send_json({
                                    "type": "ai_audio",
                                    "data": audio_b64,
                                    "mime_type": chunk.get("mime_type", "audio/pcm"),
                                })

                            elif chunk_type == "text":
                                await websocket.send_json({
                                    "type": "ai_text",
                                    "data": chunk["data"],
                                })

                            elif chunk_type == "turn_complete":
                                await websocket.send_json({"type": "ai_turn_complete"})
                                # AI question completed! Hand turn to Candidate
                                if current_turn >= total_turns:
                                    # All turns concluded
                                    await broadcast_state(
                                        InterviewState.INTERVIEW_COMPLETED,
                                        "All interview turns completed",
                                    )
                                    await _mark_interview_completed(db, interview_id)
                                else:
                                    await broadcast_state(
                                        InterviewState.CANDIDATE_SPEAKING,
                                        "AI finished asking question — candidate speaking turn",
                                    )

                            elif chunk_type == "interrupted":
                                await websocket.send_json({"type": "ai_interrupted"})

                    except WebSocketDisconnect:
                        pass
                    except Exception as exc:
                        logger.error(f"Gemini stream error for room {room_token}: {exc}")
                        try:
                            await websocket.send_json({
                                "type": "error",
                                "message": "AI stream error. Reconnecting may help.",
                            })
                        except Exception:
                            pass

                gemini_receive_task = asyncio.create_task(_stream_gemini_to_client())

        # If Gemini is not available (e.g. testing / demo), automatically open Candidate turn
        if not gemini_available or not gemini_session:
            # Send initial simulated prompt and give turn to candidate
            await websocket.send_json({
                "type": "ai_text",
                "data": (
                    f"Welcome {candidate_name}! Thank you for joining the {job_title} technical interview. "
                    "Please introduce yourself and highlight your relevant experience."
                ),
            })
            await websocket.send_json({"type": "ai_turn_complete"})
            await broadcast_state(
                InterviewState.CANDIDATE_SPEAKING,
                "Ready for candidate response",
            )

        # ── 6. Main message loop — receive from client ──────────────────────
        try:
            while True:
                try:
                    raw = await asyncio.wait_for(websocket.receive(), timeout=120.0)
                except asyncio.TimeoutError:
                    try:
                        await websocket.send_json({"type": "ping"})
                    except Exception:
                        break
                    continue

                if raw.get("type") == "websocket.disconnect":
                    logger.info(f"Client disconnected from room {room_token}")
                    break

                text_data = raw.get("text")
                bytes_data = raw.get("bytes")

                if text_data:
                    try:
                        msg = json.loads(text_data)
                    except json.JSONDecodeError:
                        continue

                    msg_type = msg.get("type", "")

                    if msg_type == "ping":
                        await websocket.send_json({"type": "pong"})

                    # Candidate audio chunk — STRICT TURN ENFORCEMENT:
                    # ONLY accept candidate audio when in CANDIDATE_SPEAKING state!
                    elif msg_type == "audio":
                        if current_state != InterviewState.CANDIDATE_SPEAKING:
                            # Strict echo/feedback prevention: ignore candidate audio during AI turn
                            continue

                        audio_b64 = msg.get("data", "")
                        mime_type = msg.get("mime_type", "audio/webm;codecs=opus")
                        if audio_b64 and gemini_session:
                            try:
                                audio_bytes = base64.b64decode(audio_b64)
                                await gemini_session.send_audio_chunk(
                                    audio_bytes, mime_type=mime_type
                                )
                            except Exception as exc:
                                logger.error(f"Audio relay error: {exc}")

                    # Candidate finished speaking turn (via Silence Detection or "Done Speaking" button)
                    elif msg_type == "candidate_turn_done":
                        if current_state == InterviewState.CANDIDATE_SPEAKING:
                            logger.info(
                                f"Candidate finished turn {current_turn}/{total_turns} in room {room_token}"
                            )
                            # Transition to AI_PROCESSING state
                            await broadcast_state(
                                InterviewState.AI_PROCESSING,
                                "Candidate answer finished — AI analyzing response",
                            )

                            current_turn += 1

                            if current_turn > total_turns:
                                # Conclude interview
                                await broadcast_state(
                                    InterviewState.INTERVIEW_COMPLETED,
                                    "Max interview turns reached",
                                )
                                await _mark_interview_completed(db, interview_id)
                                await websocket.send_json({
                                    "type": "ai_text",
                                    "data": (
                                        "Thank you so much! You have answered all the technical questions. "
                                        "Our AI system will now compile your comprehensive evaluation report."
                                    ),
                                })
                                await websocket.send_json({"type": "ai_turn_complete"})
                            elif gemini_session:
                                # Prompt Gemini to process candidate answer and ask next question
                                try:
                                    prompt_next = (
                                        f"Candidate finished answer for Question {current_turn - 1}. "
                                        f"Acknowledge their answer briefly, then proceed to ask Question {current_turn} "
                                        f"out of {total_turns} for the {job_title} role."
                                    )
                                    await gemini_session.send_text_turn(prompt_next)
                                except Exception as exc:
                                    logger.error(f"Failed to prompt next turn to Gemini: {exc}")
                            else:
                                # Mock response for testing/demo without active Gemini Live key
                                await asyncio.sleep(1.0)
                                await broadcast_state(
                                    InterviewState.AI_SPEAKING,
                                    f"AI asking Question {current_turn}",
                                )
                                await websocket.send_json({
                                    "type": "ai_text",
                                    "data": (
                                        f"Great explanation! Now for Question {current_turn}: "
                                        f"How do you approach performance profiling and latency optimization in distributed systems?"
                                    ),
                                })
                                await websocket.send_json({"type": "ai_turn_complete"})
                                await broadcast_state(
                                    InterviewState.CANDIDATE_SPEAKING,
                                    f"Candidate turn for Question {current_turn}",
                                )

                    # Candidate typed text turn
                    elif msg_type == "text":
                        if current_state == InterviewState.CANDIDATE_SPEAKING:
                            text_content = msg.get("data", "").strip()
                            if text_content:
                                await broadcast_state(
                                    InterviewState.AI_PROCESSING,
                                    "Candidate submitted text answer",
                                )
                                current_turn += 1
                                if gemini_session:
                                    try:
                                        await gemini_session.send_text_turn(text_content)
                                    except Exception as exc:
                                        logger.error(f"Text relay error: {exc}")
                                else:
                                    await asyncio.sleep(1.0)
                                    await broadcast_state(
                                        InterviewState.AI_SPEAKING,
                                        f"AI asking Question {current_turn}",
                                    )
                                    await websocket.send_json({
                                        "type": "ai_text",
                                        "data": f"Thank you for sharing. Now for Question {current_turn}: Could you elaborate further on that architecture?",
                                    })
                                    await websocket.send_json({"type": "ai_turn_complete"})
                                    await broadcast_state(
                                        InterviewState.CANDIDATE_SPEAKING,
                                        f"Candidate turn for Question {current_turn}",
                                    )

                    elif msg_type == "end_session":
                        await broadcast_state(
                            InterviewState.INTERVIEW_COMPLETED, "User ended session"
                        )
                        await _mark_interview_completed(db, interview_id)
                        await websocket.send_json({"type": "session_ended"})
                        break

                elif bytes_data and current_state == InterviewState.CANDIDATE_SPEAKING and gemini_session:
                    try:
                        await gemini_session.send_audio_chunk(bytes_data)
                    except Exception as exc:
                        logger.error(f"Binary audio relay error: {exc}")

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected for room {room_token}")
        except Exception as exc:
            logger.error(f"WebSocket handler error for room {room_token}: {exc}")
        finally:
            if gemini_receive_task and not gemini_receive_task.done():
                gemini_receive_task.cancel()
                try:
                    await gemini_receive_task
                except (asyncio.CancelledError, Exception):
                    pass

            if gemini_session:
                await gemini_session.close()

            logger.info(f"Interview WS session ended: room={room_token}")
