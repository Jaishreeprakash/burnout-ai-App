"""
Intelligent rule-based wellness chat engine.
Generates dynamic, personalised responses using the user's real burnout data.
Works without any external API — no OpenAI credits required.
"""
import re
from typing import Dict, List, Optional, Any


# ── Intent detection ──────────────────────────────────────────────────────────

INTENT_PATTERNS = {
    "sleep": [
        r"sleep", r"insomnia", r"tired", r"rest", r"bedtime", r"wake", r"exhausted",
        r"fatigue", r"nap", r"drowsy", r"night", r"hours? of sleep",
    ],
    "stress": [
        r"stress", r"anxious", r"anxiety", r"overwhelm", r"pressure", r"nervous",
        r"panic", r"worry", r"tense", r"frustrated", r"burnt? ?out", r"burnout",
    ],
    "work": [
        r"work", r"job", r"office", r"deadline", r"meeting", r"boss", r"colleague",
        r"productivity", r"focus", r"concentrate", r"overwork", r"hours",
    ],
    "phone": [
        r"phone", r"screen", r"social media", r"instagram", r"tiktok", r"scroll",
        r"digital", r"app", r"notification", r"device", r"doom.?scroll",
    ],
    "exercise": [
        r"exercise", r"workout", r"gym", r"walk", r"run", r"sport", r"active",
        r"sedentary", r"move", r"physical", r"yoga", r"stretch",
    ],
    "emotion": [
        r"feel", r"emotion", r"mood", r"sad", r"happy", r"angry", r"depress",
        r"lonely", r"unmotivated", r"hopeless", r"cry", r"tears", r"numb",
    ],
    "breathing": [
        r"breath", r"breathing", r"calm", r"relax", r"meditation", r"mindful",
        r"panic attack", r"inhale", r"exhale",
    ],
    "diet": [
        r"eat", r"food", r"diet", r"nutrition", r"meal", r"water", r"coffee",
        r"caffeine", r"energy drink", r"sugar",
    ],
    "score": [
        r"score", r"risk", r"level", r"how am i", r"my data", r"result",
        r"analysis", r"assessment", r"status", r"percentage",
    ],
    "help": [
        r"help", r"what (can|should) i do", r"advice", r"suggest", r"tip",
        r"recommend", r"how to", r"how do i",
    ],
    "greeting": [
        r"^hi\b", r"^hello\b", r"^hey\b", r"^good (morning|afternoon|evening)",
        r"^what's up", r"^howdy",
    ],
}


def detect_intent(message: str) -> str:
    """Return the primary intent category for a user message."""
    msg_lower = message.lower()
    scores = {intent: 0 for intent in INTENT_PATTERNS}
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, msg_lower):
                scores[intent] += 1
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "general"


# ── Response builders ─────────────────────────────────────────────────────────

def _fmt(score: Optional[float], default: str = "—") -> str:
    return f"{score:.1f}" if score is not None else default


def build_response(
    intent: str,
    message: str,
    burnout_score: float,
    risk_level: str,
    username: str,
    sleep_data: Optional[Dict] = None,
    phone_data: Optional[Dict] = None,
    activity_data: Optional[Dict] = None,
    emotion_data: Optional[Dict] = None,
    component_scores: Optional[Dict] = None,
) -> str:
    name = username.split()[0] if username else "there"
    comp = component_scores or {}

    builders = {
        "greeting":  _greeting,
        "sleep":     _sleep_response,
        "stress":    _stress_response,
        "work":      _work_response,
        "phone":     _phone_response,
        "exercise":  _exercise_response,
        "emotion":   _emotion_response,
        "breathing": _breathing_response,
        "diet":      _diet_response,
        "score":     _score_response,
        "help":      _help_response,
        "general":   _general_response,
    }

    fn = builders.get(intent, _general_response)
    return fn(name, burnout_score, risk_level, sleep_data, phone_data,
               activity_data, emotion_data, comp)


# ── Individual response generators ───────────────────────────────────────────

def _greeting(name, burnout, risk, sleep, phone, activity, emotion, comp):
    risk_msg = {
        "low":      "You're in a healthy zone — keep it up! 🟢",
        "moderate": "You're in a moderate burnout zone. Small steps matter. 🟡",
        "high":     "Your burnout risk is elevated. Let's work on this together. 🟠",
        "critical": "Your burnout is at a critical level. Please prioritise rest today. 🔴",
    }.get(risk.lower(), "Let's check in on your wellness.")

    sleep_line = ""
    if sleep:
        hrs = sleep.get("duration_hours", 0)
        sleep_line = f" Last night you got {hrs:.1f}h of sleep{'  — well done!' if hrs >= 7 else ', which is below the 7h target.'},"

    return (
        f"Hey {name}! Welcome back to BurnoutAI. 👋\n\n"
        f"Your current burnout score is **{burnout:.0f}/100** — {risk_msg}\n"
        f"{sleep_line}\n\n"
        f"I'm fully aware of your wellness data and here to help. "
        f"What's on your mind today?"
    )


