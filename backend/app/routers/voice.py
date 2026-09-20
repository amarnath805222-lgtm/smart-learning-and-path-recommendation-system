"""Voice WebSocket router — Real-time voice agent powered by Gemini 3.8 Live."""
import json
import base64
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from google import genai
from google.genai import types

from app.config import settings
from app.auth_utils import decode_token
from app.database import AsyncSessionLocal
from app.models import User, StudentProfile, LearningPath, LearningPathItem, StudentSkill, Skill

logger = logging.getLogger("voice")
router = APIRouter(prefix="/voice", tags=["voice"])

MODEL_LIVE = "gemini-3.8-live"


def get_genai_client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


@router.websocket("/session")
async def voice_session(websocket: WebSocket, token: str = Query(None)):
    """WebSocket endpoint connecting authenticated student to real-time Gemini 3.8 Live."""
    await websocket.accept()
    print("[Voice] Client WebSocket connected")

    if not token:
        await websocket.send_json({"type": "error", "message": "Authentication token required"})
        await websocket.close()
        return

    payload = decode_token(token)
    if not payload:
        await websocket.send_json({"type": "error", "message": "Invalid or expired token"})
        await websocket.close()
        return

    user_id = payload.get("sub")
    api_available = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your_gemini_api_key_here")

    if not api_available:
        await websocket.send_json({
            "type": "error",
            "message": "Gemini API key is not configured in backend/.env."
        })
        await websocket.close()
        return

    # Fetch authenticated student's real context from database
    async with AsyncSessionLocal() as db:
        u_res = await db.execute(select(User).where(User.id == user_id))
        user = u_res.scalar_one_or_none()

        p_res = await db.execute(select(StudentProfile).where(StudentProfile.user_id == user_id))
        profile = p_res.scalar_one_or_none()

        lp_res = await db.execute(select(LearningPath).where(LearningPath.user_id == user_id))
        path = lp_res.scalar_one_or_none()

        current_topic = None
        completed_topics = []
        if path:
            items_res = await db.execute(
                select(LearningPathItem)
                .where(LearningPathItem.path_id == path.id)
                .order_by(LearningPathItem.order_index)
            )
            items = items_res.scalars().all()
            completed_topics = [i.topic_name for i in items if i.status == "completed"]
            active = [i for i in items if i.status in ("in_progress", "available")]
            if active:
                current_topic = active[0].topic_name

        weak_skills = []
        if profile:
            sk_res = await db.execute(
                select(StudentSkill, Skill)
                .join(Skill, StudentSkill.skill_id == Skill.id)
                .where(StudentSkill.profile_id == profile.id, StudentSkill.level < 60)
            )
            weak_skills = [s.name for _, s in sk_res.all()]

    career_goal = profile.career_goal if profile and profile.career_goal else "Technical Learner"
    student_name = user.full_name if user else "the student"

    system_instruction = f"""You are SmartLearn AI, a warm, encouraging, expert technical tutor speaking live with {student_name}.
Student Profile:
- Target Career Goal: {career_goal}
- Current Active Learning Topic: {current_topic or 'Fundamentals'}
- Overall Progress: {profile.overall_progress if profile else 0}%
- Completed Modules: {', '.join(completed_topics) if completed_topics else 'None yet'}
- Focus Areas to Strengthen: {', '.join(weak_skills) if weak_skills else 'None identified'}

Spoken Voice Rules:
1. You are having an interactive real-time voice conversation. Keep answers concise (1 to 3 spoken sentences).
2. Speak naturally, smoothly, and conversationally.
3. NEVER output markdown symbols, bullet points (*), emojis, or code syntax; describe technical ideas conversationally.
4. Direct the student clearly based on their goal and current topic.
5. If the student has not completed their skill assessment yet, warmly invite them to explore concepts and take the assessment."""

    config = {
        "response_modalities": ["AUDIO"],
        "speech_config": {
            "voice_config": {
                "prebuilt_voice_config": {
                    "voice_name": "Aoede"
                }
            }
        },
        "system_instruction": {"parts": [{"text": system_instruction}]}
    }

    client = get_genai_client()

    try:
        print(f"[Voice] Connecting to Gemini Live ({MODEL_LIVE})...")
        async with client.aio.live.connect(model=MODEL_LIVE, config=config) as session:
            print("[Voice] Connected to Gemini Live session!")
            await websocket.send_json({
                "type": "connected",
                "message": f"Connected to Gemini Live with {student_name}'s context",
                "model": MODEL_LIVE,
            })

            async def client_to_gemini():
                """Forward audio and commands from browser to Gemini Live."""
                try:
                    while True:
                        msg = await websocket.receive()
                        # Handle binary audio frame from microphone
                        if "bytes" in msg and msg["bytes"]:
                            raw_pcm = msg["bytes"]
                            await session.send_realtime_input(
                                audio=types.Blob(data=raw_pcm, mime_type="audio/pcm;rate=16000")
                            )
                        # Handle JSON control frames
                        elif "text" in msg and msg["text"]:
                            data = json.loads(msg["text"])
                            m_type = data.get("type", "")

                            if m_type == "audio" and data.get("data"):
                                audio_bytes = base64.b64decode(data["data"])
                                await session.send_realtime_input(
                                    audio=types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")
                                )
                            elif m_type == "text" and data.get("text"):
                                await session.send_client_content(
                                    turns={"role": "user", "parts": [{"text": data["text"]}]},
                                    turn_complete=True
                                )
                            elif m_type == "interrupt":
                                print("[Voice] User interrupted AI speech")
                            elif m_type == "end":
                                print("[Voice] User ended talk session")
                                break
                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    print(f"[Voice] Error in client_to_gemini: {e}")

            async def gemini_to_client():
                """Stream audio responses, transcripts, and status from Gemini Live to browser across continuous turns."""
                try:
                    while True:
                        async for msg in session.receive():
                            sc = msg.server_content
                            if not sc:
                                continue

                            # Handle interruption
                            if sc.interrupted:
                                print("[Voice] Gemini detected interruption")
                                await websocket.send_json({"type": "interrupted"})

                            # Handle audio and transcript chunks
                            if sc.model_turn:
                                for part in sc.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        b64_audio = base64.b64encode(part.inline_data.data).decode("utf-8")
                                        await websocket.send_json({
                                            "type": "audio_chunk",
                                            "data": b64_audio,
                                            "sample_rate": 24000,
                                        })
                                    if part.text:
                                        await websocket.send_json({
                                            "type": "transcript",
                                            "text": part.text,
                                        })

                            if sc.output_transcription and sc.output_transcription.text:
                                await websocket.send_json({
                                    "type": "transcript",
                                    "text": sc.output_transcription.text,
                                })

                            # Turn complete
                            if sc.turn_complete:
                                print("[Voice] Gemini turn complete; staying connected for next turns")
                                await websocket.send_json({"type": "turn_complete"})

                except WebSocketDisconnect:
                    pass
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    print(f"[Voice] Error in gemini_to_client: {e}")

            # Run bi-directional streaming concurrently
            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(client_to_gemini()),
                    asyncio.create_task(gemini_to_client()),
                ],
                return_when=asyncio.FIRST_COMPLETED
            )

            for task in pending:
                task.cancel()

    except WebSocketDisconnect:
        print("[Voice] WebSocket disconnected by client")
    except Exception as live_err:
        print(f"[Voice] Gemini Live connection failed: {live_err}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Gemini Live connection error: {str(live_err)}"
            })
        except Exception:
            pass
