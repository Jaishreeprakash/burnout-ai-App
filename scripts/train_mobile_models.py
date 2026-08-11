import json
import os
import math
import random

# Output directories for exported JSON models inside mobile assets & web assets
MOBILE_OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "mobile", "src", "assets", "models"))
WEB_OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web", "src", "assets", "models"))

os.makedirs(MOBILE_OUTPUT_DIR, exist_ok=True)
os.makedirs(WEB_OUTPUT_DIR, exist_ok=True)

def save_model(filename, model_dict):
    for out_dir in [MOBILE_OUTPUT_DIR, WEB_OUTPUT_DIR]:
        filepath = os.path.join(out_dir, filename)
        with open(filepath, "w") as f:
            json.dump(model_dict, f, indent=2)
    print(f"   [SUCCESS] Exported {filename} to mobile and web assets.")

random.seed(42)

print("[INFO] Starting ML Model Training and Export Pipeline...")

# Utility functions for linear regression & normalization
def mean(vals):
    return sum(vals) / len(vals)

def fit_linear_regression(X_matrix, y_vector):
    """
    Fits Multiple Linear Regression (Ordinary Least Squares) y = X * coef + intercept
    Returns (coefficients, intercept)
    """
    N = len(y_vector)
    num_features = len(X_matrix[0])
    
    # Compute mean of features and target
    x_means = [mean([row[i] for row in X_matrix]) for i in range(num_features)]
    y_mean = mean(y_vector)
    
    # Compute covariance and variance
    coefs = []
    for i in range(num_features):
        num = sum((X_matrix[j][i] - x_means[i]) * (y_vector[j] - y_mean) for j in range(N))
        den = sum((X_matrix[j][i] - x_means[i]) ** 2 for j in range(N)) + 1e-9
        coefs.append(round(num / den, 4))
        
    intercept = round(y_mean - sum(coefs[i] * x_means[i] for i in range(num_features)), 4)
    return coefs, intercept

# =====================================================================
# 1. SLEEP QUALITY & RECOVERY PREDICTOR
# =====================================================================
print("\n[1/5] Training Sleep Quality & Recovery Predictor...")
N = 1000
X_sleep = []
y_sleep_quality = []
y_sleep_fatigue = []

for _ in range(N):
    bedtime = random.uniform(20.0, 28.0) % 24  # 8 PM to 4 AM
    wake_time = random.uniform(5.0, 10.0)
    dur = (wake_time - bedtime) % 24
    if dur == 0: dur = 7.5
    interruptions = random.randint(0, 5)
    screen_time = random.uniform(1.0, 10.0)
    late_night = random.choice([0, 1])
    exercise = random.uniform(0, 120)
    stress = random.randint(1, 10)
    
    # Ground truth formula
    qual = 85.0 - abs(dur - 8.0) * 7.5 - interruptions * 5.5 - screen_time * 1.8 - late_night * 10.0 + (exercise / 30.0) * 3.5 - stress * 2.8 + random.gauss(0, 2)
    qual = max(10.0, min(100.0, qual))
    
    fatigue = 100.0 - qual * 0.7 + interruptions * 4.0 + random.gauss(0, 2)
    fatigue = max(0.0, min(100.0, fatigue))
    
    X_sleep.append([bedtime, wake_time, dur, interruptions, screen_time, late_night, exercise, stress])
    y_sleep_quality.append(qual)
    y_sleep_fatigue.append(fatigue)

coef_qual, inter_qual = fit_linear_regression(X_sleep, y_sleep_quality)
coef_fat, inter_fat = fit_linear_regression(X_sleep, y_sleep_fatigue)

sleep_export = {
    "features": ["bedtime_hour", "wake_time_hour", "duration_hours", "interruptions", "prev_screen_time", "prev_late_night", "prev_exercise", "prev_stress"],
    "quality_model": {"coefficients": coef_qual, "intercept": inter_qual},
    "fatigue_model": {"coefficients": coef_fat, "intercept": inter_fat},
    "circadian_classes": ["Low", "Moderate", "High"]
}

save_model("sleep_model.json", sleep_export)

# =====================================================================
# 2. DIGITAL OVERUSE & ADDICTION CLASSIFIER
# =====================================================================
print("\n[2/5] Training Digital Overuse & Addiction Classifier...")
X_phone = []
y_phone_score = []
y_phone_cap = []

for _ in range(N):
    total = random.uniform(1.0, 14.0)
    social = random.uniform(0.0, total)
    entertainment = random.uniform(0.0, total - social)
    productive = max(0.0, total - social - entertainment)
    pickups = random.randint(10, 250)
    late = random.choice([0, 1])
    avg_session = random.uniform(2.0, 90.0)
    
    score = total * 4.2 + social * 2.8 + (pickups / 100.0) * 14.0 + late * 14.0 - productive * 1.8 + random.gauss(0, 2)
    score = max(0.0, min(100.0, score))
    
    cap = max(1.5, min(8.0, 6.0 - (score / 20.0)))
    
    X_phone.append([total, social, entertainment, productive, pickups, late, avg_session])
    y_phone_score.append(score)
    y_phone_cap.append(cap)

coef_p_score, inter_p_score = fit_linear_regression(X_phone, y_phone_score)
coef_p_cap, inter_p_cap = fit_linear_regression(X_phone, y_phone_cap)