def _sleep_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    sleep_score = comp.get("sleep_score", 50)

    if not sleep:
        return (
            f"{name}, I don't have your recent sleep data yet. "
            f"Log tonight's sleep in the Sleep Tracker so I can give you personalised advice. "
            f"In general, aim for 7–9 hours and keep a consistent bedtime within ±30 minutes every day."
        )

    hrs   = sleep.get("duration_hours", 0)
    qual  = sleep.get("quality_score", 50)
    bed   = sleep.get("bedtime", "unknown")
    late  = phone.get("late_night_usage", False) if phone else False

    deficit = 7 - hrs if hrs < 7 else 0
    lines = [f"{name}, here's what your sleep data tells me:\n"]
    lines.append(f"• Duration: **{hrs:.1f}h** (optimal is 7–9h)")
    lines.append(f"• Quality: **{qual:.0f}/100**")
    lines.append(f"• Bedtime: **{bed}**")

    if sleep_score > 60:
        lines.append(f"\nYour sleep is the **biggest driver** of your {burnout:.0f}/100 burnout score.")

    if hrs < 6:
        lines.append(
            f"\n⚠️ You're sleeping {deficit:.1f}h less than the minimum. "
            f"This alone can raise stress hormones by 37%. "
            f"Tonight: set a hard stop on all screens by 10 PM and be in bed by {_suggest_bedtime(hrs)}."
        )
    elif hrs < 7:
        lines.append(
            f"\nYou're {deficit:.1f}h short of the 7h target. "
            f"Try moving your bedtime 30 minutes earlier this week."
        )
    else:
        lines.append(f"\nYour sleep duration is solid! Focus on improving the quality score.")

    if late:
        lines.append(
            f"\n📱 Late-night phone use detected — blue light suppresses melatonin for up to 2 hours. "
            f"Try enabling Night Mode after 9 PM and leaving your phone outside the bedroom."
        )

    if qual < 60:
        lines.append(
            f"\nFor better quality: keep the bedroom cool (18–20°C), dark, and quiet. "
            f"Try the 4-7-8 breathing technique before bed: inhale 4s, hold 7s, exhale 8s."
        )

    return "\n".join(lines)


def _suggest_bedtime(current_hrs: float) -> str:
    hour = 23 - int(8 - current_hrs)
    return f"{max(21, hour):02d}:00"


def _stress_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    emotion_score = comp.get("emotion_score", 50)
    dominant = emotion.get("dominant_emotion", "stressed") if emotion else "stressed"

    lines = [f"{name}, stress is your body's alarm system — it's telling you something needs to change.\n"]

    lines.append(f"Your burnout score is **{burnout:.0f}/100** (risk: {risk}).")

    if emotion_score > 60:
        lines.append(
            f"Your emotional distress score is **{emotion_score:.0f}/100**, "
            f"and your dominant detected emotion is **{dominant}**. "
            f"This is significantly affecting your overall burnout."
        )

    # Personalised based on biggest stressor
    biggest = _worst_component(comp)
    stressor_tips = {
        "sleep_score":          "Your poor sleep is amplifying your stress — even one good night can reduce cortisol by 20%.",
        "phone_overuse_score":  "Your screen time is a hidden stressor. Every notification triggers a small cortisol spike.",
        "activity_score":       "Low physical activity is fuelling your stress. Even a 10-minute walk releases endorphins.",
        "emotion_score":        "Your emotions are in overdrive. Name what you're feeling — just labelling an emotion reduces its intensity by 30%.",
        "typing_distress_score":"Cognitive fatigue is building up. Take a 5-minute break every 45 minutes.",
    }
    if biggest:
        lines.append(f"\n💡 Key insight: {stressor_tips.get(biggest, '')}")

    lines.append(
        f"\n**Right now — try this:**\n"
        f"Box breathing (scientifically proven to calm the nervous system in 90 seconds):\n"
        f"1. Inhale slowly for **4 counts**\n"
        f"2. Hold for **4 counts**\n"
        f"3. Exhale for **4 counts**\n"
        f"4. Hold for **4 counts**\n"
        f"Repeat 4 times. Do it now — I'll wait. 🌿"
    )

    return "\n".join(lines)


