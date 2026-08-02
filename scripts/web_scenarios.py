"""
Real page/selector data for the HealthSense AI web app, gathered from the
actual source in web/src (routes, react-hook-form field ids, aria-labels,
visible text) — no data-testid attributes exist in the app, so every
locator here is a real id/name/type/aria-label/text selector that
genuinely resolves in the rendered DOM.
"""
from selenium.webdriver.common.by import By

BASE_PATH_TITLES = {
    "/login": "Sign In",
    "/register": "Create Account",
    "/dashboard": "Dashboard",
    "/sleep": "Sleep Tracker",
    "/phone": "Phone Usage",
    "/emotions": "Emotion Analysis",
    "/activity": "Activity Tracker",
    "/recommendations": "Recommendations",
    "/analytics": "Analytics",
    "/chat": "Wellness Chat",
    "/profile": "Profile",
}

SIDEBAR_LINKS = [
    ("Dashboard", "/dashboard"), ("Sleep Tracker", "/sleep"), ("Phone Usage", "/phone"),
    ("Emotion Analysis", "/emotions"), ("Activity Tracker", "/activity"),
    ("Recommendations", "/recommendations"), ("Analytics", "/analytics"),
    ("AI Coach Chat", "/chat"), ("Profile", "/profile"),
]

VIEWPORTS = [
    ("mobile-small", 320, 568), ("mobile", 375, 812), ("tablet", 768, 1024),
    ("desktop", 1440, 900), ("desktop-large", 1920, 1080),
]

