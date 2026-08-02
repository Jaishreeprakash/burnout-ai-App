from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    burnout_records = relationship("BurnoutRecord", back_populates="user", cascade="all, delete-orphan")
    sleep_records = relationship("SleepRecord", back_populates="user", cascade="all, delete-orphan")
    phone_usage_records = relationship("PhoneUsageRecord", back_populates="user", cascade="all, delete-orphan")
    typing_behavior_records = relationship("TypingBehaviorRecord", back_populates="user", cascade="all, delete-orphan")
    emotion_records = relationship("EmotionRecord", back_populates="user", cascade="all, delete-orphan")
    activity_records = relationship("ActivityRecord", back_populates="user", cascade="all, delete-orphan")
    wellness_scores = relationship("WellnessScore", back_populates="user", cascade="all, delete-orphan")