def _work_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    work_hrs = activity.get("work_hours", 0) if activity else 0
    breaks   = activity.get("break_count", 0) if activity else 0
    focus    = activity.get("focus_score", 50) if activity else 50

    lines = []

    if work_hrs > 10:
        lines.append(
            f"{name}, you logged **{work_hrs:.1f} hours** of work today. "
            f"That's {work_hrs - 8:.1f}h above the healthy limit and is directly contributing "
            f"to your **{burnout:.0f}/100** burnout score. 🚨"
        )
    elif work_hrs > 8:
        lines.append(
            f"{name}, you're working **{work_hrs:.1f}h** — slightly over the 8h mark. "
            f"Your burnout score is {burnout:.0f}/100."
        )
    else:
        lines.append(
            f"{name}, your work hours ({work_hrs:.1f}h) look balanced. "
            f"Let's keep it that way."
        )

    if breaks < 2:
        lines.append(
            f"\nYou only took **{breaks} break(s)** today. "
            f"Research shows 5-minute breaks every 52 minutes improve focus by 16%. "
            f"Set a phone timer right now for 52 minutes."
        )
    else:
        lines.append(f"\nGood — you took {breaks} breaks. Keep that rhythm going.")

    if focus < 50:
        lines.append(
            f"\nYour focus score is **{focus:.0f}/100**. "
            f"Try the Pomodoro technique: 25 min deep work → 5 min break, repeat 4 times → 30 min rest."
        )

    lines.append(
        f"\n🎯 **One rule for tomorrow:** Stop work at a fixed time. "
        f"Put it in your calendar right now as a meeting with yourself: 'Work ends at 6 PM'."
    )

    return "\n".join(lines)


def _phone_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    if not phone:
        return (
            f"{name}, log your phone usage in the app to get personalised digital wellness advice. "
            f"The average Gen Z spends 7+ hours on screens daily — knowing your number is the first step."
        )

    screen = phone.get("screen_time_hours", 0)
    pickups = phone.get("pickups_count", 0)
    late = phone.get("late_night_usage", False)
    phone_score = comp.get("phone_overuse_score", 50)

    lines = [f"{name}, here's your phone usage picture:\n"]
    lines.append(f"• Screen time: **{screen:.1f}h** (recommended max: 4h)")
    lines.append(f"• Phone pickups: **{pickups}** times")
    lines.append(f"• Late-night usage: **{'Yes ⚠️' if late else 'No ✅'}**")
    lines.append(f"• Contribution to burnout: **{phone_score:.0f}/100**")

    if screen > 6:
        lines.append(
            f"\n🔴 {screen:.1f}h is significantly high. "
            f"Every extra hour of screen time above 4h correlates with a 13% increase in cortisol. "
            f"Start with this: delete one social media app for 7 days. "
            f"Research shows 79% of people feel less stressed after a 1-week digital detox."
        )
    elif screen > 4:
        lines.append(
            f"\n🟡 You're {screen - 4:.1f}h over the healthy limit. "
            f"Set app time limits: 30 min/day for social media in your phone settings."
        )

    if pickups > 60:
        lines.append(
            f"\n{pickups} pickups means you interrupted yourself every "
            f"{round(60 / (pickups / 16))} minutes during your 16 waking hours. "
            f"Turn off all non-essential notifications right now."
        )

    if late:
        lines.append(
            f"\nLate-night phone use is disrupting your melatonin production. "
            f"Try: phone charges in the kitchen (not bedroom) starting tonight."
        )

    return "\n".join(lines)


def _exercise_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    ex_min = activity.get("exercise_minutes", 0) if activity else 0
    activity_score = comp.get("activity_score", 50)

    lines = []
    if ex_min == 0:
        lines.append(
            f"{name}, you had **0 minutes** of exercise today. "
            f"Physical inactivity is contributing **{activity_score:.0f}/100** points to your burnout score.\n"
            f"You don't need a gym. Here's a 7-minute no-equipment routine you can do right now:"
        )
        lines.append(
            "1. Jumping jacks — 1 min\n"
            "2. Push-ups — 1 min\n"
            "3. High knees — 1 min\n"
            "4. Squats — 1 min\n"
            "5. Plank — 1 min\n"
            "6. Lunges — 1 min\n"
            "7. Stretching — 1 min"
        )
        lines.append(f"\nEven this small dose of movement reduces cortisol by ~15% within 30 minutes.")
    elif ex_min < 30:
        lines.append(
            f"{name}, you exercised for **{ex_min} minutes** today — good start! "
            f"The WHO recommends 30 min/day. You're {30 - ex_min} minutes short. "
            f"Add a short walk after dinner to hit the target."
        )
    else:
        lines.append(
            f"{name}, excellent — **{ex_min} minutes** of exercise today! 🎉 "
            f"This is actively reducing your burnout score. "
            f"Regular exercise this week will lower your burnout from {burnout:.0f} by approximately 8-12 points."
        )

    return "\n".join(lines)