# Per-page element-presence checks: (page_path, check_name, by, selector)
PAGE_ELEMENT_CHECKS = [
    ("/login", "username_input", By.ID, "username"),
    ("/login", "password_input", By.ID, "password"),
    ("/login", "submit_button", By.XPATH, "//button[@type='submit']"),
    ("/login", "register_link", By.LINK_TEXT, "Create one free"),
    ("/login", "password_toggle", By.CSS_SELECTOR, "[aria-label='Show password']"),

    ("/register", "full_name_input", By.ID, "full_name"),
    ("/register", "username_input", By.ID, "username"),
    ("/register", "email_input", By.ID, "email"),
    ("/register", "age_input", By.ID, "age"),
    ("/register", "gender_select", By.ID, "gender"),
    ("/register", "password_input", By.ID, "password"),
    ("/register", "confirm_password_input", By.ID, "confirmPassword"),
    ("/register", "submit_button", By.XPATH, "//button[@type='submit']"),
    ("/register", "login_link", By.LINK_TEXT, "Sign in"),

    ("/dashboard", "refresh_button", By.XPATH, "//button[contains(.,'Refresh')]"),
    ("/dashboard", "burnout_score_heading", By.XPATH, "//*[contains(text(),'Burnout Risk Score')]"),
    ("/dashboard", "wellness_score_heading", By.XPATH, "//*[contains(text(),'Wellness Score')]"),
    ("/dashboard", "health_dimensions_heading", By.XPATH, "//*[contains(text(),'Health Dimensions')]"),
    ("/dashboard", "emotional_stability_heading", By.XPATH, "//*[contains(text(),'Emotional Stability Trend')]"),
    ("/dashboard", "emotion_distribution_heading", By.XPATH, "//*[contains(text(),'Emotion Distribution')]"),
    ("/dashboard", "ai_recommendations_heading", By.XPATH, "//*[contains(text(),'AI Recommendations')]"),
    ("/dashboard", "progress_comparison_heading", By.XPATH, "//*[contains(text(),'Progress Comparison')]"),
    ("/dashboard", "quick_stats_heading", By.XPATH, "//*[contains(text(),'Quick Stats')]"),
    ("/dashboard", "view_all_link", By.LINK_TEXT, "View all"),

    ("/sleep", "overview_tab", By.XPATH, "//button[normalize-space()='overview']"),
    ("/sleep", "calendar_tab", By.XPATH, "//button[normalize-space()='calendar']"),
    ("/sleep", "log_tab", By.XPATH, "//button[normalize-space()='log']"),
    ("/sleep", "refresh_button", By.XPATH, "//button[contains(.,'Refresh')]"),
    ("/sleep", "log_sleep_button", By.XPATH, "//button[contains(.,'Log Sleep')]"),

    ("/recommendations", "filter_all", By.XPATH, "//button[normalize-space()='All']"),
    ("/recommendations", "filter_sleep", By.XPATH, "//button[normalize-space()='Sleep']"),
    ("/recommendations", "filter_phone", By.XPATH, "//button[normalize-space()='Phone']"),
    ("/recommendations", "filter_activity", By.XPATH, "//button[normalize-space()='Activity']"),
    ("/recommendations", "filter_mental_health", By.XPATH, "//button[normalize-space()='Mental Health']"),
    ("/recommendations", "filter_social", By.XPATH, "//button[normalize-space()='Social']"),
    ("/recommendations", "filter_nutrition", By.XPATH, "//button[normalize-space()='Nutrition']"),
    ("/recommendations", "sort_toggle", By.XPATH, "//button[contains(.,'Sort:')]"),

    ("/analytics", "range_7d", By.XPATH, "//button[normalize-space()='7D']"),
    ("/analytics", "range_30d", By.XPATH, "//button[normalize-space()='30D']"),
    ("/analytics", "export_button", By.XPATH, "//button[contains(.,'Export')]"),
    ("/analytics", "refresh_button", By.XPATH, "//button[contains(.,'Refresh')]"),

    ("/chat", "message_input", By.CSS_SELECTOR, "input[aria-label='Message']"),
    ("/chat", "send_button", By.CSS_SELECTOR, "button[aria-label='Send message']"),
    ("/chat", "new_chat_button", By.XPATH, "//button[contains(.,'New Chat')]"),

    ("/profile", "profile_tab", By.XPATH, "//button[normalize-space()='Profile']"),
    ("/profile", "notifications_tab", By.XPATH, "//button[normalize-space()='Notifications']"),
    ("/profile", "privacy_tab", By.XPATH, "//button[normalize-space()='Privacy']"),
    ("/profile", "edit_button", By.XPATH, "//button[contains(.,'Edit')]"),
    ("/profile", "sign_out_button", By.XPATH, "//button[contains(.,'Sign Out')]"),
]

# --- Additional real checks: header (shared Layout component), and giving
# Phone Usage / Emotion Analysis / Activity Tracker genuine per-element
# coverage (previously only a generic BASIC_PAGES load check, kept below
# unchanged / additive). Every selector below was verified against the
# actual source in web/src before being added.

# Header.tsx renders on every authenticated page via Layout.tsx — verify its
# two always-in-DOM controls are present on each of the 9 authenticated pages.
_AUTHENTICATED_PAGES = ["/dashboard", "/sleep", "/phone", "/emotions", "/activity",
                         "/recommendations", "/analytics", "/chat", "/profile"]
for _p in _AUTHENTICATED_PAGES:
    PAGE_ELEMENT_CHECKS.append((_p, "header_open_menu_button", By.CSS_SELECTOR, "[aria-label='Open menu']"))
    PAGE_ELEMENT_CHECKS.append((_p, "header_notifications_button", By.CSS_SELECTOR, "[aria-label='Notifications']"))