phone_export = {
    "features": ["total_screen", "social_media", "entertainment", "productive", "pickups", "late_night", "avg_session_min"],
    "score_model": {"coefficients": coef_p_score, "intercept": inter_p_score},
    "cap_model": {"coefficients": coef_p_cap, "intercept": inter_p_cap},
    "usage_classes": ["Healthy", "Distracted", "Compulsive_Addiction"]
}

save_model("phone_model.json", phone_export)


# =====================================================================
# 3. COGNITIVE EXHAUSTION & FOCUS MODEL
# =====================================================================
print("\n[3/5] Training Cognitive Exhaustion & Focus Model...")
X_act = []
y_focus = []
y_exhaust = []

for _ in range(N):
    work = random.uniform(0.0, 12.0)
    study = random.uniform(0.0, 8.0)
    exercise = random.uniform(0.0, 120.0)
    breaks = random.randint(0, 10)
    total_prod = work + study
    ratio = (breaks * 10.0) / (total_prod * 60.0 + 1.0)
    sleep_last = random.uniform(4.0, 10.0)
    
    focus = 70.0 + (sleep_last - 7.0) * 4.8 + (exercise / 30.0) * 4.5 + min(breaks, 6) * 2.8 - max(0, total_prod - 8.0) * 6.5 + random.gauss(0, 2)
    focus = max(10.0, min(100.0, focus))
    
    exhaust = max(0.0, min(1.0, (100.0 - focus) / 100.0 + (total_prod / 22.0)))
    
    X_act.append([work, study, exercise, breaks, ratio, sleep_last])
    y_focus.append(focus)
    y_exhaust.append(exhaust)

coef_foc, inter_foc = fit_linear_regression(X_act, y_focus)
coef_exh, inter_exh = fit_linear_regression(X_act, y_exhaust)

activity_export = {
    "features": ["work_hours", "study_hours", "exercise_min", "break_count", "break_to_work_ratio", "sleep_last_night"],
    "focus_model": {"coefficients": coef_foc, "intercept": inter_foc},
    "exhaustion_model": {"coefficients": coef_exh, "intercept": inter_exh}
}

save_model("activity_model.json", activity_export)


# =====================================================================
# 4. EMOTIONAL STABILITY & STRESS INTERVENTION MODEL
# =====================================================================
print("\n[4/5] Training Emotional Stability & Stress Intervention Model...")
X_emo = []
y_stab = []

emotions = ['Happy', 'Sad', 'Angry', 'Neutral', 'Surprised', 'Anxious']

for _ in range(N):
    code = random.randint(0, 5)
    stress = random.randint(1, 10)
    val = random.uniform(-1.0, 1.0)
    arousal = random.uniform(0.0, 1.0)
    tod = random.uniform(0.0, 24.0)
    
    stab = 80.0 + (val * 18.0) - (arousal * 14.0) - (stress * 3.8) + random.gauss(0, 2)
    stab = max(10.0, min(100.0, stab))
    
    X_emo.append([code, stress, val, arousal, tod])
    y_stab.append(stab)

coef_stab, inter_stab = fit_linear_regression(X_emo, y_stab)

emotion_export = {
    "features": ["emotion_code", "self_stress", "valence", "arousal", "time_of_day"],
    "stability_model": {"coefficients": coef_stab, "intercept": inter_stab},
    "emotion_map": {idx: em for idx, em in enumerate(emotions)},
    "stress_categories": ["Calm", "Mild_Stress", "High_Anxiety", "Burnout_Distress"],
    "urgency_levels": ["None", "Low", "Immediate_Breathing_Required"]
}

save_model("emotion_model.json", emotion_export)


# =====================================================================
# 5. MASTER BURNOUT FORECASTER
# =====================================================================
print("\n[5/5] Training Master Burnout Forecaster...")
X_mast = []
y_master = []
y_future = []

for _ in range(N):
    sq = random.uniform(30.0, 95.0)
    sd = random.uniform(4.0, 9.0)
    st = random.uniform(1.5, 10.0)
    pu = random.uniform(20, 180)
    wh = random.uniform(2.0, 11.0)
    ex = random.uniform(0, 90)
    nr = random.uniform(0.0, 0.9)
    es = random.uniform(20.0, 90.0)
    
    score = (100.0 - sq) * 0.25 + st * 3.8 + wh * 3.2 - (ex / 15.0) * 2.8 + nr * 22.0 + (100.0 - es) * 0.14 + random.gauss(0, 2)
    score = max(0.0, min(100.0, score))
    
    fut = max(0.0, min(100.0, score + random.gauss(1.2, 2.5)))
    
    X_mast.append([sq, sd, st, pu, wh, ex, nr, es])
    y_master.append(score)
    y_future.append(fut)

coef_m_score, inter_m_score = fit_linear_regression(X_mast, y_master)
coef_m_fut, inter_m_fut = fit_linear_regression(X_mast, y_future)

master_export = {
    "features": ["avg_sleep_qual_7d", "avg_sleep_dur_7d", "avg_screen_time_7d", "avg_pickups_7d", "avg_work_hours_7d", "avg_exercise_7d", "neg_emotion_ratio_7d", "emotion_stability_7d"],
    "master_score_model": {"coefficients": coef_m_score, "intercept": inter_m_score},
    "future_7d_model": {"coefficients": coef_m_fut, "intercept": inter_m_fut},
    "risk_levels": ["low", "moderate", "high", "critical"]
}

save_model("master_burnout_model.json", master_export)

print("\n[COMPLETE] All 5 ML models trained and serialized to mobile and web asset folders!")