def _emotion_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    dominant = emotion.get("dominant_emotion", "neutral") if emotion else "neutral"
    neg_ratio = emotion.get("negative_ratio", 0.3) if emotion else 0.3
    stability = emotion.get("stability_score", 50) if emotion else 50

    emotion_tips = {
        "sad":       ("💙 Feeling sad is valid and human.", "Connect with one person you trust today — even a 5-minute call."),
        "angry":     ("🔥 Anger often signals a boundary being crossed.", "Write down what's frustrating you — 10 minutes of journaling reduces anger by 40%."),
        "anxious":   ("💛 Anxiety is your brain trying to protect you.", "Ground yourself: name 5 things you can see, 4 you can touch, 3 you can hear."),
        "stressed":  ("🟠 You're under significant pressure right now.", "Prioritise your top 3 tasks and drop everything else today."),
        "fearful":   ("💜 Fear is information, not a verdict.", "Break down what you're afraid of into the smallest possible first step."),
        "disgusted": ("This feeling often signals a values conflict.", "Identify what triggered this — it's usually something important to you."),
        "neutral":   ("😐 You're in a neutral emotional state.", "This is a good time to tackle your most important task while you're steady."),
        "happy":     ("😊 You're feeling positive — great!", "Channel this energy into progress on something meaningful today."),
        "calm":      ("😌 Calm is your superpower.", "Use this clarity to plan something you've been putting off."),
    }

    intro, tip = emotion_tips.get(dominant, ("Your emotions are data.", "Reflect on what's driving them."))

    lines = [f"{name}, your dominant detected emotion is **{dominant}**.\n"]
    lines.append(intro)
    lines.append(f"\n💡 **Personalised tip:** {tip}")

    if neg_ratio > 0.5:
        lines.append(
            f"\n⚠️ {int(neg_ratio * 100)}% of your recent emotion records are negative. "
            f"This is significantly impacting your burnout score ({burnout:.0f}/100). "
            f"Consider scheduling a conversation with a mental health professional — "
            f"this isn't weakness, it's the smartest thing you can do."
        )

    if stability < 40:
        lines.append(
            f"\nYour emotional stability score is **{stability:.0f}/100** — quite variable. "
            f"A regular 10-minute journaling practice can improve emotional regulation within 2 weeks."
        )

    return "\n".join(lines)


def _breathing_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    return (
        f"{name}, let's do this together. Find a comfortable position and follow along:\n\n"
        f"**Box Breathing** (used by Navy SEALs to stay calm under pressure):\n\n"
        f"1. 🌬️ **Inhale** through your nose — count to **4**\n"
        f"2. ⏸️ **Hold** your breath — count to **4**\n"
        f"3. 😮‍💨 **Exhale** slowly through your mouth — count to **4**\n"
        f"4. ⏸️ **Hold** empty — count to **4**\n\n"
        f"Repeat this **4 times**. Total time: 64 seconds.\n\n"
        f"This activates your parasympathetic nervous system and can reduce anxiety by 40% within 2 minutes. "
        f"Your burnout score is {burnout:.0f}/100 — this is one of the fastest ways to lower it right now. "
        f"Take your time. I'm right here. 🌿"
    )


def _diet_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    return (
        f"{name}, nutrition directly impacts your burnout recovery. Here's what the data says:\n\n"
        f"**Quick wins based on your {burnout:.0f}/100 burnout score:**\n\n"
        f"• 💧 **Water first:** Dehydration of just 2% impairs cognitive function. "
        f"Drink a full glass of water right now before anything else.\n\n"
        f"• ☕ **Caffeine timing:** If you're having coffee after 2 PM, it's disrupting your sleep. "
        f"Move your last caffeine to before noon.\n\n"
        f"• 🍬 **Sugar spikes:** High-sugar foods cause energy crashes that mimic burnout symptoms. "
        f"Swap one daily snack for nuts, fruit, or yogurt.\n\n"
        f"• 🥗 **Omega-3s:** Studies show omega-3 fatty acids reduce workplace stress by 20%. "
        f"Add salmon, walnuts, or flaxseeds to this week's meals.\n\n"
        f"Small, consistent changes beat perfect plans. Pick one of these and do it today."
    )