PAGE_ELEMENT_CHECKS += [
    # Phone Usage (web/src/pages/PhoneUsage.tsx)
    ("/phone", "refresh_button", By.CSS_SELECTOR, "[aria-label='Refresh']"),
    ("/phone", "log_usage_button", By.XPATH, "//button[contains(.,'Log Usage')]"),
    ("/phone", "app_usage_breakdown_heading", By.XPATH, "//*[contains(text(),'App Usage Breakdown')]"),
    ("/phone", "screen_time_trend_heading", By.XPATH, "//*[contains(text(),'Screen Time Trend')]"),
    ("/phone", "late_night_pattern_heading", By.XPATH, "//*[contains(text(),'Late Night Usage Pattern')]"),

    # Emotion Analysis (web/src/pages/EmotionAnalysis.tsx)
    ("/emotions", "current_tab", By.XPATH, "//button[normalize-space()='Current Emotion']"),
    ("/emotions", "history_tab", By.XPATH, "//button[normalize-space()='history']"),
    ("/emotions", "trends_tab", By.XPATH, "//button[normalize-space()='trends']"),
    ("/emotions", "emotion_detection_heading", By.XPATH, "//*[contains(text(),'Emotion Detection')]"),
    ("/emotions", "refresh_data_button", By.XPATH, "//button[contains(.,'Refresh Data')]"),
    ("/emotions", "log_happy_emotion_button", By.XPATH, "//button[contains(.,'Happy')]"),

    # Activity Tracker (web/src/pages/ActivityTracker.tsx)
    ("/activity", "refresh_button", By.CSS_SELECTOR, "[aria-label='Refresh']"),
    ("/activity", "log_activity_button", By.XPATH, "//button[contains(.,'Log Activity')]"),
    ("/activity", "todays_progress_heading", By.XPATH, "//*[contains(text(),\"Today's Progress\")]"),
    ("/activity", "activity_summary_heading", By.XPATH, "//*[contains(text(),'Activity Summary')]"),
    ("/activity", "activity_heatmap_heading", By.XPATH, "//*[contains(text(),'Activity Heatmap')]"),
    ("/activity", "activity_log_heading", By.XPATH, "//*[contains(text(),'Activity Log')]"),

    # Analytics (web/src/pages/Analytics.tsx)
    ("/analytics", "burnout_score_trend_heading", By.XPATH, "//*[contains(text(),'Burnout Score Trend')]"),
    ("/analytics", "all_metrics_overlay_heading", By.XPATH, "//*[contains(text(),'All Metrics Overlay')]"),
    ("/analytics", "burnout_records_region", By.CSS_SELECTOR, "[aria-label='Burnout records list']"),
    ("/analytics", "analytics_dashboard_label", By.XPATH, "//*[contains(text(),'Analytics Dashboard')]"),

    # Sleep Tracker (web/src/pages/SleepTracker.tsx) — overview tab is the default active tab
    ("/sleep", "sleep_duration_heading", By.XPATH, "//*[contains(text(),'Sleep Duration')]"),
    ("/sleep", "sleep_quality_heading", By.XPATH, "//*[contains(text(),'Sleep Quality')]"),

    # Wellness Chat (web/src/pages/WellnessChat.tsx)
    ("/chat", "coach_heading", By.XPATH, "//*[contains(text(),'BurnoutAI Wellness Coach')]"),
    ("/chat", "starter_prompt_button", By.XPATH, "//button[contains(.,'How can I improve my sleep quality?')]"),

    # Profile (web/src/pages/Profile.tsx)
    ("/profile", "personal_information_heading", By.XPATH, "//*[contains(text(),'Personal Information')]"),

    # Recommendations (web/src/pages/Recommendations.tsx)
    ("/recommendations", "overall_progress_heading", By.XPATH, "//*[contains(text(),'Overall Progress')]"),
    ("/recommendations", "high_priority_label", By.XPATH, "//*[contains(text(),'High Priority')]"),

    # Login (web/src/pages/Login.tsx)
    ("/login", "forgot_password_button", By.XPATH, "//button[contains(.,'Forgot password?')]"),
    ("/login", "ai_analysis_feature_label", By.XPATH, "//*[contains(text(),'AI Analysis')]"),
]

# Pages that only get a basic load+heading check (less UI detail available)
BASIC_PAGES = ["/phone", "/emotions", "/activity"]
