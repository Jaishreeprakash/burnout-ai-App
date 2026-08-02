from typing import Any, Dict, List, Optional


def generate_recommendations(
    burnout_score: float,
    component_scores: Dict[str, float],
    recent_data: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Generate personalized AI-driven wellness recommendations based on
    burnout score, component scores, and recent behavioral data.

    Returns a list of recommendation dicts with:
      - title, description, category, priority, action_steps
    """
    recommendations: List[Dict[str, Any]] = []
    recent_data = recent_data or {}

    sleep_score = component_scores.get("sleep_score", 50.0)
    phone_score = component_scores.get("phone_overuse_score", 30.0)
    typing_score = component_scores.get("typing_distress_score", 40.0)
    activity_score = component_scores.get("activity_score", 50.0)
    emotion_score = component_scores.get("emotion_score", 40.0)

    # -----------------------------------------------------------------------
    # CRITICAL / HIGH BURNOUT — Urgent intervention
    # -----------------------------------------------------------------------
    if burnout_score >= 75:
        recommendations.append({
            "title": "Immediate Burnout Intervention Required",
            "description": (
                "Your burnout score is critically high. This level of burnout can lead to "
                "serious physical and mental health consequences. Please take immediate steps "
                "to reduce stress and consult a mental health professional if needed."
            ),
            "category": "mental",
            "priority": "high",
            "action_steps": [
                "Schedule at least one full rest day this week with no work obligations",
                "Talk to a trusted friend, family member, or mental health professional",
                "Identify and temporarily remove the top 2-3 stressors in your life",
                "Practice 10 minutes of deep breathing or guided meditation daily",
                "Consider a complete digital detox for 24-48 hours",
            ],
        })

    elif burnout_score >= 50:
        recommendations.append({
            "title": "Elevated Burnout — Take Action Now",
            "description": (
                "Your burnout level is high. Without intervention, this can progress to "
                "critical burnout. Proactive changes to your daily routine are strongly advised."
            ),
            "category": "mental",
            "priority": "high",
            "action_steps": [
                "Block 30-minute recovery breaks every 2 hours during work/study",
                "Reduce your daily task list to only the 3 most important items",
                "Start a daily journal to track stress triggers",
                "Try the Pomodoro technique: 25 min focused work, 5 min break",
                "Engage in one enjoyable, non-productive activity each day",
            ],
        })

    elif burnout_score >= 25:
        recommendations.append({
            "title": "Moderate Stress Detected — Monitor and Adjust",
            "description": (
                "You are showing moderate signs of stress. Small, consistent habit changes "
                "now can prevent escalation to burnout."
            ),
            "category": "mental",
            "priority": "medium",
            "action_steps": [
                "Review your weekly schedule and identify overloaded days",
                "Practice gratitude journaling — write 3 things you're grateful for each evening",
                "Take a 15-minute walk outdoors each day",
                "Set clear work/study boundaries (define stop times)",
            ],
        })

    # -----------------------------------------------------------------------
    # SLEEP RECOMMENDATIONS
    # -----------------------------------------------------------------------
    if sleep_score >= 60:
        recommendations.append({
            "title": "Improve Your Sleep Quality",
            "description": (
                "Your sleep data indicates significant disruption. Poor sleep is one of the "
                "strongest predictors of burnout and cognitive decline."
            ),
            "category": "sleep",
            "priority": "high" if sleep_score >= 75 else "medium",
            "action_steps": [
                "Set a consistent bedtime and wake-up time — even on weekends",
                "Avoid screens (phone, TV, computer) for 60 minutes before bed",
                "Keep your bedroom cool (65-68°F / 18-20°C) and completely dark",
                "Avoid caffeine after 2 PM",
                "Try a 10-minute wind-down routine: light stretching, reading, or meditation",
                "If you're sleeping less than 6 hours, make sleep your top priority this week",
            ],
        })
    elif sleep_score >= 35:
        recommendations.append({
            "title": "Optimize Your Sleep Schedule",
            "description": "Your sleep patterns have some inconsistencies. Improving sleep hygiene will boost your energy and focus.",
            "category": "sleep",
            "priority": "medium",
            "action_steps": [
                "Try to keep your bedtime within a 30-minute window each night",
                "Use a sleep tracking app to identify patterns",
                "Avoid alcohol within 3 hours of bedtime",
                "Try magnesium glycinate or a light herbal tea before bed",
            ],
        })

    # Check for late night usage from recent data
    phone_recent = recent_data.get("phone", {})
    if phone_recent.get("late_night_usage", False):
        recommendations.append({
            "title": "Stop Late-Night Phone Use",
            "description": (
                "Late-night screen usage is detected. Blue light from screens suppresses "
                "melatonin, making it harder to fall asleep and reducing sleep quality."
            ),
            "category": "sleep",
            "priority": "high",
            "action_steps": [
                "Enable Night Mode or reduce screen brightness after 8 PM",
                "Set a phone curfew — put your phone in another room 1 hour before bed",
                "Use blue-light blocking glasses in the evenings",
                "Replace late-night scrolling with reading a physical book",
            ],
        })

    # -----------------------------------------------------------------------
    # PHONE USAGE / DIGITAL DETOX RECOMMENDATIONS
    # -----------------------------------------------------------------------
    if phone_score >= 55:
        recommendations.append({
            "title": "Digital Detox — Reduce Screen Time",
            "description": (
                "Your phone screen time is significantly elevated. Excessive screen time "
                "is linked to anxiety, reduced attention span, and poor sleep."
            ),
            "category": "phone",
            "priority": "high" if phone_score >= 70 else "medium",
            "action_steps": [
                "Set daily screen time limits in your phone's Digital Wellbeing / Screen Time settings",
                "Delete or time-restrict the top 3 apps consuming the most time",
                "Use app blockers during work/study hours (e.g., Freedom, Forest, or StayFocused)",
                "Charge your phone outside the bedroom",
                "Schedule 2-hour phone-free blocks each day",
                "Try a 24-hour phone detox this weekend",
            ],
        })
    elif phone_score >= 35:
        recommendations.append({
            "title": "Mindful Phone Usage",
            "description": "Your screen time is slightly elevated. Building mindful phone habits will improve focus and reduce stress.",
            "category": "phone",
            "priority": "low",
            "action_steps": [
                "Turn off non-essential notifications",
                "Batch-check messages at set times (e.g., 9AM, 1PM, 5PM) rather than continuously",
                "Keep mealtimes phone-free",
                "Use grayscale mode to make your phone less visually stimulating",
            ],
        })

    # -----------------------------------------------------------------------
    # ACTIVITY / EXERCISE RECOMMENDATIONS
    # -----------------------------------------------------------------------
    if activity_score >= 60:
        recommendations.append({
            "title": "Increase Physical Activity and Take Breaks",
            "description": (
                "Your activity levels are very low and/or you are overworking without breaks. "
                "Physical activity is one of the most effective burnout remedies."
            ),
            "category": "activity",
            "priority": "high" if activity_score >= 75 else "medium",
            "action_steps": [
                "Start with a 20-minute walk every day — no gym required",
                "Add 5-10 minute movement breaks every 90 minutes of desk work",
                "Try a beginner yoga or stretching routine (YouTube has many free options)",
                "Stand up and walk for 2 minutes for every 30 minutes of sitting",
                "Schedule exercise like an appointment — block time in your calendar",
                "Consider a standing desk or walking pad",
            ],
        })
    elif activity_score >= 35:
        recommendations.append({
            "title": "Maintain Regular Exercise Routine",
            "description": "Your exercise frequency could be improved. Consistent moderate activity significantly reduces stress hormones.",
            "category": "activity",
            "priority": "medium",
            "action_steps": [
                "Aim for 150 minutes of moderate exercise per week (WHO guideline)",
                "Try to break up sitting time every 45-60 minutes",
                "Add a social element — work out with a friend for accountability",
            ],
        })
    else:
        recommendations.append({
            "title": "Keep Up Your Active Lifestyle",
            "description": "Your activity levels are healthy. Continue incorporating regular movement and breaks into your day.",
            "category": "activity",
            "priority": "low",
            "action_steps": [
                "Consider adding high-intensity interval training (HIIT) 1-2 times per week",
                "Explore outdoor activities like hiking, cycling, or swimming",
                "Try meditation or yoga to complement physical exercise",
            ],
        })

    # -----------------------------------------------------------------------
    # MENTAL / EMOTIONAL RECOMMENDATIONS
    # -----------------------------------------------------------------------
    if emotion_score >= 55:
        recommendations.append({
            "title": "Address Negative Emotional Patterns",
            "description": (
                "Your emotion data shows a high proportion of negative emotions. "
                "Persistent negative emotions are a core symptom of burnout and can "
                "lead to depression if unaddressed."
            ),
            "category": "mental",
            "priority": "high" if emotion_score >= 70 else "medium",
            "action_steps": [
                "Consider speaking with a therapist or counselor",
                "Practice mindfulness meditation — try apps like Headspace, Calm, or Insight Timer",
                "Engage in activities that previously brought you joy, even for short periods",
                "Practice cognitive reframing: challenge negative thoughts with evidence",
                "Limit news and social media consumption — curate a positive feed",
                "Connect with supportive friends or family members regularly",
            ],
        })
    elif emotion_score >= 35:
        recommendations.append({
            "title": "Emotional Balance and Stress Resilience",
            "description": "You show some negative emotional patterns. Building emotional resilience will help maintain wellbeing.",
            "category": "mental",
            "priority": "medium",
            "action_steps": [
                "Start a mood journal — track emotions and their triggers for 2 weeks",
                "Practice the 4-7-8 breathing technique when feeling stressed",
                "Schedule regular social connection time",
                "Try progressive muscle relaxation before bed",
            ],
        })

    # -----------------------------------------------------------------------
    # TYPING / COGNITIVE LOAD RECOMMENDATIONS
    # -----------------------------------------------------------------------
    if typing_score >= 55:
        recommendations.append({
            "title": "Reduce Cognitive Overload",
            "description": (
                "Your typing patterns suggest significant cognitive fatigue. "
                "This is a sign that your brain is overloaded and needs recovery time."
            ),
            "category": "mental",
            "priority": "medium",
            "action_steps": [
                "Take a 15-minute complete mental break — no screens, no reading",
                "Break complex tasks into smaller, manageable subtasks",
                "Use voice-to-text or dictation to reduce typing fatigue",
                "Prioritize tasks and defer non-urgent ones",
                "Try brain-training games or puzzles during breaks instead of social media",
            ],
        })

    # -----------------------------------------------------------------------
    # SORT by priority: high > medium > low
    # -----------------------------------------------------------------------
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda r: priority_order.get(r["priority"], 3))

    return recommendations


def get_quick_tips(
    burnout_score: float,
    component_scores: Dict[str, float],
) -> List[Dict[str, Any]]:
    """Return 3 quick, actionable tips based on highest-risk areas."""
    all_recs = generate_recommendations(burnout_score, component_scores)

    # Return the top 3 high-priority or first available
    quick = []
    for rec in all_recs:
        if len(quick) >= 3:
            break
        quick.append({
            "title": rec["title"],
            "tip": rec["action_steps"][0] if rec["action_steps"] else rec["description"],
            "category": rec["category"],
            "priority": rec["priority"],
        })

    # Pad to 3 with generic tips if needed
    generic_tips = [
        {
            "title": "Stay Hydrated",
            "tip": "Drink at least 8 glasses of water today — dehydration increases fatigue and cognitive impairment",
            "category": "activity",
            "priority": "low",
        },
        {
            "title": "Practice Gratitude",
            "tip": "Write down 3 things you are grateful for right now",
            "category": "mental",
            "priority": "low",
        },
        {
            "title": "Take a Breath",
            "tip": "Do a 2-minute box breathing exercise: inhale 4s, hold 4s, exhale 4s, hold 4s",
            "category": "mental",
            "priority": "low",
        },
    ]

    for tip in generic_tips:
        if len(quick) >= 3:
            break
        quick.append(tip)

    return quick[:3]
