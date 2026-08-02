"""
Recommendations route — uses OpenAI GPT for real-time personalized advice.
Falls back to the rule-based engine if OpenAI is unavailable.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.tracking import (
    ActivityRecord, BurnoutRecord, EmotionRecord, PhoneUsageRecord, SleepRecord, TypingBehaviorRecord,
)
from services.ai_service import AIService
from services.recommendation_service import generate_recommendations, get_quick_tips
from services.openai_service import (
    generate_ai_recommendations,
    generate_burnout_narrative,
    generate_sleep_insight,
    generate_emotion_insight,
)
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])
ai_service = AIService()


def _has_records(user_id: int, db: Session) -> bool:
    return (
        db.query(SleepRecord).filter(SleepRecord.user_id == user_id).first() is not None or
        db.query(PhoneUsageRecord).filter(PhoneUsageRecord.user_id == user_id).first() is not None or
        db.query(EmotionRecord).filter(EmotionRecord.user_id == user_id).first() is not None or
        db.query(ActivityRecord).filter(ActivityRecord.user_id == user_id).first() is not None or
        db.query(TypingBehaviorRecord).filter(TypingBehaviorRecord.user_id == user_id).first() is not None
    )


# ── Data helpers ─────────────────────────────────────────────────────────────

def _latest_sleep(user_id: int, db: Session) -> Optional[SleepRecord]:
    return (db.query(SleepRecord).filter(SleepRecord.user_id == user_id)
            .order_by(SleepRecord.date.desc()).first())

def _latest_phone(user_id: int, db: Session) -> Optional[PhoneUsageRecord]:
    return (db.query(PhoneUsageRecord).filter(PhoneUsageRecord.user_id == user_id)
            .order_by(PhoneUsageRecord.date.desc()).first())

def _latest_activity(user_id: int, db: Session) -> Optional[ActivityRecord]:
    return (db.query(ActivityRecord).filter(ActivityRecord.user_id == user_id)
            .order_by(ActivityRecord.date.desc()).first())

def _latest_burnout_score(user_id: int, db: Session) -> float:
    rec = (db.query(BurnoutRecord).filter(BurnoutRecord.user_id == user_id)
           .order_by(BurnoutRecord.date.desc()).first())
    return rec.burnout_score if rec else 50.0

def _risk_label(score: float) -> str:
    if score >= 75: return "critical"
    if score >= 50: return "high"
    if score >= 25: return "moderate"
    return "low"

def _build_latest_data(user_id: int, db: Session) -> Dict[str, Any]:
    """Collect all latest tracking records into dicts for the AI service."""
    sleep_rec    = _latest_sleep(user_id, db)
    phone_rec    = _latest_phone(user_id, db)
    activity_rec = _latest_activity(user_id, db)

    cutoff = datetime.now(timezone.utc) - timedelta(days=3)
    emotion_recs = (
        db.query(EmotionRecord)
        .filter(EmotionRecord.user_id == user_id, EmotionRecord.timestamp >= cutoff)
        .order_by(EmotionRecord.timestamp.desc()).limit(20).all()
    )

    sleep_data = (
        {"duration_hours": sleep_rec.duration_hours,
         "quality_score":  sleep_rec.quality_score,
         "consistency_score": sleep_rec.consistency_score,
         "bedtime": sleep_rec.bedtime}
        if sleep_rec else None
    )
    phone_data = (
        {"screen_time_hours": phone_rec.screen_time_hours,
         "late_night_usage":  phone_rec.late_night_usage,
         "pickups_count":     phone_rec.pickups_count or 50}
        if phone_rec else None
    )
    activity_data = (
        {"study_hours":       activity_rec.study_hours,
         "work_hours":        activity_rec.work_hours,
         "exercise_minutes":  activity_rec.exercise_minutes,
         "break_count":       activity_rec.break_count,
         "focus_score":       activity_rec.focus_score}
        if activity_rec else None
    )

    emotion_list  = [{"dominant_emotion": e.dominant_emotion, "confidence": e.confidence}
                     for e in emotion_recs]
    emotion_summary = ai_service.analyze_emotions(emotion_list)
    emotion_data = {
        "stability_score":  emotion_summary["stability_score"],
        "negative_ratio":   emotion_summary["negative_ratio"],
        "dominant_emotion": emotion_summary["dominant_emotion"],
    }

    # Component scores
    s  = ai_service._sleep_to_burnout_component(sleep_data)
    p  = ai_service._phone_to_burnout_component(phone_data)
    a  = ai_service._activity_to_burnout_component(activity_data)
    em = ai_service._emotion_to_burnout_component(emotion_data)
    t  = (s + a) / 2.0   # typing approximation

    component_scores = {
        "sleep_score":          s,
        "phone_overuse_score":  p,
        "typing_distress_score": t,
        "activity_score":       a,
        "emotion_score":        em,
    }

    return {
        "sleep_data":       sleep_data,
        "phone_data":       phone_data,
        "activity_data":    activity_data,
        "emotion_data":     emotion_data,
        "emotion_summary":  emotion_summary,
        "component_scores": component_scores,
    }


def _get_personalized_recommendations(user_id: int, db: Session) -> List[Dict[str, Any]]:
    """Helper function to fetch AI recommendations or rule-based fallbacks."""
    user = db.query(User).filter(User.id == user_id).first()
    username = (user.full_name or user.username) if user else "User"
    
    burnout_score = _latest_burnout_score(user_id, db)
    latest        = _build_latest_data(user_id, db)
    risk_level    = _risk_label(burnout_score)

    try:
        recs = generate_ai_recommendations(
            burnout_score    = burnout_score,
            risk_level       = risk_level,
            component_scores = latest["component_scores"],
            sleep_data       = latest["sleep_data"],
            phone_data       = latest["phone_data"],
            activity_data    = latest["activity_data"],
            emotion_data     = latest["emotion_data"],
            username         = username,
        )
    except Exception:
        recs = generate_recommendations(burnout_score, latest["component_scores"],
                                        {"phone": latest["phone_data"] or {}})
    return recs


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/")
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get GPT-powered personalized recommendations based on real user data."""
    if not _has_records(current_user.id, db):
        return {
            "burnout_score":         0.0,
            "risk_level":            "low",
            "recommendations":       [],
            "total_recommendations": 0,
            "ai_source":             "rule-based",
            "generated_at":          datetime.now(timezone.utc).isoformat(),
        }

    burnout_score = _latest_burnout_score(current_user.id, db)
    risk_level    = _risk_label(burnout_score)
    recs          = _get_personalized_recommendations(current_user.id, db)

    return {
        "burnout_score":         burnout_score,
        "risk_level":            risk_level,
        "recommendations":       recs,
        "total_recommendations": len(recs),
        "ai_source":             "gpt" if len(recs) > 0 else "rule-based",
        "generated_at":          datetime.now(timezone.utc).isoformat(),
    }


