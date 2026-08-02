import json
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.tracking import (
    ActivityRecord,
    BurnoutRecord,
    EmotionRecord,
    PhoneUsageRecord,
    SleepRecord,
    TypingBehaviorRecord,
)
from schemas.tracking import BurnoutAnalysis, ComponentScores
from services.ai_service import AIService
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/burnout", tags=["Burnout"])
ai_service = AIService()


def _get_latest_sleep(user_id: int, db: Session):
    return (
        db.query(SleepRecord)
        .filter(SleepRecord.user_id == user_id)
        .order_by(SleepRecord.date.desc())
        .first()
    )


def _get_latest_phone(user_id: int, db: Session):
    return (
        db.query(PhoneUsageRecord)
        .filter(PhoneUsageRecord.user_id == user_id)
        .order_by(PhoneUsageRecord.date.desc())
        .first()
    )


def _get_latest_typing(user_id: int, db: Session):
    return (
        db.query(TypingBehaviorRecord)
        .filter(TypingBehaviorRecord.user_id == user_id)
        .order_by(TypingBehaviorRecord.date.desc())
        .first()
    )


def _get_latest_activity(user_id: int, db: Session):
    return (
        db.query(ActivityRecord)
        .filter(ActivityRecord.user_id == user_id)
        .order_by(ActivityRecord.date.desc())
        .first()
    )


def _get_recent_emotions(user_id: int, db: Session, days: int = 3) -> List[EmotionRecord]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    return (
        db.query(EmotionRecord)
        .filter(EmotionRecord.user_id == user_id, EmotionRecord.timestamp >= cutoff)
        .order_by(EmotionRecord.timestamp.desc())
        .limit(20)
        .all()
    )


def _has_records(user_id: int, db: Session) -> bool:
    return (
        db.query(SleepRecord).filter(SleepRecord.user_id == user_id).first() is not None or
        db.query(PhoneUsageRecord).filter(PhoneUsageRecord.user_id == user_id).first() is not None or
        db.query(EmotionRecord).filter(EmotionRecord.user_id == user_id).first() is not None or
        db.query(ActivityRecord).filter(ActivityRecord.user_id == user_id).first() is not None or
        db.query(TypingBehaviorRecord).filter(TypingBehaviorRecord.user_id == user_id).first() is not None
    )


def _build_analysis(user_id: int, db: Session) -> BurnoutAnalysis:
    sleep_rec = _get_latest_sleep(user_id, db)
    phone_rec = _get_latest_phone(user_id, db)
    typing_rec = _get_latest_typing(user_id, db)
    activity_rec = _get_latest_activity(user_id, db)
    emotion_recs = _get_recent_emotions(user_id, db)

    # Build dicts for AI service
    sleep_data = None
    if sleep_rec:
        sleep_data = {
            "duration_hours": sleep_rec.duration_hours,
            "quality_score": sleep_rec.quality_score,
            "consistency_score": sleep_rec.consistency_score,
            "bedtime": sleep_rec.bedtime,
        }

    phone_data = None
    if phone_rec:
        phone_data = {
            "screen_time_hours": phone_rec.screen_time_hours,
            "late_night_usage": phone_rec.late_night_usage,
            "pickups_count": phone_rec.pickups_count or 50,
        }

    typing_data = None
    if typing_rec:
        typing_data = {
            "avg_speed_wpm": typing_rec.avg_speed_wpm,
            "accuracy_percent": typing_rec.accuracy_percent,
            "pause_frequency": typing_rec.pause_frequency,
            "session_duration_minutes": typing_rec.session_duration_minutes,
        }

    activity_data = None
    if activity_rec:
        activity_data = {
            "study_hours": activity_rec.study_hours,
            "work_hours": activity_rec.work_hours,
            "exercise_minutes": activity_rec.exercise_minutes,
            "break_count": activity_rec.break_count,
            "focus_score": activity_rec.focus_score,
        }

    emotion_list = []
    for er in emotion_recs:
        emotion_list.append({
            "dominant_emotion": er.dominant_emotion,
            "confidence": er.confidence,
        })

    emotion_summary = ai_service.analyze_emotions(emotion_list)

    emotion_data = {
        "stability_score": emotion_summary["stability_score"],
        "negative_ratio": emotion_summary["negative_ratio"],
        "dominant_emotion": emotion_summary["dominant_emotion"],
    }

    result = ai_service.calculate_burnout_score(
        sleep_data=sleep_data,
        phone_data=phone_data,
        typing_data=typing_data,
        activity_data=activity_data,
        emotion_data=emotion_data,
    )

    comp = result["component_scores"]

    # Detailed sub-analyses
    sleep_analysis = None
    if sleep_data:
        sleep_analysis = ai_service.analyze_sleep(
            sleep_data["duration_hours"],
            sleep_data["quality_score"],
            sleep_data["consistency_score"],
            sleep_data.get("bedtime"),
        )

    phone_analysis = None
    if phone_data:
        phone_analysis = ai_service.analyze_phone_usage(
            phone_data["screen_time_hours"],
            phone_data["late_night_usage"],
            phone_data.get("pickups_count", 50),
        )

    typing_analysis = None
    if typing_data:
        typing_analysis = ai_service.analyze_typing(
            typing_data["avg_speed_wpm"],
            typing_data["accuracy_percent"],
            typing_data["pause_frequency"],
            typing_data["session_duration_minutes"],
        )

    activity_analysis = None
    if activity_data:
        activity_analysis = {
            "study_hours": activity_data["study_hours"],
            "work_hours": activity_data["work_hours"],
            "exercise_minutes": activity_data["exercise_minutes"],
            "break_count": activity_data["break_count"],
            "focus_score": activity_data["focus_score"],
            "activity_burnout_score": comp["activity_score"],
        }

    wellness = ai_service.calculate_wellness_score(
        result["burnout_score"],
        comp["sleep_score"],
        comp["activity_score"],
        comp["emotion_score"],
    )

    return BurnoutAnalysis(
        burnout_score=result["burnout_score"],
        risk_level=result["risk_level"],
        component_scores=ComponentScores(**comp),
        analysis_date=datetime.now(timezone.utc),
        sleep_analysis=sleep_analysis,
        phone_analysis=phone_analysis,
        typing_analysis=typing_analysis,
        emotion_analysis=emotion_summary,
        activity_analysis=activity_analysis,
        wellness=wellness,
        wellness_score=wellness.get("overall_score", 0.0) if wellness else 0.0,
        emotional_stability_index=emotion_data.get("stability_score", 0.0) if emotion_data else 0.0,
        sleep_quality_score=comp.get("sleep_score", 0.0),
        phone_usage_score=comp.get("phone_overuse_score", 0.0),
        activity_score=comp.get("activity_score", 0.0),
    )


