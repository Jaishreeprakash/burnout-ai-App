import json
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.tracking import (
    ActivityRecord,
    EmotionRecord,
    PhoneUsageRecord,
    SleepRecord,
    TypingBehaviorRecord,
)
from schemas.tracking import (
    ActivityRecordCreate,
    ActivityRecordResponse,
    EmotionRecordCreate,
    EmotionRecordResponse,
    PhoneUsageCreate,
    PhoneUsageResponse,
    SleepRecordCreate,
    SleepRecordResponse,
    TypingBehaviorCreate,
    TypingBehaviorResponse,
)
from utils.auth_utils import get_current_user

router = APIRouter(prefix="/tracking", tags=["Tracking"])


def _cutoff_30_days() -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=30)


# ============================================================
# SLEEP
# ============================================================

@router.post("/sleep", response_model=SleepRecordResponse, status_code=status.HTTP_201_CREATED)
def log_sleep(
    data: SleepRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a sleep record for the current user."""
    record = SleepRecord(
        user_id=current_user.id,
        date=data.date,
        duration_hours=data.duration_hours,
        quality_score=data.quality_score,
        consistency_score=data.consistency_score,
        bedtime=data.bedtime,
        wake_time=data.wake_time,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/sleep", response_model=List[SleepRecordResponse])
def get_sleep_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get sleep records for the last 30 days."""
    cutoff = _cutoff_30_days()
    records = (
        db.query(SleepRecord)
        .filter(SleepRecord.user_id == current_user.id, SleepRecord.date >= cutoff)
        .order_by(SleepRecord.date.desc())
        .all()
    )
    return records


# ============================================================
# PHONE USAGE
# ============================================================

@router.post("/phone-usage", response_model=PhoneUsageResponse, status_code=status.HTTP_201_CREATED)
def log_phone_usage(
    data: PhoneUsageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a phone usage record for the current user."""
    app_usage_str = json.dumps(data.app_usage_data) if data.app_usage_data else None
    record = PhoneUsageRecord(
        user_id=current_user.id,
        date=data.date,
        screen_time_hours=data.screen_time_hours,
        app_usage_data=app_usage_str,
        late_night_usage=data.late_night_usage,
        pickups_count=data.pickups_count,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _parse_phone_record(record)


@router.get("/phone-usage", response_model=List[PhoneUsageResponse])
def get_phone_usage_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get phone usage records for the last 30 days."""
    cutoff = _cutoff_30_days()
    records = (
        db.query(PhoneUsageRecord)
        .filter(PhoneUsageRecord.user_id == current_user.id, PhoneUsageRecord.date >= cutoff)
        .order_by(PhoneUsageRecord.date.desc())
        .all()
    )
    return [_parse_phone_record(r) for r in records]


def _parse_phone_record(record: PhoneUsageRecord) -> PhoneUsageResponse:
    app_data = None
    if record.app_usage_data:
        try:
            app_data = json.loads(record.app_usage_data)
        except (json.JSONDecodeError, TypeError):
            app_data = None
    return PhoneUsageResponse(
        id=record.id,
        user_id=record.user_id,
        date=record.date,
        screen_time_hours=record.screen_time_hours,
        app_usage_data=app_data,
        late_night_usage=record.late_night_usage,
        pickups_count=record.pickups_count,
        created_at=record.created_at,
    )


# ============================================================
# TYPING BEHAVIOR
# ============================================================

@router.post("/typing", response_model=TypingBehaviorResponse, status_code=status.HTTP_201_CREATED)
def log_typing(
    data: TypingBehaviorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log a typing behavior record for the current user."""
    record = TypingBehaviorRecord(
        user_id=current_user.id,
        date=data.date,
        avg_speed_wpm=data.avg_speed_wpm,
        accuracy_percent=data.accuracy_percent,
        pause_frequency=data.pause_frequency,
        session_duration_minutes=data.session_duration_minutes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/typing", response_model=List[TypingBehaviorResponse])
def get_typing_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get typing behavior records for the last 30 days."""
    cutoff = _cutoff_30_days()
    records = (
        db.query(TypingBehaviorRecord)
        .filter(TypingBehaviorRecord.user_id == current_user.id, TypingBehaviorRecord.date >= cutoff)
        .order_by(TypingBehaviorRecord.date.desc())
        .all()
    )
    return records


# ============================================================
# EMOTION
# ============================================================

@router.post("/emotion", response_model=EmotionRecordResponse, status_code=status.HTTP_201_CREATED)
def log_emotion(
    data: EmotionRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emotion_type = data.emotion_type or "facial"
    timestamp = data.timestamp or datetime.now(timezone.utc)
    if emotion_type not in ("facial", "voice", "manual"):
        emotion_type = "facial"

    emotion_scores_str = json.dumps(data.emotion_scores) if data.emotion_scores else None
    record = EmotionRecord(
        user_id=current_user.id,
        timestamp=timestamp,
        emotion_type=emotion_type,
        dominant_emotion=data.dominant_emotion,
        confidence=data.confidence,
        emotion_scores=emotion_scores_str,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _parse_emotion_record(record)


@router.get("/emotion", response_model=List[EmotionRecordResponse])
def get_emotion_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get emotion records for the last 30 days."""
    cutoff = _cutoff_30_days()
    records = (
        db.query(EmotionRecord)
        .filter(EmotionRecord.user_id == current_user.id, EmotionRecord.timestamp >= cutoff)
        .order_by(EmotionRecord.timestamp.desc())
        .all()
    )
    return [_parse_emotion_record(r) for r in records]


def _parse_emotion_record(record: EmotionRecord) -> EmotionRecordResponse:
    scores = None
    if record.emotion_scores:
        try:
            scores = json.loads(record.emotion_scores)
        except (json.JSONDecodeError, TypeError):
            scores = None
    return EmotionRecordResponse(
        id=record.id,
        user_id=record.user_id,
        timestamp=record.timestamp,
        emotion_type=record.emotion_type,
        dominant_emotion=record.dominant_emotion,
        confidence=record.confidence,
        emotion_scores=scores,
        created_at=record.created_at,
    )


# ============================================================
# ACTIVITY
# ============================================================

@router.post("/activity", response_model=ActivityRecordResponse, status_code=status.HTTP_201_CREATED)
def log_activity(
    data: ActivityRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Log an activity record for the current user."""
    focus_score = data.focus_score
    if focus_score <= 0.0 or focus_score == 50.0:
        total_hours = data.study_hours + data.work_hours
        if total_hours > 0:
            breaks_per_hour = data.break_count / total_hours
            if 0.5 <= breaks_per_hour <= 1.2:
                break_multiplier = 1.0
            elif breaks_per_hour < 0.5:
                break_multiplier = 0.5 + (breaks_per_hour / 0.5) * 0.5
            else:
                break_multiplier = 1.0 - min((breaks_per_hour - 1.2) * 0.5, 0.5)
            
            if total_hours > 10:
                fatigue_factor = 0.6
            elif total_hours > 8:
                fatigue_factor = 0.8
            else:
                fatigue_factor = 1.0
                
            base_focus = 85.0 * break_multiplier * fatigue_factor
            
            if data.exercise_minutes >= 30:
                exercise_boost = 15.0
            elif data.exercise_minutes >= 15:
                exercise_boost = 10.0
            else:
                exercise_boost = 5.0
                
            focus_score = round(min(100.0, base_focus + exercise_boost), 2)
        else:
            focus_score = 50.0

    record = ActivityRecord(
        user_id=current_user.id,
        date=data.date,
        study_hours=data.study_hours,
        work_hours=data.work_hours,
        exercise_minutes=data.exercise_minutes,
        break_count=data.break_count,
        focus_score=focus_score,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/activity", response_model=List[ActivityRecordResponse])
def get_activity_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get activity records for the last 30 days."""
    cutoff = _cutoff_30_days()
    records = (
        db.query(ActivityRecord)
        .filter(ActivityRecord.user_id == current_user.id, ActivityRecord.date >= cutoff)
        .order_by(ActivityRecord.date.desc())
        .all()
    )
    return records
