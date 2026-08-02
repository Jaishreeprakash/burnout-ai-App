from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class BurnoutRecord(Base):
    __tablename__ = "burnout_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    burnout_score = Column(Float, nullable=False)  # 0-100
    risk_level = Column(String, nullable=False)    # low/moderate/high/critical
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="burnout_records")


class SleepRecord(Base):
    __tablename__ = "sleep_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    duration_hours = Column(Float, nullable=False)
    quality_score = Column(Float, nullable=False)      # 0-100
    consistency_score = Column(Float, nullable=False)  # 0-100
    bedtime = Column(String, nullable=True)
    wake_time = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="sleep_records")


class PhoneUsageRecord(Base):
    __tablename__ = "phone_usage_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    screen_time_hours = Column(Float, nullable=False)
    app_usage_data = Column(Text, nullable=True)    # JSON string
    late_night_usage = Column(Boolean, default=False)
    pickups_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="phone_usage_records")


class TypingBehaviorRecord(Base):
    __tablename__ = "typing_behavior_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    avg_speed_wpm = Column(Float, nullable=False)
    accuracy_percent = Column(Float, nullable=False)
    pause_frequency = Column(Float, nullable=False)
    session_duration_minutes = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="typing_behavior_records")


class EmotionRecord(Base):
    __tablename__ = "emotion_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False)
    emotion_type = Column(String, nullable=False)      # facial/voice
    dominant_emotion = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    emotion_scores = Column(Text, nullable=True)       # JSON string - dict of emotions
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="emotion_records")


class ActivityRecord(Base):
    __tablename__ = "activity_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    study_hours = Column(Float, nullable=False, default=0.0)
    work_hours = Column(Float, nullable=False, default=0.0)
    exercise_minutes = Column(Float, nullable=False, default=0.0)
    break_count = Column(Integer, nullable=False, default=0)
    focus_score = Column(Float, nullable=False, default=50.0)  # 0-100
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="activity_records")


class WellnessScore(Base):
    __tablename__ = "wellness_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False)
    overall_score = Column(Float, nullable=False)     # 0-100
    stress_level = Column(Float, nullable=False)
    mood_score = Column(Float, nullable=False)
    productivity_score = Column(Float, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="wellness_scores")