@router.get("/analysis", response_model=BurnoutAnalysis)
def get_burnout_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full burnout analysis for the current user using their latest data."""
    if not _has_records(current_user.id, db):
        return BurnoutAnalysis(
            burnout_score=0.0,
            risk_level="low",
            component_scores=ComponentScores(
                sleep_score=0.0,
                phone_overuse_score=0.0,
                typing_distress_score=0.0,
                activity_score=0.0,
                emotion_score=0.0,
            ),
            analysis_date=datetime.now(timezone.utc),
            sleep_analysis=None,
            phone_analysis=None,
            typing_analysis=None,
            emotion_analysis=None,
            activity_analysis=None,
            wellness={
                "overall_score": 0.0,
                "stress_level": 0.0,
                "mood_score": 0.0,
                "productivity_score": 0.0,
            },
            recommendations=[],
            wellness_score=0.0,
            emotional_stability_index=0.0,
            sleep_quality_score=0.0,
            phone_usage_score=0.0,
            activity_score=0.0,
        )

    analysis = _build_analysis(current_user.id, db)

    # Persist the burnout record
    record = BurnoutRecord(
        user_id=current_user.id,
        date=analysis.analysis_date,
        burnout_score=analysis.burnout_score,
        risk_level=analysis.risk_level,
    )
    db.add(record)
    db.commit()

    return analysis


@router.get("/history")
def get_burnout_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get burnout score history for the last 30 days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    records = (
        db.query(BurnoutRecord)
        .filter(BurnoutRecord.user_id == current_user.id, BurnoutRecord.date >= cutoff)
        .order_by(BurnoutRecord.date.asc())
        .all()
    )
    return [
        {
            "id": r.id,
            "date": r.date.isoformat(),
            "burnout_score": r.burnout_score,
            "risk_level": r.risk_level,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.post("/assess", response_model=BurnoutAnalysis)
def manual_assess(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually trigger a burnout assessment and save the result."""
    if not _has_records(current_user.id, db):
        return BurnoutAnalysis(
            burnout_score=0.0,
            risk_level="low",
            component_scores=ComponentScores(
                sleep_score=0.0,
                phone_overuse_score=0.0,
                typing_distress_score=0.0,
                activity_score=0.0,
                emotion_score=0.0,
            ),
            analysis_date=datetime.now(timezone.utc),
            sleep_analysis=None,
            phone_analysis=None,
            typing_analysis=None,
            emotion_analysis=None,
            activity_analysis=None,
            wellness={
                "overall_score": 0.0,
                "stress_level": 0.0,
                "mood_score": 0.0,
                "productivity_score": 0.0,
            },
            recommendations=[],
            wellness_score=0.0,
            emotional_stability_index=0.0,
            sleep_quality_score=0.0,
            phone_usage_score=0.0,
            activity_score=0.0,
        )

    analysis = _build_analysis(current_user.id, db)

    record = BurnoutRecord(
        user_id=current_user.id,
        date=analysis.analysis_date,
        burnout_score=analysis.burnout_score,
        risk_level=analysis.risk_level,
    )
    db.add(record)
    db.commit()

    return analysis