@router.get("/quick")
def get_quick_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """3 quick GPT tips for the user's current burnout state."""
    if not _has_records(current_user.id, db):
        return {
            "burnout_score": 0.0,
            "risk_level": "low",
            "tips": [],
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    burnout_score = _latest_burnout_score(current_user.id, db)
    latest        = _build_latest_data(current_user.id, db)
    risk_level    = _risk_label(burnout_score)

    try:
        all_recs = generate_ai_recommendations(
            burnout_score    = burnout_score,
            risk_level       = risk_level,
            component_scores = latest["component_scores"],
            sleep_data       = latest["sleep_data"],
            phone_data       = latest["phone_data"],
            activity_data    = latest["activity_data"],
            emotion_data     = latest["emotion_data"],
            username         = current_user.full_name or current_user.username,
        )
        tips = all_recs[:3]
    except Exception:
        tips = get_quick_tips(burnout_score, latest["component_scores"])

    return {"burnout_score": burnout_score, "risk_level": risk_level,
            "tips": tips, "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/narrative")
def get_burnout_narrative(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GPT narrative explaining the user's burnout state in plain language."""
    if not _has_records(current_user.id, db):
        return {
            "summary": "No tracking data available yet.",
            "main_cause": "You haven't logged any wellness indicators.",
            "positive_note": "Welcome! Start logging your daily routines to get personalized stress analysis.",
            "urgent_action": "Complete a quick check-in or log your sleep to begin.",
            "motivation": "Consistent tracking helps identify stress triggers.",
            "burnout_score": 0.0,
            "risk_level": "low",
            "trend": "stable",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    burnout_score = _latest_burnout_score(current_user.id, db)
    latest        = _build_latest_data(current_user.id, db)
    risk_level    = _risk_label(burnout_score)

    # Get trend from last 30-day records
    records = (db.query(BurnoutRecord)
               .filter(BurnoutRecord.user_id == current_user.id,
                       BurnoutRecord.date >= datetime.now(timezone.utc) - timedelta(days=30))
               .order_by(BurnoutRecord.date.asc()).all())
    scores = [r.burnout_score for r in records]
    trend_direction = ai_service.predict_trend(scores).get("direction", "stable") if len(scores) >= 3 else "stable"

    try:
        narrative = generate_burnout_narrative(
            burnout_score    = burnout_score,
            risk_level       = risk_level,
            component_scores = latest["component_scores"],
            trend_direction  = trend_direction,
            username         = current_user.full_name or current_user.username,
        )
    except Exception:
        narrative = {
            "summary":       f"Your burnout score is {burnout_score:.1f}/100 ({risk_level} risk).",
            "main_cause":    "Multiple factors are contributing to your stress levels.",
            "positive_note": "You're taking steps by monitoring your wellness.",
            "urgent_action": "Take a 10-minute break right now.",
            "motivation":    "Small consistent steps lead to big improvements.",
        }

    return {**narrative, "burnout_score": burnout_score, "risk_level": risk_level,
            "trend": trend_direction, "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/emotion-insight")
def get_emotion_insight(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GPT insight into the user's recent emotional patterns."""
    if not _has_records(current_user.id, db):
        return {
            "interpretation": "No emotional data logged yet.",
            "underlying_cause": "Start logging your emotional state or record voice/facial check-ins.",
            "coping_tip": "Check out the Emotion Analysis page to log your first entry.",
            "affirmation": "Tracking your emotional state regularly is a great habit to build.",
            "dominant_emotion": "neutral",
            "valence_pct": 0.0,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    latest = _build_latest_data(current_user.id, db)
    summary = latest["emotion_summary"]

    # Build distribution from recent records
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    emotion_recs = (db.query(EmotionRecord)
                    .filter(EmotionRecord.user_id == current_user.id,
                            EmotionRecord.timestamp >= cutoff)
                    .all())
    dist: Dict[str, float] = {}
    for r in emotion_recs:
        dist[r.dominant_emotion] = dist.get(r.dominant_emotion, 0) + 1
    total = len(emotion_recs) or 1
    dist = {k: v / total for k, v in dist.items()}

    positive = {"happy", "calm", "content", "neutral"}
    valence  = sum(v for k, v in dist.items() if k in positive) * 100

    try:
        insight = generate_emotion_insight(
            dominant_emotion     = summary["dominant_emotion"],
            emotion_distribution = dist,
            valence              = valence,
        )
    except Exception:
        insight = {
            "interpretation": "Your emotional data shows a mix of states.",
            "underlying_cause": "Stress and workload are common drivers.",
            "coping_tip": "Try 5 deep breaths: inhale 4s, hold 4s, exhale 6s.",
            "affirmation": "Your awareness of your emotions is a strength.",
        }

    return {**insight, "dominant_emotion": summary["dominant_emotion"],
            "valence_pct": round(valence, 1),
            "generated_at": datetime.now(timezone.utc).isoformat()}


@router.get("/sleep-insight")
def get_sleep_insight(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GPT analysis of the user's sleep patterns."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    records = (db.query(SleepRecord)
               .filter(SleepRecord.user_id == current_user.id, SleepRecord.date >= cutoff)
               .all())

    if not records:
        return {"assessment": "No sleep data yet.", "biggest_issue": "Start logging your sleep.",
                "tonight_tip": "Go to bed at a consistent time.", "long_term_tip": "Log sleep for 7 days to get personalised insights."}

    avg_dur  = sum(r.duration_hours for r in records) / len(records)
    avg_qual = sum(r.quality_score  for r in records) / len(records)
    avg_cons = sum(r.consistency_score for r in records) / len(records)
    good_pct = sum(1 for r in records if r.duration_hours >= 7 and r.quality_score >= 70) / len(records) * 100

    try:
        insight = generate_sleep_insight(avg_dur, avg_qual, avg_cons, good_pct)
    except Exception:
        insight = {
            "assessment": f"Your average sleep is {avg_dur:.1f}h with {avg_qual:.0f}/100 quality.",
            "biggest_issue": "Consistency needs improvement.",
            "tonight_tip": "Set a fixed bedtime alarm for tonight.",
            "long_term_tip": "Aim for lights-out at the same time every night for 2 weeks.",
        }

    return {**insight, "avg_duration": round(avg_dur, 1), "avg_quality": round(avg_qual, 1),
            "good_nights_pct": round(good_pct, 1),
            "generated_at": datetime.now(timezone.utc).isoformat()}
