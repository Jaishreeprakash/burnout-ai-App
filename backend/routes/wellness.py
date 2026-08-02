import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
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
    WellnessScore,
)
from schemas.tracking import DashboardData, DashboardTrendData, WellnessScoreResponse
from services.ai_service import AIService
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/wellness", tags=["Wellness"])
ai_service = AIService()


def _safe_avg(values: List[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


@router.get("/score", response_model=WellnessScoreResponse)
def get_wellness_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get or compute the current wellness score for the user."""
    # Try to find today's score first
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    existing = (
        db.query(WellnessScore)
        .filter(WellnessScore.user_id == current_user.id, WellnessScore.date >= today)
        .order_by(WellnessScore.date.desc())
        .first()
    )
    if existing:
        return existing

    # Check if the user has records
    has_records = (
        db.query(SleepRecord).filter(SleepRecord.user_id == current_user.id).first() is not None or
        db.query(PhoneUsageRecord).filter(PhoneUsageRecord.user_id == current_user.id).first() is not None or
        db.query(EmotionRecord).filter(EmotionRecord.user_id == current_user.id).first() is not None or
        db.query(ActivityRecord).filter(ActivityRecord.user_id == current_user.id).first() is not None or
        db.query(TypingBehaviorRecord).filter(TypingBehaviorRecord.user_id == current_user.id).first() is not None
    )

    if not has_records:
        return WellnessScore(
            id=0,
            user_id=current_user.id,
            date=datetime.now(timezone.utc),
            overall_score=0.0,
            stress_level=0.0,
            mood_score=0.0,
            productivity_score=0.0,
            notes="No data available",
            created_at=datetime.now(timezone.utc)
        )

    # Compute from latest data
    latest_burnout = (
        db.query(BurnoutRecord)
        .filter(BurnoutRecord.user_id == current_user.id)
        .order_by(BurnoutRecord.date.desc())
        .first()
    )
    burnout_score = latest_burnout.burnout_score if latest_burnout else 50.0

    latest_sleep = (
        db.query(SleepRecord)
        .filter(SleepRecord.user_id == current_user.id)
        .order_by(SleepRecord.date.desc())
        .first()
    )
    sleep_data = (
        {
            "duration_hours": latest_sleep.duration_hours,
            "quality_score": latest_sleep.quality_score,
            "consistency_score": latest_sleep.consistency_score,
        }
        if latest_sleep
        else None
    )
    sleep_score = ai_service._sleep_to_burnout_component(sleep_data)

    latest_activity = (
        db.query(ActivityRecord)
        .filter(ActivityRecord.user_id == current_user.id)
        .order_by(ActivityRecord.date.desc())
        .first()
    )
    activity_data = (
        {
            "study_hours": latest_activity.study_hours,
            "work_hours": latest_activity.work_hours,
            "exercise_minutes": latest_activity.exercise_minutes,
            "break_count": latest_activity.break_count,
            "focus_score": latest_activity.focus_score,
        }
        if latest_activity
        else None
    )
    activity_score = ai_service._activity_to_burnout_component(activity_data)

    # Emotions last 3 days
    cutoff = datetime.now(timezone.utc) - timedelta(days=3)
    emotion_recs = (
        db.query(EmotionRecord)
        .filter(EmotionRecord.user_id == current_user.id, EmotionRecord.timestamp >= cutoff)
        .order_by(EmotionRecord.timestamp.desc())
        .limit(20)
        .all()
    )
    emotion_list = [{"dominant_emotion": e.dominant_emotion, "confidence": e.confidence} for e in emotion_recs]
    emotion_summary = ai_service.analyze_emotions(emotion_list)
    emotion_score = ai_service._emotion_to_burnout_component(
        {
            "stability_score": emotion_summary["stability_score"],
            "negative_ratio": emotion_summary["negative_ratio"],
            "dominant_emotion": emotion_summary["dominant_emotion"],
        }
    )

    wellness = ai_service.calculate_wellness_score(burnout_score, sleep_score, activity_score, emotion_score)

    ws_record = WellnessScore(
        user_id=current_user.id,
        date=datetime.now(timezone.utc),
        overall_score=wellness["overall_score"],
        stress_level=wellness["stress_level"],
        mood_score=wellness["mood_score"],
        productivity_score=wellness["productivity_score"],
    )
    db.add(ws_record)
    db.commit()
    db.refresh(ws_record)
    return ws_record


@router.get("/dashboard", response_model=DashboardData)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full nested aggregated dashboard data combining all metrics."""
    # Check if user has any records at all
    has_records = (
        db.query(SleepRecord).filter(SleepRecord.user_id == current_user.id).first() is not None or
        db.query(PhoneUsageRecord).filter(PhoneUsageRecord.user_id == current_user.id).first() is not None or
        db.query(EmotionRecord).filter(EmotionRecord.user_id == current_user.id).first() is not None or
        db.query(ActivityRecord).filter(ActivityRecord.user_id == current_user.id).first() is not None or
        db.query(TypingBehaviorRecord).filter(TypingBehaviorRecord.user_id == current_user.id).first() is not None
    )

    from routes.burnout import _build_analysis
    from schemas.tracking import ComponentScores, BurnoutAnalysis

    if not has_records:
        now = datetime.now(timezone.utc)
        dates = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            dates.append(day.strftime("%a"))
            
        trend_data = DashboardTrendData(
            dates=dates,
            burnout_scores=[0.0] * 7,
            wellness_scores=[0.0] * 7,
            sleep_scores=[0.0] * 7,
            emotion_scores=[0.0] * 7,
        )

        zero_analysis = BurnoutAnalysis(
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
        return DashboardData(
            burnout_analysis=zero_analysis,
            recent_sleep=None,
            recent_phone_usage=None,
            recent_emotion=None,
            recent_activity=None,
            trend_data=trend_data,
        )

    # Fetch latest individual records
    recent_sleep = db.query(SleepRecord).filter(SleepRecord.user_id == current_user.id).order_by(SleepRecord.date.desc()).first()
    recent_phone = db.query(PhoneUsageRecord).filter(PhoneUsageRecord.user_id == current_user.id).order_by(PhoneUsageRecord.date.desc()).first()
    recent_emotion = db.query(EmotionRecord).filter(EmotionRecord.user_id == current_user.id).order_by(EmotionRecord.timestamp.desc()).first()
    recent_activity = db.query(ActivityRecord).filter(ActivityRecord.user_id == current_user.id).order_by(ActivityRecord.date.desc()).first()

    # Generate 7-day trend series (ending today)
    dates = []
    burnout_scores = []
    wellness_scores = []
    sleep_scores = []
    emotion_scores = []

    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_str = day.strftime("%a")  # Mon, Tue...
        dates.append(day_str)

        start_of_day = day.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = day.replace(hour=23, minute=59, second=59, microsecond=999999)

        bo_rec = db.query(BurnoutRecord).filter(
            BurnoutRecord.user_id == current_user.id,
            BurnoutRecord.date >= start_of_day,
            BurnoutRecord.date <= end_of_day
        ).order_by(BurnoutRecord.date.desc()).first()
        burnout_scores.append(bo_rec.burnout_score if bo_rec else 0.0)

        wl_rec = db.query(WellnessScore).filter(
            WellnessScore.user_id == current_user.id,
            WellnessScore.date >= start_of_day,
            WellnessScore.date <= end_of_day
        ).order_by(WellnessScore.date.desc()).first()
        wellness_scores.append(wl_rec.overall_score if wl_rec else 0.0)

        sl_rec = db.query(SleepRecord).filter(
            SleepRecord.user_id == current_user.id,
            SleepRecord.date >= start_of_day,
            SleepRecord.date <= end_of_day
        ).order_by(SleepRecord.date.desc()).first()
        sleep_scores.append(sl_rec.duration_hours if sl_rec else 0.0)

        em_rec = db.query(EmotionRecord).filter(
            EmotionRecord.user_id == current_user.id,
            EmotionRecord.timestamp >= start_of_day,
            EmotionRecord.timestamp <= end_of_day
        ).order_by(EmotionRecord.timestamp.desc()).first()
        emotion_scores.append(em_rec.confidence * 100 if em_rec else 0.0)

    trend_data = DashboardTrendData(
        dates=dates,
        burnout_scores=burnout_scores,
        wellness_scores=wellness_scores,
        sleep_scores=sleep_scores,
        emotion_scores=emotion_scores,
    )

    # Build real analysis if they have records
    analysis = _build_analysis(current_user.id, db)

    # Add recommendations list from BurnoutAnalysis
    # (since the BurnoutAnalysis pydantic schema may have optional recommendations field)
    from routes.recommendations import _get_personalized_recommendations
    recs = _get_personalized_recommendations(current_user.id, db)
    analysis.recommendations = recs

    return DashboardData(
        burnout_analysis=analysis,
        recent_sleep=recent_sleep,
        recent_phone_usage=recent_phone,
        recent_emotion=recent_emotion,
        recent_activity=recent_activity,
        trend_data=trend_data,
    )


@router.get("/trends")
def get_trends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get 7-day and 30-day trend data for charts."""
    cutoff_7 = datetime.now(timezone.utc) - timedelta(days=7)
    cutoff_30 = datetime.now(timezone.utc) - timedelta(days=30)

    def _fetch_burnout(cutoff):
        recs = (
            db.query(BurnoutRecord)
            .filter(BurnoutRecord.user_id == current_user.id, BurnoutRecord.date >= cutoff)
            .order_by(BurnoutRecord.date.asc())
            .all()
        )
        return [{"date": r.date.strftime("%Y-%m-%d"), "burnout_score": r.burnout_score, "risk_level": r.risk_level} for r in recs]

    def _fetch_sleep(cutoff):
        recs = (
            db.query(SleepRecord)
            .filter(SleepRecord.user_id == current_user.id, SleepRecord.date >= cutoff)
            .order_by(SleepRecord.date.asc())
            .all()
        )
        return [{"date": r.date.strftime("%Y-%m-%d"), "duration_hours": r.duration_hours, "quality_score": r.quality_score} for r in recs]

    def _fetch_wellness(cutoff):
        recs = (
            db.query(WellnessScore)
            .filter(WellnessScore.user_id == current_user.id, WellnessScore.date >= cutoff)
            .order_by(WellnessScore.date.asc())
            .all()
        )
        return [{"date": r.date.strftime("%Y-%m-%d"), "overall_score": r.overall_score, "stress_level": r.stress_level, "mood_score": r.mood_score} for r in recs]

    def _fetch_activity(cutoff):
        recs = (
            db.query(ActivityRecord)
            .filter(ActivityRecord.user_id == current_user.id, ActivityRecord.date >= cutoff)
            .order_by(ActivityRecord.date.asc())
            .all()
        )
        return [{"date": r.date.strftime("%Y-%m-%d"), "exercise_minutes": r.exercise_minutes, "focus_score": r.focus_score, "work_hours": r.work_hours} for r in recs]

    burnout_7d = _fetch_burnout(cutoff_7)
    burnout_30d = _fetch_burnout(cutoff_30)

    # Trend prediction
    scores_30d = [r["burnout_score"] for r in burnout_30d]
    trend_prediction = ai_service.predict_trend(scores_30d)

    return {
        "seven_day": {
            "burnout": burnout_7d,
            "sleep": _fetch_sleep(cutoff_7),
            "wellness": _fetch_wellness(cutoff_7),
            "activity": _fetch_activity(cutoff_7),
        },
        "thirty_day": {
            "burnout": burnout_30d,
            "sleep": _fetch_sleep(cutoff_30),
            "wellness": _fetch_wellness(cutoff_30),
            "activity": _fetch_activity(cutoff_30),
        },
        "prediction": trend_prediction,
    }
