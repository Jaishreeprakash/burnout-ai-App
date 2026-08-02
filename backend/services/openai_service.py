"""
OpenAI GPT integration — calls the API directly via httpx to avoid
library version compatibility issues (openai package is not used).
"""
import json
from typing import Any, Dict, List, Optional

import httpx
from config import settings

OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }


def _chat(messages: List[Dict[str, str]], temperature: float = 0.7,
          max_tokens: int = 800, json_mode: bool = False) -> str:
    """Call OpenAI chat/completions directly via httpx. Returns the reply text."""
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY not set")

    payload: Dict[str, Any] = {
        "model": settings.OPENAI_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    with httpx.Client(timeout=30.0) as client:
        resp = client.post(OPENAI_URL, headers=_headers(), json=payload)

    if resp.status_code == 429:
        raise RuntimeError(f"OpenAI quota exceeded: {resp.text}")
    if resp.status_code != 200:
        raise RuntimeError(f"OpenAI error {resp.status_code}: {resp.text}")

    return resp.json()["choices"][0]["message"]["content"].strip()


def _json_chat(messages: List[Dict[str, str]], max_tokens: int = 1200) -> Any:
    raw = _chat(messages, temperature=0.5, max_tokens=max_tokens, json_mode=True)
    return json.loads(raw)


# ── 1. PERSONALISED RECOMMENDATIONS ─────────────────────────────────────────

def generate_ai_recommendations(
    burnout_score: float,
    risk_level: str,
    component_scores: Dict[str, float],
    sleep_data: Optional[Dict] = None,
    phone_data: Optional[Dict] = None,
    activity_data: Optional[Dict] = None,
    emotion_data: Optional[Dict] = None,
    username: str = "User",
) -> List[Dict[str, Any]]:
    context = _build_context(burnout_score, risk_level, component_scores,
                             sleep_data, phone_data, activity_data, emotion_data)
    result = _json_chat([
        {"role": "system", "content":
         "You are an expert wellness coach. Analyse user data and give highly personalised, "
         "science-backed recommendations. Always return valid JSON."},
        {"role": "user", "content":
         f"Generate exactly 5 personalised wellness recommendations for {username}.\n\n{context}\n\n"
         "Return JSON: {\"recommendations\": [{\"title\": ..., \"description\": ..., "
         "\"category\": \"sleep|phone|activity|mental|social|nutrition\", "
         "\"priority\": \"high|medium|low\", \"action_steps\": [...], "
         "\"estimated_impact\": ..., \"time_to_implement\": ...}]}"},
    ])
    return result.get("recommendations", [])


# ── 2. BURNOUT NARRATIVE ─────────────────────────────────────────────────────

def generate_burnout_narrative(
    burnout_score: float,
    risk_level: str,
    component_scores: Dict[str, float],
    trend_direction: Optional[str] = None,
    username: str = "User",
) -> Dict[str, str]:
    worst = sorted(component_scores.items(), key=lambda x: x[1], reverse=True)[:2]
    best  = sorted(component_scores.items(), key=lambda x: x[1])[:1]
    return _json_chat([
        {"role": "system", "content":
         "You are a compassionate wellness analyst. Return valid JSON only."},
        {"role": "user", "content":
         f"Write a brief, empathetic burnout analysis for {username}.\n"
         f"Burnout: {burnout_score:.1f}/100 ({risk_level}). Trend: {trend_direction}.\n"
         f"Worst areas: {worst}. Best area: {best}.\n"
         "Return: {\"summary\":...,\"main_cause\":...,\"positive_note\":...,\"urgent_action\":...,\"motivation\":...}"},
    ])


# ── 3. EMOTION INSIGHT ───────────────────────────────────────────────────────

def generate_emotion_insight(
    dominant_emotion: str,
    emotion_distribution: Dict[str, float],
    valence: float,
    recent_context: Optional[str] = None,
) -> Dict[str, str]:
    top = sorted(emotion_distribution.items(), key=lambda x: x[1], reverse=True)[:3]
    return _json_chat([
        {"role": "system", "content":
         "You are an empathetic psychologist. Return valid JSON only."},
        {"role": "user", "content":
         f"Analyse emotional state: dominant={dominant_emotion}, "
         f"top emotions={top}, valence={valence:.0f}%.\n"
         "Return: {\"interpretation\":...,\"underlying_cause\":...,\"coping_tip\":...,\"affirmation\":...}"},
    ])


# ── 4. WELLNESS CHAT ─────────────────────────────────────────────────────────

def wellness_chat(
    user_message: str,
    burnout_score: float,
    risk_level: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    username: str = "User",
) -> str:
    name = username.split()[0] if username else "there"
    system = (
        f"You are BurnoutAI, a personal wellness coach for {name}. "
        f"Their burnout score is {burnout_score:.1f}/100 (risk: {risk_level}). "
        "Be warm, specific, and concise (2-4 sentences). Reference their data when relevant."
    )
    messages = [{"role": "system", "content": system}]
    if conversation_history:
        messages.extend(conversation_history[-8:])
    messages.append({"role": "user", "content": user_message})
    return _chat(messages, temperature=0.75, max_tokens=400)


# ── 5. SLEEP INSIGHT ─────────────────────────────────────────────────────────

def generate_sleep_insight(
    avg_duration: float,
    avg_quality: float,
    consistency_score: float,
    good_nights_pct: float,
) -> Dict[str, str]:
    return _json_chat([
        {"role": "system", "content":
         "You are a sleep science expert. Return valid JSON only."},
        {"role": "user", "content":
         f"Sleep data: avg={avg_duration:.1f}h, quality={avg_quality:.0f}/100, "
         f"consistency={consistency_score:.0f}/100, good nights={good_nights_pct:.0f}%.\n"
         "Return: {\"assessment\":...,\"biggest_issue\":...,\"tonight_tip\":...,\"long_term_tip\":...}"},
    ])


# ── HELPERS ───────────────────────────────────────────────────────────────────

def _build_context(burnout_score, risk_level, component_scores,
                   sleep_data, phone_data, activity_data, emotion_data) -> str:
    lines = [f"BURNOUT: {burnout_score:.1f}/100 — {risk_level.upper()}", ""]
    lines.append("COMPONENT SCORES (higher = worse burnout):")
    labels = {"sleep_score": "Sleep", "phone_overuse_score": "Phone",
              "typing_distress_score": "Typing/Cognitive", "activity_score": "Activity",
              "emotion_score": "Emotion"}
    for k, label in labels.items():
        lines.append(f"  {label}: {component_scores.get(k, 0):.0f}/100")
    if sleep_data:
        lines += ["", f"SLEEP: {sleep_data.get('duration_hours',0):.1f}h, "
                  f"quality {sleep_data.get('quality_score',0):.0f}/100, "
                  f"bedtime {sleep_data.get('bedtime','?')}"]
    if phone_data:
        lines += [f"PHONE: {phone_data.get('screen_time_hours',0):.1f}h, "
                  f"late night: {phone_data.get('late_night_usage','?')}, "
                  f"pickups: {phone_data.get('pickups_count','?')}"]
    if activity_data:
        lines += [f"ACTIVITY: work {activity_data.get('work_hours',0):.1f}h, "
                  f"exercise {activity_data.get('exercise_minutes',0):.0f}min, "
                  f"breaks {activity_data.get('break_count',0)}, "
                  f"focus {activity_data.get('focus_score',0):.0f}/100"]
    if emotion_data:
        lines += [f"EMOTION: dominant={emotion_data.get('dominant_emotion','?')}, "
                  f"negative_ratio={emotion_data.get('negative_ratio',0)*100:.0f}%"]
    return "\n".join(lines)
