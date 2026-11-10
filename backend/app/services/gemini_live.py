"""
Gemini Live API Service — AI Voice Interview Integration
Handles bidirectional audio streaming between candidate and Gemini Live API.
"""

import asyncio
import json
import logging
import struct
from typing import AsyncGenerator, Optional
import httpx

logger = logging.getLogger("ai_recruitment_hub.gemini_live")

# Gemini Live API (BidiGenerateContent) WebSocket endpoint
GEMINI_LIVE_WSS_URL = (
    "wss://generativelanguage.googleapis.com/ws/"
    "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
)
GEMINI_MODEL = "models/gemini-2.0-flash-exp"


def build_interview_system_prompt(job_title: str, candidate_name: str) -> str:
    """Build a professional AI interviewer system prompt for the given position."""
    return (
        f"You are Dr. Gemini, a professional AI technical interviewer at AI Recruitment Hub. "
        f"You are conducting a structured technical interview for the position of '{job_title}' "
        f"for the candidate named '{candidate_name}'. "
        f"Your responsibilities:\n"
        f"- Greet the candidate warmly by name and introduce yourself briefly.\n"
        f"- Ask ONE clear, focused question at a time — wait for the candidate to fully answer before continuing.\n"
        f"- Start with an experience/background question, then progress to role-specific technical questions.\n"
        f"- Be professional, encouraging, and constructive. Acknowledge good answers briefly.\n"
        f"- If the candidate seems confused, offer a helpful clarification or rephrase.\n"
        f"- After 4-6 questions, conclude the interview graciously and thank the candidate.\n"
        f"- Keep each response concise and conversational (2-4 sentences max).\n"
        f"- Do NOT ask multiple questions at once. ONE question per turn only.\n"
        f"Start by greeting the candidate now."
    )


class GeminiLiveSession:
    """
    Manages a Gemini Live API session for a single interview room.
    Acts as a WebSocket proxy: receives audio from candidate,
    sends to Gemini, streams AI audio response back.
    """

    def __init__(
        self,
        api_key: str,
        job_title: str = "Software Engineer",
        candidate_name: str = "Candidate",
    ):
        self.api_key = api_key
        self.job_title = job_title
        self.candidate_name = candidate_name
        self._ws = None  # Gemini WebSocket connection
        self._connected = False
        self._setup_done = False

    async def connect(self) -> bool:
        """
        Establish WebSocket connection to Gemini Live API and send initial setup.
        Returns True on success, False on failure.
        """
        try:
            import websockets

            url = f"{GEMINI_LIVE_WSS_URL}?key={self.api_key}"
            self._ws = await websockets.connect(
                url,
                ping_interval=20,
                ping_timeout=10,
                max_size=10 * 1024 * 1024,  # 10 MB max message
            )
            logger.info("Connected to Gemini Live API WebSocket")

            # Send BidiGenerateContent setup message
            setup_msg = {
                "setup": {
                    "model": GEMINI_MODEL,
                    "generation_config": {
                        "response_modalities": ["AUDIO"],
                        "speech_config": {
                            "voice_config": {
                                "prebuilt_voice_config": {"voice_name": "Aoede"}
                            }
                        },
                    },
                    "system_instruction": {
                        "parts": [
                            {
                                "text": build_interview_system_prompt(
                                    self.job_title, self.candidate_name
                                )
                            }
                        ]
                    },
                    "tools": [],
                }
            }
            await self._ws.send(json.dumps(setup_msg))

            # Wait for setupComplete acknowledgment
            response_text = await asyncio.wait_for(self._ws.recv(), timeout=15.0)
            response = json.loads(response_text)
            if "setupComplete" in response:
                self._connected = True
                self._setup_done = True
                logger.info("Gemini Live session setup complete")
                return True
            else:
                logger.warning(f"Unexpected Gemini setup response: {response}")
                return False

        except Exception as e:
            logger.error(f"Failed to connect to Gemini Live API: {e}")
            self._connected = False
            return False

    async def send_audio_chunk(self, audio_bytes: bytes, mime_type: str = "audio/webm;codecs=opus") -> None:
        """
        Forward a raw audio chunk from the candidate to Gemini Live API.
        Audio should be webm/opus as captured by the browser's MediaRecorder.
        """
        if not self._connected or self._ws is None:
            raise RuntimeError("Gemini Live session is not connected")

        import base64

        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        msg = {
            "realtimeInput": {
                "mediaChunks": [
                    {"mimeType": mime_type, "data": audio_b64}
                ]
            }
        }
        try:
            await self._ws.send(json.dumps(msg))
        except Exception as e:
            logger.error(f"Failed to send audio chunk to Gemini: {e}")
            self._connected = False
            raise

    async def send_text_turn(self, text: str) -> None:
        """
        Send a text message turn (e.g. candidate typed message or transcript).
        Used when audio is unavailable or for testing.
        """
        if not self._connected or self._ws is None:
            raise RuntimeError("Gemini Live session is not connected")

        msg = {
            "clientContent": {
                "turns": [{"role": "user", "parts": [{"text": text}]}],
                "turnComplete": True,
            }
        }
        try:
            await self._ws.send(json.dumps(msg))
        except Exception as e:
            logger.error(f"Failed to send text turn to Gemini: {e}")
            self._connected = False
            raise

    async def receive_responses(self) -> AsyncGenerator[dict, None]:
        """
        Async generator that yields structured response chunks from Gemini Live.
        Each yielded dict contains:
          - type: 'audio' | 'text' | 'turn_complete' | 'interrupted'
          - data: bytes (for audio) or str (for text)
        """
        if not self._connected or self._ws is None:
            return

        import base64

        try:
            async for raw_msg in self._ws:
                try:
                    msg = json.loads(raw_msg)
                except json.JSONDecodeError:
                    continue

                # Handle serverContent with model turns
                if "serverContent" in msg:
                    content = msg["serverContent"]

                    if content.get("interrupted"):
                        yield {"type": "interrupted", "data": ""}
                        continue

                    model_turn = content.get("modelTurn", {})
                    parts = model_turn.get("parts", [])

                    for part in parts:
                        # Audio response from AI
                        if "inlineData" in part:
                            inline = part["inlineData"]
                            audio_bytes = base64.b64decode(inline.get("data", ""))
                            yield {
                                "type": "audio",
                                "data": audio_bytes,
                                "mime_type": inline.get("mimeType", "audio/pcm"),
                            }

                        # Text transcript from AI
                        elif "text" in part:
                            yield {"type": "text", "data": part["text"]}

                    # Turn complete signal
                    if content.get("turnComplete"):
                        yield {"type": "turn_complete", "data": ""}

                # Tool calls or other server events (future expansion)
                elif "toolCall" in msg:
                    logger.debug(f"Gemini tool call received (not handled): {msg}")

        except Exception as e:
            logger.error(f"Error receiving from Gemini Live: {e}")
            self._connected = False

    async def close(self) -> None:
        """Cleanly close the Gemini Live WebSocket session."""
        self._connected = False
        if self._ws is not None:
            try:
                await self._ws.close()
                logger.info("Gemini Live session closed")
            except Exception:
                pass
            self._ws = None


async def test_gemini_api_key(api_key: str) -> bool:
    """
    Quick sanity-check: verify the Gemini API key is valid by calling
    the REST models list endpoint. Returns True if key works.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            )
            return resp.status_code == 200
    except Exception as e:
        logger.warning(f"Gemini API key test failed: {e}")
        return False

