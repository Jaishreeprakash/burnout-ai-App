import json
import math
import random
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from sqlalchemy.exc import DataError
from sqlalchemy.orm import Session
from typing import List, Optional

from config import settings
from database import Base, engine, get_db
from models.tracking import BurnoutRecord
from schemas.validators import reject_nul_bytes
from routes import (
    auth_router,
    burnout_router,
    recommendations_router,
    tracking_router,
    wellness_router,
)
from services.smart_chat import detect_intent, build_response
from services.ai_service import AIService as _AIService
from utils.auth_utils import get_current_user

_ai_svc = _AIService()


# ---------------------------------------------------------------------------
# Lifespan: create all DB tables on startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so they are registered with Base
    import models.user  # noqa: F401
    import models.tracking  # noqa: F401
    Base.metadata.create_all(bind=engine)
    yield


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Burnout Detection API",
    description="AI-Based Mental Burnout Detection and Wellness Monitoring System",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DataError)
async def data_error_handler(request: Request, exc: DataError):
    """
    Postgres rejects certain byte sequences (e.g. NUL 0x00) in text columns
    at the wire-protocol level, which otherwise surfaces as an unhandled 500.
    Treat it as what it really is: invalid client input.
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Invalid characters in request data."},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(tracking_router, prefix=API_PREFIX)
app.include_router(burnout_router, prefix=API_PREFIX)
app.include_router(wellness_router, prefix=API_PREFIX)
app.include_router(recommendations_router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
def health_check():
    return {"status": "healthy", "app": "AI Burnout Detection API", "version": "1.0.0",
            "ai": "OpenAI GPT-4o-mini integrated"}


# ---------------------------------------------------------------------------
# AI Wellness Chat
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[dict]] = []

    _no_nul = field_validator("message", mode="before")(reject_nul_bytes)


@app.post("/api/v1/chat")
def chat_with_ai(
    body: ChatMessage,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Wellness chat — tries OpenAI GPT first, falls back to the built-in
    smart wellness engine (data-driven, personalised, always available).
    """
    from datetime import timezone
    from models.tracking import SleepRecord, PhoneUsageRecord, ActivityRecord, EmotionRecord

    # ── Gather user's latest data ──────────────────────────────────────────
    uid = current_user.id

    latest_burnout = (db.query(BurnoutRecord).filter(BurnoutRecord.user_id == uid)
                      .order_by(BurnoutRecord.date.desc()).first())
    burnout_score = latest_burnout.burnout_score if latest_burnout else 50.0
    risk_level = (
        "critical" if burnout_score >= 75 else
        "high"     if burnout_score >= 50 else
        "moderate" if burnout_score >= 25 else "low"
    )

    latest_sleep = (db.query(SleepRecord).filter(SleepRecord.user_id == uid)
                    .order_by(SleepRecord.date.desc()).first())
    latest_phone = (db.query(PhoneUsageRecord).filter(PhoneUsageRecord.user_id == uid)
                    .order_by(PhoneUsageRecord.date.desc()).first())
    latest_activity = (db.query(ActivityRecord).filter(ActivityRecord.user_id == uid)
                       .order_by(ActivityRecord.date.desc()).first())

    cutoff = datetime.now(timezone.utc) - timedelta(days=3)
    recent_emotions = (db.query(EmotionRecord)
                       .filter(EmotionRecord.user_id == uid, EmotionRecord.timestamp >= cutoff)
                       .order_by(EmotionRecord.timestamp.desc()).limit(10).all())

    sleep_data = ({"duration_hours": latest_sleep.duration_hours,
                   "quality_score": latest_sleep.quality_score,
                   "bedtime": latest_sleep.bedtime}
                  if latest_sleep else None)

    phone_data = ({"screen_time_hours": latest_phone.screen_time_hours,
                   "late_night_usage": latest_phone.late_night_usage,
                   "pickups_count": latest_phone.pickups_count}
                  if latest_phone else None)

    activity_data = ({"work_hours": latest_activity.work_hours,
                      "exercise_minutes": latest_activity.exercise_minutes,
                      "break_count": latest_activity.break_count,
                      "focus_score": latest_activity.focus_score}
                     if latest_activity else None)

    emotion_list = [{"dominant_emotion": e.dominant_emotion, "confidence": e.confidence}
                    for e in recent_emotions]
    emotion_summary = _ai_svc.analyze_emotions(emotion_list)
    emotion_data = {"dominant_emotion": emotion_summary["dominant_emotion"],
                    "negative_ratio": emotion_summary["negative_ratio"],
                    "stability_score": emotion_summary["stability_score"]}

    # Compute component scores for context
    component_scores = {
        "sleep_score":          _ai_svc._sleep_to_burnout_component(sleep_data),
        "phone_overuse_score":  _ai_svc._phone_to_burnout_component(phone_data),
        "activity_score":       _ai_svc._activity_to_burnout_component(activity_data),
        "emotion_score":        _ai_svc._emotion_to_burnout_component(emotion_data),
        "typing_distress_score": 40.0,
    }

    username = current_user.full_name or current_user.username

    # ── Smart Wellness Engine (always active, data-personalised) ──────────
    # OpenAI GPT is tried first if credits are available; smart engine is
    # the primary fallback. It reads all of the user's real tracking data.
    ai_source = "smart-engine"

    # Try GPT via direct HTTP (no openai package dependency)
    gpt_reply = None
    try:
        from services.openai_service import wellness_chat
        gpt_reply = wellness_chat(
            user_message         = body.message,
            burnout_score        = burnout_score,
            risk_level           = risk_level,
            conversation_history = body.history,
            username             = username,
        )
        ai_source = "gpt"
    except Exception:
        pass  # Fall through to smart engine

    if gpt_reply:
        reply = gpt_reply
    else:
        intent = detect_intent(body.message)
        reply = build_response(
            intent           = intent,
            message          = body.message,
            burnout_score    = burnout_score,
            risk_level       = risk_level,
            username         = username,
            sleep_data       = sleep_data,
            phone_data       = phone_data,
            activity_data    = activity_data,
            emotion_data     = emotion_data,
            component_scores = component_scores,
        )

    return {
        "reply":         reply,
        "burnout_score": burnout_score,
        "risk_level":    risk_level,
        "ai_source":     ai_source,
        "timestamp":     datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    # A bare "the process is up" check isn't a reliable readiness signal on
    # its own -- with NullPool (see database.py, used for Supabase's
    # transaction pooler) every request opens a fresh DB connection, so the
    # web process can report healthy well before the DB path is actually
    # warm. Exercising a real query here means callers that wait on this
    # endpoint (e.g. the E2E suite's readiness check) don't race the first
    # real request against a cold connection.
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Seed endpoint — generate 30 days of realistic mock data for a user
# ---------------------------------------------------------------------------

EMOTIONS = ["happy", "neutral", "sad", "angry", "fearful", "surprised", "disgusted", "calm", "anxious"]
EMOTION_TYPES = ["facial", "voice"]


def _rng_float(low: float, high: float, seed_extra: int = 0) -> float:
    """Deterministic pseudo-random float in [low, high] based on context seed."""
    return round(low + (high - low) * ((seed_extra * 1.6180339887) % 1.0), 2)


def _burnout_progression(day_idx: int, base: float = 35.0, amplitude: float = 20.0) -> float:
    """Simulate realistic burnout curve: starts moderate, peaks mid-month, recovers."""
    # Sinusoidal pattern with slight upward drift then recovery
    phase = (day_idx / 29.0) * 2 * math.pi
    progression = base + amplitude * math.sin(phase) + 0.3 * day_idx - 5
    return max(10.0, min(90.0, progression))


@app.get("/api/v1/seed/{user_id}")
def seed_user_data(user_id: int, db: Session = Depends(get_db)):
    """
    Generate 30 days of realistic mock data for a given user.
    Useful for testing dashboards and visualizations without manual data entry.
    """
    from models.user import User
    from models.tracking import (
        ActivityRecord,
        BurnoutRecord,
        EmotionRecord,
        PhoneUsageRecord,
        SleepRecord,
        TypingBehaviorRecord,
        WellnessScore,
    )
    from services.ai_service import AIService

    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with id {user_id} not found",
        )

    ai_svc = AIService()
    now = datetime.now(timezone.utc)
    records_created = {
        "sleep": 0,
        "phone_usage": 0,
        "typing": 0,
        "emotions": 0,
        "activity": 0,
        "burnout": 0,
        "wellness": 0,
    }

    # Seed values anchored to user_id for reproducibility across calls
    r = random.Random(user_id * 42 + 7)

    for day_offset in range(29, -1, -1):  # 30 days ago → today
        day_date = now - timedelta(days=day_offset)
        day_date_clean = day_date.replace(hour=8, minute=0, second=0, microsecond=0)

        # --- Burnout progression curve ---
        day_idx = 29 - day_offset
        expected_burnout = _burnout_progression(day_idx)

        # ---- Sleep Record ----
        # Good sleep early, degrades mid-period, improves at end
        if day_idx < 10:
            duration = r.uniform(7.0, 8.5)
            quality = r.uniform(70.0, 90.0)
            consistency = r.uniform(75.0, 95.0)
            bedtime = f"{r.randint(22, 23):02d}:{r.choice(['00', '30'])}"
        elif day_idx < 20:
            duration = r.uniform(5.0, 7.0)
            quality = r.uniform(45.0, 70.0)
            consistency = r.uniform(45.0, 65.0)
            bedtime = f"{r.randint(0, 2):02d}:{r.choice(['00', '30'])}"
        else:
            duration = r.uniform(7.0, 9.0)
            quality = r.uniform(65.0, 88.0)
            consistency = r.uniform(70.0, 90.0)
            bedtime = f"{r.randint(22, 23):02d}:{r.choice(['00', '30'])}"

        wake_hour = int(bedtime.split(":")[0]) + int(duration)
        wake_time = f"{wake_hour % 24:02d}:00"

        sleep_rec = SleepRecord(
            user_id=user_id,
            date=day_date_clean,
            duration_hours=round(duration, 2),
            quality_score=round(quality, 2),
            consistency_score=round(consistency, 2),
            bedtime=bedtime,
            wake_time=wake_time,
        )
        db.add(sleep_rec)
        records_created["sleep"] += 1

        # ---- Phone Usage Record ----
        if day_idx < 10:
            screen_time = r.uniform(2.0, 4.5)
            late_night = r.random() < 0.15
            pickups = r.randint(30, 55)
        elif day_idx < 20:
            screen_time = r.uniform(5.5, 9.0)
            late_night = r.random() < 0.6
            pickups = r.randint(70, 130)
        else:
            screen_time = r.uniform(3.0, 5.0)
            late_night = r.random() < 0.25
            pickups = r.randint(40, 70)

        app_usage = {
            "social_media": round(screen_time * r.uniform(0.25, 0.40), 2),
            "productivity": round(screen_time * r.uniform(0.20, 0.35), 2),
            "entertainment": round(screen_time * r.uniform(0.15, 0.30), 2),
            "communication": round(screen_time * r.uniform(0.10, 0.20), 2),
        }

        phone_rec = PhoneUsageRecord(
            user_id=user_id,
            date=day_date_clean,
            screen_time_hours=round(screen_time, 2),
            app_usage_data=json.dumps(app_usage),
            late_night_usage=late_night,
            pickups_count=pickups,
        )
        db.add(phone_rec)
        records_created["phone_usage"] += 1

        # ---- Typing Behavior Record ----
        if day_idx < 10:
            speed = r.uniform(65.0, 85.0)
            accuracy = r.uniform(93.0, 99.0)
            pauses = r.uniform(0.05, 0.12)
            session_min = r.uniform(30.0, 75.0)
        elif day_idx < 20:
            speed = r.uniform(40.0, 58.0)
            accuracy = r.uniform(80.0, 91.0)
            pauses = r.uniform(0.25, 0.50)
            session_min = r.uniform(100.0, 160.0)
        else:
            speed = r.uniform(60.0, 78.0)
            accuracy = r.uniform(91.0, 97.0)
            pauses = r.uniform(0.08, 0.18)
            session_min = r.uniform(45.0, 90.0)

        typing_rec = TypingBehaviorRecord(
            user_id=user_id,
            date=day_date_clean,
            avg_speed_wpm=round(speed, 2),
            accuracy_percent=round(accuracy, 2),
            pause_frequency=round(pauses, 3),
            session_duration_minutes=round(session_min, 2),
        )
        db.add(typing_rec)
        records_created["typing"] += 1

        # ---- Activity Record ----
        if day_idx < 10:
            work_hours = r.uniform(6.0, 8.0)
            study_hours = r.uniform(1.0, 3.0)
            exercise_min = r.uniform(30.0, 60.0)
            break_count = r.randint(4, 8)
            focus = r.uniform(72.0, 90.0)
        elif day_idx < 20:
            work_hours = r.uniform(9.0, 13.0)
            study_hours = r.uniform(3.0, 6.0)
            exercise_min = r.uniform(0.0, 15.0)
            break_count = r.randint(0, 2)
            focus = r.uniform(40.0, 62.0)
        else:
            work_hours = r.uniform(6.5, 8.5)
            study_hours = r.uniform(1.5, 3.5)
            exercise_min = r.uniform(25.0, 50.0)
            break_count = r.randint(3, 7)
            focus = r.uniform(65.0, 85.0)

        activity_rec = ActivityRecord(
            user_id=user_id,
            date=day_date_clean,
            study_hours=round(study_hours, 2),
            work_hours=round(work_hours, 2),
            exercise_minutes=round(exercise_min, 2),
            break_count=break_count,
            focus_score=round(focus, 2),
        )
        db.add(activity_rec)
        records_created["activity"] += 1

        # ---- Emotion Records (2 per day) ----
        for emo_idx in range(2):
            if day_idx < 10:
                emotion_pool = ["happy", "neutral", "calm", "content"]
                neg_chance = 0.1
            elif day_idx < 20:
                emotion_pool = ["sad", "anxious", "stressed", "angry", "neutral"]
                neg_chance = 0.65
            else:
                emotion_pool = ["neutral", "calm", "happy", "content"]
                neg_chance = 0.2

            dominant = r.choice(emotion_pool)
            confidence = round(r.uniform(0.65, 0.97), 3)
            emo_type = r.choice(EMOTION_TYPES)

            # Build score distribution
            raw_scores = {e: round(r.uniform(0.01, 0.15), 3) for e in EMOTIONS}
            raw_scores[dominant] = round(r.uniform(0.5, 0.9), 3)
            total = sum(raw_scores.values())
            norm_scores = {e: round(v / total, 3) for e, v in raw_scores.items()}

            emo_timestamp = day_date_clean.replace(hour=9 + emo_idx * 6)
            emotion_rec = EmotionRecord(
                user_id=user_id,
                timestamp=emo_timestamp,
                emotion_type=emo_type,
                dominant_emotion=dominant,
                confidence=confidence,
                emotion_scores=json.dumps(norm_scores),
            )
            db.add(emotion_rec)
            records_created["emotions"] += 1

        # ---- Compute and store Burnout Record ----
        sleep_data = {
            "duration_hours": sleep_rec.duration_hours,
            "quality_score": sleep_rec.quality_score,
            "consistency_score": sleep_rec.consistency_score,
        }
        phone_data = {
            "screen_time_hours": phone_rec.screen_time_hours,
            "late_night_usage": phone_rec.late_night_usage,
            "pickups_count": phone_rec.pickups_count,
        }
        typing_data = {
            "avg_speed_wpm": typing_rec.avg_speed_wpm,
            "accuracy_percent": typing_rec.accuracy_percent,
            "pause_frequency": typing_rec.pause_frequency,
            "session_duration_minutes": typing_rec.session_duration_minutes,
        }
        act_data = {
            "study_hours": activity_rec.study_hours,
            "work_hours": activity_rec.work_hours,
            "exercise_minutes": activity_rec.exercise_minutes,
            "break_count": activity_rec.break_count,
            "focus_score": activity_rec.focus_score,
        }
        emotion_data = {
            "stability_score": 70.0 - (day_idx * 1.5 if 10 <= day_idx < 20 else 0),
            "negative_ratio": 0.6 if 10 <= day_idx < 20 else 0.15,
            "dominant_emotion": "stressed" if 10 <= day_idx < 20 else "neutral",
        }

        result = ai_svc.calculate_burnout_score(sleep_data, phone_data, typing_data, act_data, emotion_data)

        burnout_rec = BurnoutRecord(
            user_id=user_id,
            date=day_date_clean,
            burnout_score=result["burnout_score"],
            risk_level=result["risk_level"],
        )
        db.add(burnout_rec)
        records_created["burnout"] += 1

        # ---- Compute Wellness Score ----
        comp = result["component_scores"]
        wellness = ai_svc.calculate_wellness_score(
            result["burnout_score"],
            comp["sleep_score"],
            comp["activity_score"],
            comp["emotion_score"],
        )

        wellness_rec = WellnessScore(
            user_id=user_id,
            date=day_date_clean,
            overall_score=wellness["overall_score"],
            stress_level=wellness["stress_level"],
            mood_score=wellness["mood_score"],
            productivity_score=wellness["productivity_score"],
            notes="Seeded mock data",
        )
        db.add(wellness_rec)
        records_created["wellness"] += 1

    db.commit()

    return {
        "status": "success",
        "message": f"Successfully seeded 30 days of mock data for user {user_id} ({user.username})",
        "records_created": records_created,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        },
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
