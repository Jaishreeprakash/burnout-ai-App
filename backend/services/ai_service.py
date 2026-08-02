import numpy as np
from typing import Any, Dict, List, Optional


class AIService:
    """
    AI service for burnout detection and wellness analysis.
    Uses weighted, deterministic formulas based on research-backed thresholds.
    """

    # Weight distribution for burnout score components
    WEIGHTS = {
        "sleep": 0.30,
        "phone_overuse": 0.20,
        "typing_distress": 0.20,
        "activity": 0.15,
        "emotion": 0.15,
    }

    # Optimal sleep range (hours)
    OPTIMAL_SLEEP_MIN = 7.0
    OPTIMAL_SLEEP_MAX = 9.0

    # Phone usage thresholds
    SAFE_SCREEN_TIME_HOURS = 4.0
    HIGH_SCREEN_TIME_HOURS = 6.0

    # Typing thresholds
    BASELINE_WPM = 60.0
    HIGH_PAUSE_THRESHOLD = 0.3  # pauses per minute

    # Negative emotions associated with burnout
    NEGATIVE_EMOTIONS = {"sad", "angry", "fearful", "disgusted", "contempt", "stressed", "anxious"}
    POSITIVE_EMOTIONS = {"happy", "surprised", "neutral", "calm", "content"}

    # Risk level thresholds
    RISK_THRESHOLDS = {
        "low": (0, 25),
        "moderate": (25, 50),
        "high": (50, 75),
        "critical": (75, 101),
    }

    def calculate_burnout_score(
        self,
        sleep_data: Optional[Dict[str, Any]] = None,
        phone_data: Optional[Dict[str, Any]] = None,
        typing_data: Optional[Dict[str, Any]] = None,
        activity_data: Optional[Dict[str, Any]] = None,
        emotion_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Calculate composite burnout score (0-100) from multiple data sources.
        Higher score = more burnout risk.
        """
        # Calculate individual component scores (0-100, higher = more burnout)
        sleep_score = self._sleep_to_burnout_component(sleep_data)
        phone_score = self._phone_to_burnout_component(phone_data)
        typing_score = self._typing_to_burnout_component(typing_data)
        activity_score = self._activity_to_burnout_component(activity_data)
        emotion_score = self._emotion_to_burnout_component(emotion_data)

        # Weighted composite
        burnout_score = (
            sleep_score * self.WEIGHTS["sleep"]
            + phone_score * self.WEIGHTS["phone_overuse"]
            + typing_score * self.WEIGHTS["typing_distress"]
            + activity_score * self.WEIGHTS["activity"]
            + emotion_score * self.WEIGHTS["emotion"]
        )

        burnout_score = float(np.clip(burnout_score, 0.0, 100.0))
        risk_level = self._determine_risk_level(burnout_score)

        return {
            "burnout_score": round(burnout_score, 2),
            "risk_level": risk_level,
            "component_scores": {
                "sleep_score": round(sleep_score, 2),
                "phone_overuse_score": round(phone_score, 2),
                "typing_distress_score": round(typing_score, 2),
                "activity_score": round(activity_score, 2),
                "emotion_score": round(emotion_score, 2),
            },
        }

    def _sleep_to_burnout_component(self, sleep_data: Optional[Dict[str, Any]]) -> float:
        """Convert sleep data to burnout contribution (0-100)."""
        if not sleep_data:
            return 50.0  # neutral when no data

        duration = sleep_data.get("duration_hours", 7.5)
        quality = sleep_data.get("quality_score", 70.0)  # 0-100
        consistency = sleep_data.get("consistency_score", 70.0)  # 0-100

        # Duration score: penalty for too little or too much sleep
        if self.OPTIMAL_SLEEP_MIN <= duration <= self.OPTIMAL_SLEEP_MAX:
            duration_penalty = 0.0
        elif duration < self.OPTIMAL_SLEEP_MIN:
            deficit = self.OPTIMAL_SLEEP_MIN - duration
            duration_penalty = min(deficit * 20.0, 80.0)   # up to 80 points penalty
        else:
            excess = duration - self.OPTIMAL_SLEEP_MAX
            duration_penalty = min(excess * 10.0, 30.0)    # up to 30 points penalty

        # Quality converts inversely: low quality = high burnout contribution
        quality_component = (100.0 - quality) * 0.5   # max 50 points

        # Consistency inversely: low consistency = high burnout
        consistency_component = (100.0 - consistency) * 0.3  # max 30 points

        raw = duration_penalty + quality_component + consistency_component
        return float(np.clip(raw, 0.0, 100.0))

    def _phone_to_burnout_component(self, phone_data: Optional[Dict[str, Any]]) -> float:
        """Convert phone usage data to burnout contribution (0-100)."""
        if not phone_data:
            return 30.0  # slightly elevated neutral

        screen_time = phone_data.get("screen_time_hours", 4.0)
        late_night = phone_data.get("late_night_usage", False)
        pickups = phone_data.get("pickups_count", 50)

        # Screen time penalty
        if screen_time <= self.SAFE_SCREEN_TIME_HOURS:
            time_penalty = screen_time * 5.0
        elif screen_time <= self.HIGH_SCREEN_TIME_HOURS:
            time_penalty = 20.0 + (screen_time - self.SAFE_SCREEN_TIME_HOURS) * 15.0
        else:
            time_penalty = 50.0 + (screen_time - self.HIGH_SCREEN_TIME_HOURS) * 10.0

        # Late night usage: 20 point penalty
        late_night_penalty = 20.0 if late_night else 0.0

        # Pickups: high frequency indicates compulsive checking
        if pickups > 100:
            pickups_penalty = 15.0
        elif pickups > 70:
            pickups_penalty = 10.0
        elif pickups > 50:
            pickups_penalty = 5.0
        else:
            pickups_penalty = 0.0

        raw = time_penalty + late_night_penalty + pickups_penalty
        return float(np.clip(raw, 0.0, 100.0))

    def _typing_to_burnout_component(self, typing_data: Optional[Dict[str, Any]]) -> float:
        """Convert typing behavior to burnout contribution (0-100)."""
        if not typing_data:
            return 40.0  # neutral-elevated

        speed_wpm = typing_data.get("avg_speed_wpm", self.BASELINE_WPM)
        accuracy = typing_data.get("accuracy_percent", 95.0)
        pause_freq = typing_data.get("pause_frequency", 0.1)
        duration = typing_data.get("session_duration_minutes", 60.0)

        # Speed drop: significantly slower than baseline suggests cognitive fatigue
        speed_ratio = speed_wpm / self.BASELINE_WPM
        if speed_ratio >= 1.0:
            speed_penalty = 0.0
        elif speed_ratio >= 0.8:
            speed_penalty = (1.0 - speed_ratio) * 100.0
        else:
            speed_penalty = 20.0 + (0.8 - speed_ratio) * 150.0

        # Accuracy drop: errors indicate mental fatigue
        accuracy_penalty = max(0.0, (95.0 - accuracy) * 2.0)  # penalty below 95%

        # High pause frequency indicates cognitive struggle
        pause_penalty = min(pause_freq * 100.0, 40.0)

        # Long unbroken sessions increase fatigue
        session_penalty = min(max(0.0, (duration - 90.0) / 10.0), 15.0)

        raw = speed_penalty * 0.4 + accuracy_penalty * 0.3 + pause_penalty * 0.2 + session_penalty * 0.1
        return float(np.clip(raw, 0.0, 100.0))

    def _activity_to_burnout_component(self, activity_data: Optional[Dict[str, Any]]) -> float:
        """Convert activity data to burnout contribution (0-100)."""
        if not activity_data:
            return 50.0

        study_hours = activity_data.get("study_hours", 0.0)
        work_hours = activity_data.get("work_hours", 0.0)
        exercise_min = activity_data.get("exercise_minutes", 0.0)
        break_count = activity_data.get("break_count", 0)
        focus_score = activity_data.get("focus_score", 50.0)

        total_productive_hours = study_hours + work_hours

        # Overwork penalty
        if total_productive_hours > 10:
            overwork_penalty = min((total_productive_hours - 10.0) * 10.0, 40.0)
        elif total_productive_hours > 8:
            overwork_penalty = (total_productive_hours - 8.0) * 5.0
        else:
            overwork_penalty = 0.0

        # Lack of exercise penalty
        if exercise_min >= 30:
            exercise_penalty = 0.0
        elif exercise_min >= 15:
            exercise_penalty = 10.0
        else:
            exercise_penalty = 25.0

        # Insufficient breaks penalty
        if break_count >= 5:
            break_penalty = 0.0
        elif break_count >= 2:
            break_penalty = 10.0
        else:
            break_penalty = 20.0

        # Low focus score indicates burnout
        focus_penalty = (100.0 - focus_score) * 0.3

        raw = overwork_penalty + exercise_penalty + break_penalty + focus_penalty
        return float(np.clip(raw, 0.0, 100.0))

    def _emotion_to_burnout_component(self, emotion_data: Optional[Dict[str, Any]]) -> float:
        """Convert emotion analysis to burnout contribution (0-100)."""
        if not emotion_data:
            return 40.0

        stability_score = emotion_data.get("stability_score", 60.0)  # 0-100
        negative_ratio = emotion_data.get("negative_ratio", 0.3)     # 0.0-1.0
        dominant = emotion_data.get("dominant_emotion", "neutral").lower()

        # Instability contributes to burnout
        instability_penalty = (100.0 - stability_score) * 0.4

        # High negative emotion ratio
        negative_penalty = negative_ratio * 60.0

        # Extra penalty for highly distressing dominant emotions
        dominant_penalty = 0.0
        if dominant in {"angry", "fearful", "stressed", "anxious"}:
            dominant_penalty = 15.0
        elif dominant in {"sad", "disgusted", "contempt"}:
            dominant_penalty = 10.0

        raw = instability_penalty + negative_penalty + dominant_penalty
        return float(np.clip(raw, 0.0, 100.0))

    def _determine_risk_level(self, score: float) -> str:
        for level, (low, high) in self.RISK_THRESHOLDS.items():
            if low <= score < high:
                return level
        return "critical"

    # -----------------------------------------------------------------------
    def analyze_sleep(
        self,
        duration: float,
        quality: float,
        consistency: float,
        bedtime: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Detailed sleep analysis returning score and flags."""
        flags = []

        if duration < self.OPTIMAL_SLEEP_MIN:
            flags.append(f"Sleep duration {duration:.1f}h is below recommended minimum of {self.OPTIMAL_SLEEP_MIN}h")
        elif duration > self.OPTIMAL_SLEEP_MAX:
            flags.append(f"Sleep duration {duration:.1f}h exceeds recommended maximum of {self.OPTIMAL_SLEEP_MAX}h")

        if quality < 50:
            flags.append("Sleep quality is poor — consider sleep hygiene improvements")
        elif quality < 70:
            flags.append("Sleep quality is below average")

        if consistency < 50:
            flags.append("Highly inconsistent sleep schedule detected")
        elif consistency < 70:
            flags.append("Sleep schedule could be more consistent")

        # Bedtime penalty: sleeping after midnight is detrimental
        late_bedtime = False
        if bedtime:
            try:
                hour = int(bedtime.split(":")[0])
                if hour >= 0 and hour <= 5:
                    late_bedtime = True
                    flags.append(f"Late bedtime ({bedtime}) disrupts circadian rhythm")
            except (ValueError, IndexError):
                pass

        sleep_score = 100.0 - self._sleep_to_burnout_component(
            {"duration_hours": duration, "quality_score": quality, "consistency_score": consistency}
        )
        sleep_score = float(np.clip(sleep_score, 0.0, 100.0))

        return {
            "sleep_score": round(sleep_score, 2),
            "duration_hours": duration,
            "quality_score": quality,
            "consistency_score": consistency,
            "late_bedtime": late_bedtime,
            "flags": flags,
            "recommendation": "Aim for 7-9 hours of consistent sleep each night" if flags else "Sleep patterns look healthy",
        }

    def analyze_phone_usage(
        self,
        screen_time: float,
        late_night: bool,
        pickups: int,
    ) -> Dict[str, Any]:
        """Phone usage risk analysis."""
        flags = []

        if screen_time > self.HIGH_SCREEN_TIME_HOURS:
            flags.append(f"Screen time {screen_time:.1f}h is very high — significantly above 6h threshold")
        elif screen_time > self.SAFE_SCREEN_TIME_HOURS:
            flags.append(f"Screen time {screen_time:.1f}h is moderately elevated")

        if late_night:
            flags.append("Late night phone usage detected — disrupts melatonin and sleep quality")

        if pickups > 100:
            flags.append(f"Very high pickup count ({pickups}) suggests compulsive checking behavior")
        elif pickups > 70:
            flags.append(f"Elevated pickup count ({pickups}) indicates frequent distraction")

        risk_score = self._phone_to_burnout_component(
            {"screen_time_hours": screen_time, "late_night_usage": late_night, "pickups_count": pickups}
        )

        risk_label = "low"
        if risk_score > 60:
            risk_label = "high"
        elif risk_score > 35:
            risk_label = "moderate"

        return {
            "risk_score": round(risk_score, 2),
            "risk_label": risk_label,
            "screen_time_hours": screen_time,
            "late_night_usage": late_night,
            "pickups_count": pickups,
            "flags": flags,
            "recommendation": "Try a 1-hour digital detox before bed" if flags else "Phone usage is within healthy limits",
        }

    def analyze_typing(
        self,
        speed: float,
        accuracy: float,
        pauses: float,
        duration: float,
    ) -> Dict[str, Any]:
        """Typing stress indicators analysis."""
        flags = []
        indicators = []

        speed_ratio = speed / self.BASELINE_WPM
        if speed_ratio < 0.7:
            flags.append(f"Typing speed ({speed:.0f} WPM) is significantly below baseline — possible cognitive fatigue")
            indicators.append("severe_speed_drop")
        elif speed_ratio < 0.85:
            flags.append(f"Typing speed ({speed:.0f} WPM) is below normal baseline")
            indicators.append("mild_speed_drop")

        if accuracy < 85:
            flags.append(f"Accuracy ({accuracy:.1f}%) is quite low — possible mental fatigue or stress")
            indicators.append("low_accuracy")
        elif accuracy < 92:
            flags.append(f"Accuracy ({accuracy:.1f}%) is slightly below average")

        if pauses > self.HIGH_PAUSE_THRESHOLD:
            flags.append(f"High pause frequency ({pauses:.2f}/min) indicates cognitive hesitation")
            indicators.append("high_pauses")

        if duration > 120:
            flags.append(f"Very long uninterrupted session ({duration:.0f} min) without breaks")
            indicators.append("long_session")

        distress_score = self._typing_to_burnout_component(
            {
                "avg_speed_wpm": speed,
                "accuracy_percent": accuracy,
                "pause_frequency": pauses,
                "session_duration_minutes": duration,
            }
        )

        return {
            "distress_score": round(distress_score, 2),
            "avg_speed_wpm": speed,
            "accuracy_percent": accuracy,
            "pause_frequency": pauses,
            "session_duration_minutes": duration,
            "stress_indicators": indicators,
            "flags": flags,
            "recommendation": "Take a break and practice a 5-minute breathing exercise" if flags else "Typing patterns appear normal",
        }

    def analyze_emotions(self, emotion_records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate emotion records into summary with stability score."""
        if not emotion_records:
            return {
                "dominant_emotion": "neutral",
                "negative_ratio": 0.0,
                "stability_score": 70.0,
                "emotion_distribution": {},
                "record_count": 0,
                "flags": [],
            }

        emotion_counts: Dict[str, float] = {}
        for record in emotion_records:
            emotion = record.get("dominant_emotion", "neutral").lower()
            confidence = record.get("confidence", 1.0)
            emotion_counts[emotion] = emotion_counts.get(emotion, 0.0) + confidence

        total_weight = sum(emotion_counts.values()) or 1.0
        emotion_distribution = {e: round(w / total_weight, 3) for e, w in emotion_counts.items()}

        dominant_emotion = max(emotion_counts, key=emotion_counts.get)

        negative_weight = sum(
            w for e, w in emotion_counts.items() if e in self.NEGATIVE_EMOTIONS
        )
        negative_ratio = negative_weight / total_weight

        # Stability: measure how concentrated the distribution is
        # High concentration = stable; high spread = unstable
        n_unique = len(emotion_counts)
        if n_unique <= 1:
            stability_score = 90.0
        else:
            # Shannon entropy-based instability
            probs = np.array(list(emotion_distribution.values()))
            entropy = -np.sum(probs * np.log(probs + 1e-9))
            max_entropy = np.log(n_unique)
            normalized_entropy = entropy / (max_entropy + 1e-9)
            stability_score = float(np.clip((1.0 - normalized_entropy) * 100.0, 0.0, 100.0))

        flags = []
        if negative_ratio > 0.6:
            flags.append("Predominantly negative emotional state detected")
        elif negative_ratio > 0.4:
            flags.append("Elevated negative emotions — monitor closely")

        if stability_score < 40:
            flags.append("High emotional volatility — significant mood swings detected")

        return {
            "dominant_emotion": dominant_emotion,
            "negative_ratio": round(negative_ratio, 3),
            "stability_score": round(stability_score, 2),
            "emotion_distribution": emotion_distribution,
            "record_count": len(emotion_records),
            "flags": flags,
        }

    def calculate_wellness_score(
        self,
        burnout_score: float,
        sleep_score: float,
        activity_score: float,
        emotion_score: float,
    ) -> Dict[str, Any]:
        """
        Calculate overall wellness from component scores.
        Wellness is the inverse of burnout, blended with positive indicators.
        """
        # Convert burnout-style scores (lower = healthier) to wellness contributions
        # sleep_score and activity_score here are "burnout components" (higher = worse)
        # emotion_score is also a burnout component

        wellness_from_burnout = 100.0 - burnout_score
        wellness_from_sleep = 100.0 - sleep_score
        wellness_from_activity = 100.0 - activity_score
        wellness_from_emotion = 100.0 - emotion_score

        overall_score = (
            wellness_from_burnout * 0.40
            + wellness_from_sleep * 0.25
            + wellness_from_activity * 0.20
            + wellness_from_emotion * 0.15
        )
        overall_score = float(np.clip(overall_score, 0.0, 100.0))

        # Derived sub-scores
        stress_level = float(np.clip(burnout_score * 0.8 + (100.0 - wellness_from_emotion) * 0.2, 0.0, 100.0))
        mood_score = float(np.clip(wellness_from_emotion * 0.6 + wellness_from_burnout * 0.4, 0.0, 100.0))
        productivity_score = float(np.clip(wellness_from_activity * 0.5 + wellness_from_sleep * 0.3 + wellness_from_burnout * 0.2, 0.0, 100.0))

        return {
            "overall_score": round(overall_score, 2),
            "stress_level": round(stress_level, 2),
            "mood_score": round(mood_score, 2),
            "productivity_score": round(productivity_score, 2),
        }

    def predict_trend(self, historical_scores: List[float]) -> Dict[str, Any]:
        """
        Simple linear regression trend prediction.
        Returns direction and next-week predicted score.
        """
        if not historical_scores:
            return {
                "trend_direction": "stable",
                "predicted_next_week": 50.0,
                "slope": 0.0,
                "confidence": 0.0,
                "data_points": 0,
            }

        n = len(historical_scores)
        if n == 1:
            return {
                "trend_direction": "stable",
                "predicted_next_week": round(historical_scores[0], 2),
                "slope": 0.0,
                "confidence": 0.0,
                "data_points": 1,
            }

        x = np.arange(n, dtype=float)
        y = np.array(historical_scores, dtype=float)

        # Linear regression via numpy
        x_mean = x.mean()
        y_mean = y.mean()
        numerator = np.sum((x - x_mean) * (y - y_mean))
        denominator = np.sum((x - x_mean) ** 2)
        slope = numerator / (denominator + 1e-9)

        intercept = y_mean - slope * x_mean
        predicted_next = float(intercept + slope * (n + 6))  # next week = 7 days ahead
        predicted_next = float(np.clip(predicted_next, 0.0, 100.0))

        # R² confidence
        y_pred = intercept + slope * x
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - y_mean) ** 2)
        r_squared = 1.0 - (ss_res / (ss_tot + 1e-9)) if ss_tot > 0 else 0.0
        r_squared = float(np.clip(r_squared, 0.0, 1.0))

        # Determine direction: slope per day, threshold ±0.5 points/day
        if slope > 0.5:
            direction = "worsening"
        elif slope < -0.5:
            direction = "improving"
        else:
            direction = "stable"

        return {
            "trend_direction": direction,
            "predicted_next_week": round(predicted_next, 2),
            "slope": round(float(slope), 4),
            "confidence": round(r_squared, 3),
            "data_points": n,
        }
