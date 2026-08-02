from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

from .validators import reject_nul_bytes


# ---- Sleep Schemas ----

class SleepRecordCreate(BaseModel):
    date: datetime
    duration_hours: float
    quality_score: float        # 0-100
    consistency_score: float = 70.0
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None

    _no_nul = field_validator("bedtime", "wake_time", mode="before")(reject_nul_bytes)


class SleepRecordResponse(BaseModel):
    id: int
    user_id: int
    date: datetime
    duration_hours: float
    quality_score: float
    consistency_score: float
    bedtime: Optional[str] = None
    wake_time: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Phone Usage Schemas ----

class PhoneUsageCreate(BaseModel):
    date: datetime
    screen_time_hours: float
    app_usage_data: Optional[Dict[str, Any]] = None
    late_night_usage: bool = False
    pickups_count: Optional[int] = Field(default=None, ge=0, le=10000)


class PhoneUsageResponse(BaseModel):
    id: int
    user_id: int
    date: datetime
    screen_time_hours: float
    app_usage_data: Optional[Dict[str, Any]] = None
    late_night_usage: bool
    pickups_count: Optional[int] = None
    created_at: datetime

    @field_validator("app_usage_data", mode="before")
    @classmethod
    def parse_json(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v

    class Config:
        from_attributes = True


# ---- Typing Behavior Schemas ----

class TypingBehaviorCreate(BaseModel):
    date: datetime
    avg_speed_wpm: float
    accuracy_percent: float
    pause_frequency: float
    session_duration_minutes: float


class TypingBehaviorResponse(BaseModel):
    id: int
    user_id: int
    date: datetime
    avg_speed_wpm: float
    accuracy_percent: float
    pause_frequency: float
    session_duration_minutes: float
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Emotion Record Schemas ----

class EmotionRecordCreate(BaseModel):
    timestamp: Optional[datetime] = None
    emotion_type: Optional[str] = "facial"
    dominant_emotion: str
    confidence: float = 1.0
    emotion_scores: Optional[Dict[str, float]] = None

    _no_nul = field_validator("emotion_type", "dominant_emotion", mode="before")(reject_nul_bytes)


class EmotionRecordResponse(BaseModel):
    id: int
    user_id: int
    timestamp: datetime
    emotion_type: str
    dominant_emotion: str
    confidence: float
    emotion_scores: Optional[Dict[str, float]] = None
    created_at: datetime

    @field_validator("emotion_scores", mode="before")
    @classmethod
    def parse_json(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v

    class Config:
        from_attributes = True


# ---- Activity Record Schemas ----

class ActivityRecordCreate(BaseModel):
    date: datetime
    study_hours: float = 0.0
    work_hours: float = 0.0
    exercise_minutes: float = 0.0
    break_count: int = Field(default=0, ge=0, le=1000)
    focus_score: float = 50.0   # 0-100


class ActivityRecordResponse(BaseModel):
    id: int
    user_id: int
    date: datetime
    study_hours: float
    work_hours: float
    exercise_minutes: float
    break_count: int
    focus_score: float
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Wellness Score Schemas ----

class WellnessScoreCreate(BaseModel):
    date: datetime
    overall_score: float        # 0-100
    stress_level: float
    mood_score: float
    productivity_score: float
    notes: Optional[str] = None


class WellnessScoreResponse(BaseModel):
    id: int
    user_id: int
    date: datetime
    overall_score: float
    stress_level: float
    mood_score: float
    productivity_score: float
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Burnout Analysis Schema ----

class ComponentScores(BaseModel):
    sleep_score: float
    phone_overuse_score: float
    typing_distress_score: float
    activity_score: float
    emotion_score: float


class BurnoutAnalysis(BaseModel):
    burnout_score: float
    risk_level: str
    component_scores: ComponentScores
    analysis_date: datetime
    sleep_analysis: Optional[Dict[str, Any]] = None
    phone_analysis: Optional[Dict[str, Any]] = None
    typing_analysis: Optional[Dict[str, Any]] = None
    emotion_analysis: Optional[Dict[str, Any]] = None
    activity_analysis: Optional[Dict[str, Any]] = None
    wellness: Optional[Dict[str, Any]] = None
    trend: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[Dict[str, Any]]] = []
    wellness_score: float = 0.0
    emotional_stability_index: float = 0.0
    sleep_quality_score: float = 0.0
    phone_usage_score: float = 0.0
    activity_score: float = 0.0


# ---- Dashboard Data Schema ----

class TrendPoint(BaseModel):
    date: str
    value: float


class DashboardTrendData(BaseModel):
    dates: List[str]
    burnout_scores: List[float]
    wellness_scores: List[float]
    sleep_scores: List[float]
    emotion_scores: List[float]


class DashboardData(BaseModel):
    burnout_analysis: BurnoutAnalysis
    recent_sleep: Optional[SleepRecordResponse] = None
    recent_phone_usage: Optional[PhoneUsageResponse] = None
    recent_emotion: Optional[EmotionRecordResponse] = None
    recent_activity: Optional[ActivityRecordResponse] = None
    trend_data: DashboardTrendData