def _score_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    sleep_score   = comp.get("sleep_score", 50)
    phone_score   = comp.get("phone_overuse_score", 50)
    activity_score = comp.get("activity_score", 50)
    emotion_score  = comp.get("emotion_score", 50)
    typing_score   = comp.get("typing_distress_score", 50)

    # Find biggest contributor
    biggest = _worst_component(comp)
    focus_area = {
        "sleep_score":           "sleep",
        "phone_overuse_score":   "phone/screen time",
        "activity_score":        "physical activity",
        "emotion_score":         "emotional state",
        "typing_distress_score": "cognitive load/work intensity",
    }.get(biggest, "multiple areas")

    risk_emoji = {"low": "🟢", "moderate": "🟡", "high": "🟠", "critical": "🔴"}.get(risk.lower(), "⚪")

    return (
        f"{name}, here's your complete wellness breakdown:\n\n"
        f"**Overall Burnout Score: {burnout:.0f}/100** {risk_emoji} ({risk.upper()} RISK)\n\n"
        f"**Component breakdown** (higher = more risk):\n"
        f"• Sleep quality:      {sleep_score:.0f}/100  {'🔴' if sleep_score > 60 else '🟡' if sleep_score > 30 else '🟢'}\n"
        f"• Phone overuse:      {phone_score:.0f}/100  {'🔴' if phone_score > 60 else '🟡' if phone_score > 30 else '🟢'}\n"
        f"• Activity level:     {activity_score:.0f}/100  {'🔴' if activity_score > 60 else '🟡' if activity_score > 30 else '🟢'}\n"
        f"• Emotional state:    {emotion_score:.0f}/100  {'🔴' if emotion_score > 60 else '🟡' if emotion_score > 30 else '🟢'}\n"
        f"• Cognitive stress:   {typing_score:.0f}/100  {'🔴' if typing_score > 60 else '🟡' if typing_score > 30 else '🟢'}\n\n"
        f"**Your #1 priority right now:** Focus on **{focus_area}** — "
        f"it's contributing the most to your burnout. "
        f"Ask me 'what should I do about {focus_area}?' for a specific action plan."
    )


def _help_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    biggest = _worst_component(comp)
    area_msg = {
        "sleep_score":           f"fix your sleep — you're averaging under 7h",
        "phone_overuse_score":   f"reduce screen time",
        "activity_score":        f"add movement to your day",
        "emotion_score":         f"manage your emotional state",
        "typing_distress_score": f"reduce cognitive overload",
    }.get(biggest, "improve your wellness habits")

    return (
        f"{name}, I've analysed your data and here's what I recommend focusing on:\n\n"
        f"🎯 **Your #1 action: {area_msg.capitalize()}**\n\n"
        f"You can ask me about any of these topics and I'll give you personalised advice:\n\n"
        f"• 😴 **Sleep** — 'How can I sleep better?'\n"
        f"• 😰 **Stress** — 'I'm feeling overwhelmed'\n"
        f"• 💼 **Work** — 'I'm working too many hours'\n"
        f"• 📱 **Phone** — 'I use my phone too much'\n"
        f"• 🏃 **Exercise** — 'How do I get more active?'\n"
        f"• 😊 **Emotions** — 'I'm feeling sad/anxious/angry'\n"
        f"• 🌬️ **Breathing** — 'Help me calm down right now'\n"
        f"• 📊 **My score** — 'Explain my burnout score'\n\n"
        f"Your current burnout is **{burnout:.0f}/100** ({risk}). What do you want to tackle first?"
    )


def _general_response(name, burnout, risk, sleep, phone, activity, emotion, comp):
    biggest = _worst_component(comp)
    area = {
        "sleep_score":           "sleep",
        "phone_overuse_score":   "screen time",
        "activity_score":        "physical movement",
        "emotion_score":         "emotional wellbeing",
        "typing_distress_score": "work intensity",
    }.get(biggest, "overall wellness")

    return (
        f"{name}, I heard you. Your current burnout score is **{burnout:.0f}/100** ({risk} risk), "
        f"and your biggest opportunity right now is improving your **{area}**.\n\n"
        f"I'm here as your personal wellness coach — fully aware of your data. "
        f"You can ask me anything about sleep, stress, work-life balance, exercise, "
        f"or just type 'help' to see what I can do for you."
    )


# ── Utility ───────────────────────────────────────────────────────────────────

def _worst_component(comp: Dict[str, float]) -> Optional[str]:
    if not comp:
        return None
    return max(comp, key=lambda k: comp[k])
