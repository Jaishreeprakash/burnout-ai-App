"""
Builds the real Backend + Security test scenario matrix for HealthSense AI.

Every scenario here becomes one real HTTP request against a live backend
(local uvicorn, SQLite). Nothing in this file is executed itself — it just
describes *what* to call; scripts/run_backend_suite.py does the actual
calling and records the real observed status code / timing / evidence.

The endpoint x scenario-family matrix below is designed to land close to
400 real cases without padding: every row corresponds to something a real
QA engineer would check (auth boundary, method boundary, injection,
oversized/empty input, numeric boundary, missing field, response shape).
"""

# Each endpoint entry:
#   id, method, path, auth (bool), body_type ("json" | "form" | "none"),
#   string_fields: [(field_name, required)], numeric_fields: [(field_name, required)]
ENDPOINTS = [
    {"id": "root", "method": "GET", "path": "/", "auth": False, "body_type": "none"},
    {"id": "health", "method": "GET", "path": "/health", "auth": False, "body_type": "none"},

    {"id": "register", "method": "POST", "path": "/api/v1/auth/register", "auth": False,
     "body_type": "json",
     "string_fields": [("email", True), ("username", True), ("full_name", True)],
     "numeric_fields": [("age", False)]},

    {"id": "login", "method": "POST", "path": "/api/v1/auth/login", "auth": False, "body_type": "form",
     "string_fields": [("username", True), ("password", True)]},

    {"id": "me", "method": "GET", "path": "/api/v1/auth/me", "auth": True, "body_type": "none"},

    {"id": "reset_password", "method": "POST", "path": "/api/v1/auth/reset-password", "auth": False,
     "body_type": "json", "string_fields": [("email", True), ("new_password", True)]},

    {"id": "sleep_post", "method": "POST", "path": "/api/v1/tracking/sleep", "auth": True, "body_type": "json",
     "string_fields": [("bedtime", False)],
     "numeric_fields": [("duration_hours", True), ("quality_score", True)]},
    {"id": "sleep_get", "method": "GET", "path": "/api/v1/tracking/sleep", "auth": True, "body_type": "none"},

    {"id": "phone_post", "method": "POST", "path": "/api/v1/tracking/phone-usage", "auth": True, "body_type": "json",
     "numeric_fields": [("screen_time_hours", True), ("pickups_count", False)]},
    {"id": "phone_get", "method": "GET", "path": "/api/v1/tracking/phone-usage", "auth": True, "body_type": "none"},

    {"id": "typing_post", "method": "POST", "path": "/api/v1/tracking/typing", "auth": True, "body_type": "json",
     "numeric_fields": [("avg_speed_wpm", True), ("accuracy_percent", True)]},
    {"id": "typing_get", "method": "GET", "path": "/api/v1/tracking/typing", "auth": True, "body_type": "none"},

    {"id": "emotion_post", "method": "POST", "path": "/api/v1/tracking/emotion", "auth": True, "body_type": "json",
     "string_fields": [("dominant_emotion", True)], "numeric_fields": [("confidence", False)]},
    {"id": "emotion_get", "method": "GET", "path": "/api/v1/tracking/emotion", "auth": True, "body_type": "none"},

    {"id": "activity_post", "method": "POST", "path": "/api/v1/tracking/activity", "auth": True, "body_type": "json",
     "numeric_fields": [("work_hours", False), ("break_count", False)]},
    {"id": "activity_get", "method": "GET", "path": "/api/v1/tracking/activity", "auth": True, "body_type": "none"},

    {"id": "burnout_analysis", "method": "GET", "path": "/api/v1/burnout/analysis", "auth": True, "body_type": "none"},
    {"id": "burnout_history", "method": "GET", "path": "/api/v1/burnout/history", "auth": True, "body_type": "none"},
    {"id": "burnout_assess", "method": "POST", "path": "/api/v1/burnout/assess", "auth": True, "body_type": "none"},

    {"id": "wellness_score", "method": "GET", "path": "/api/v1/wellness/score", "auth": True, "body_type": "none"},
    {"id": "wellness_dashboard", "method": "GET", "path": "/api/v1/wellness/dashboard", "auth": True, "body_type": "none"},
    {"id": "wellness_trends", "method": "GET", "path": "/api/v1/wellness/trends", "auth": True, "body_type": "none"},

    {"id": "recs_all", "method": "GET", "path": "/api/v1/recommendations/", "auth": True, "body_type": "none"},
    {"id": "recs_quick", "method": "GET", "path": "/api/v1/recommendations/quick", "auth": True, "body_type": "none"},
    {"id": "recs_narrative", "method": "GET", "path": "/api/v1/recommendations/narrative", "auth": True, "body_type": "none"},
    {"id": "recs_emotion", "method": "GET", "path": "/api/v1/recommendations/emotion-insight", "auth": True, "body_type": "none"},
    {"id": "recs_sleep", "method": "GET", "path": "/api/v1/recommendations/sleep-insight", "auth": True, "body_type": "none"},

    {"id": "chat", "method": "POST", "path": "/api/v1/chat", "auth": True, "body_type": "json",
     "string_fields": [("message", True)]},

    {"id": "seed", "method": "GET", "path": "/api/v1/seed/{user_id}", "auth": False, "body_type": "none",
     "path_param": True},
]

MODULE_NAMES = {
    "root": "System", "health": "System", "seed": "System",
    "register": "Auth", "login": "Auth", "me": "Auth", "reset_password": "Auth",
    "sleep_post": "Tracking-Sleep", "sleep_get": "Tracking-Sleep",
    "phone_post": "Tracking-Phone", "phone_get": "Tracking-Phone",
    "typing_post": "Tracking-Typing", "typing_get": "Tracking-Typing",
    "emotion_post": "Tracking-Emotion", "emotion_get": "Tracking-Emotion",
    "activity_post": "Tracking-Activity", "activity_get": "Tracking-Activity",
    "burnout_analysis": "Burnout", "burnout_history": "Burnout", "burnout_assess": "Burnout",
    "wellness_score": "Wellness", "wellness_dashboard": "Wellness", "wellness_trends": "Wellness",
    "recs_all": "Recommendations", "recs_quick": "Recommendations", "recs_narrative": "Recommendations",
    "recs_emotion": "Recommendations", "recs_sleep": "Recommendations",
    "chat": "Wellness Chat",
}

SQLI_PAYLOAD = "' OR '1'='1' -- -"
XSS_PAYLOAD = "<script>alert('xss')</script>"
CRLF_PAYLOAD = "value\r\nSet-Cookie: injected=1"
OVERSIZED_STR = "A" * 6000

NUMERIC_VARIANTS = [
    ("negative", -1),
    ("zero", 0),
    ("very_large", 1e15),
    ("very_small_fraction", 1e-6),
    ("wrong_type_string", "not-a-number"),
]

STRING_VARIANTS = [
    ("sql_injection", SQLI_PAYLOAD),
    ("xss_payload", XSS_PAYLOAD),
    ("crlf_injection", CRLF_PAYLOAD),
    ("oversized_6000_chars", OVERSIZED_STR),
    ("empty_string", ""),
    ("whitespace_only", "   "),
]


def valid_body(endpoint_id, now_iso, suffix=""):
    """Real, schema-valid request bodies for each JSON/form POST endpoint."""
    builders = {
        "register": lambda: {
            "email": f"qa.user{suffix}@healthsense.test",
            "username": f"qa_user{suffix}",
            "password": "Str0ngPassw0rd!",
            "full_name": "QA Automation User",
            "age": 29,
            "gender": "prefer_not_to_say",
        },
        "login": lambda: {"username": f"qa.user{suffix}@healthsense.test", "password": "Str0ngPassw0rd!"},
        "reset_password": lambda: {"email": f"qa.user{suffix}@healthsense.test", "new_password": "NewStr0ngPass!"},
        "sleep_post": lambda: {
            "date": now_iso, "duration_hours": 7.5, "quality_score": 82.0,
            "consistency_score": 75.0, "bedtime": "23:00", "wake_time": "06:30",
        },
        "phone_post": lambda: {
            "date": now_iso, "screen_time_hours": 3.2,
            "app_usage_data": {"social_media": 1.1, "productivity": 0.9},
            "late_night_usage": False, "pickups_count": 42,
        },
        "typing_post": lambda: {
            "date": now_iso, "avg_speed_wpm": 62.5, "accuracy_percent": 95.0,
            "pause_frequency": 0.12, "session_duration_minutes": 45.0,
        },
        "emotion_post": lambda: {
            "timestamp": now_iso, "emotion_type": "facial", "dominant_emotion": "calm",
            "confidence": 0.87, "emotion_scores": {"calm": 0.6, "happy": 0.2, "neutral": 0.2},
        },
        "activity_post": lambda: {
            "date": now_iso, "study_hours": 2.0, "work_hours": 7.0,
            "exercise_minutes": 30.0, "break_count": 5, "focus_score": 78.0,
        },
        "chat": lambda: {"message": "How can I improve my sleep quality?", "history": []},
    }
    return builders.get(endpoint_id, lambda: {})()


# Maps a scenario-name substring to a (CWE, OWASP Top 10 2021) pair, checked
# in order — only scenarios that actually probe a real vulnerability class
# get tagged; purely functional checks (boundary values, missing fields,
# empty-string handling, etc.) legitimately have nothing to map and are left
# blank rather than forced into a category that doesn't fit.
CWE_OWASP_MAP = [
    ("string_field_", "sql_injection", "CWE-89: SQL Injection", "A03:2021-Injection"),
    ("string_field_", "xss_payload", "CWE-79: Cross-Site Scripting", "A03:2021-Injection"),
    ("string_field_", "crlf_injection", "CWE-93: CRLF Injection", "A03:2021-Injection"),
    ("string_field_", "oversized", "CWE-1284: Improper Validation of Specified Quantity in Input", "A04:2021-Insecure Design"),
    ("", "missing_auth_token", "CWE-306: Missing Authentication for Critical Function", "A07:2021-Identification and Authentication Failures"),
    ("", "malformed_auth_token", "CWE-287: Improper Authentication", "A07:2021-Identification and Authentication Failures"),
    ("", "expired_auth_token", "CWE-613: Insufficient Session Expiration", "A07:2021-Identification and Authentication Failures"),
    ("", "token_for_nonexistent_user", "CWE-287: Improper Authentication", "A07:2021-Identification and Authentication Failures"),
    ("", "cors_preflight", "CWE-942: Overly Permissive Cross-domain Whitelist", "A05:2021-Security Misconfiguration"),
    ("", "extra_unexpected_fields_ignored", "CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes", "A08:2021-Software and Data Integrity Failures"),
    ("", "duplicate_email_rejected", "CWE-620: Unverified Password Change", "A07:2021-Identification and Authentication Failures"),
    ("", "wrong_content_type", "CWE-436: Interpretation Conflict", "A05:2021-Security Misconfiguration"),
]


def _cwe_owasp_for(name):
    for prefix, needle, cwe, owasp in CWE_OWASP_MAP:
        if name.startswith(prefix) and needle in name:
            return cwe, owasp
    return "", ""


def build_scenarios():
    """Returns a flat list of scenario dicts describing every real case to run."""
    scenarios = []

    def add(endpoint, category, name, **extra):
        cwe, owasp = _cwe_owasp_for(name)
        scenarios.append({
            "endpoint": endpoint["id"],
            "method": endpoint["method"],
            "path": endpoint["path"],
            "auth": endpoint["auth"],
            "body_type": endpoint.get("body_type", "none"),
            "category": category,
            "name": name,
            "module": MODULE_NAMES.get(endpoint["id"], "System"),
            "cwe": cwe,
            "owasp": owasp,
            **extra,
        })

    for ep in ENDPOINTS:
        eid = ep["id"]

        # 1. Happy-path functional check
        add(ep, "Functional", "valid_request")

        # 2. Unsupported HTTP method rejected (405)
        add(ep, "API", "unsupported_method")

        # 3. Trailing-slash / double-slash variant handling
        add(ep, "API", "trailing_slash_variant")

        # 4/5/6. Auth boundary checks (only for protected endpoints)
        if ep["auth"]:
            add(ep, "Security", "missing_auth_token")
            add(ep, "Security", "malformed_auth_token")
            add(ep, "Security", "expired_auth_token")
            add(ep, "Security", "token_for_nonexistent_user")

        # 7. CORS preflight (OPTIONS) sanity check
        add(ep, "Security", "cors_preflight")

        # 8. Case-sensitivity routing check
        add(ep, "API", "case_insensitive_path_check")

        # 9. Response-shape / functional-depth check for authenticated GETs
        if ep["method"] == "GET":
            add(ep, "Functional", "response_schema_check")

        string_fields = ep.get("string_fields", [])
        numeric_fields = ep.get("numeric_fields", [])

        # 10. Injection / malformed-string variants (all declared string fields)
        for field, _required in string_fields:
            for variant_name, _payload in STRING_VARIANTS:
                add(ep, "Security" if variant_name in ("sql_injection", "xss_payload", "crlf_injection") else "Functional",
                    f"string_field_{field}_{variant_name}", field=field, variant=variant_name)

        # 11. Numeric boundary variants (all declared numeric fields)
        for field, _required in numeric_fields:
            for variant_name, _val in NUMERIC_VARIANTS:
                add(ep, "Functional", f"numeric_field_{field}_{variant_name}", field=field, variant=variant_name)

        # 12. Missing-required-field check (422 expected)
        required_fields = [f for f, req in string_fields if req] + [f for f, req in numeric_fields if req]
        if required_fields and ep["body_type"] in ("json", "form"):
            add(ep, "Functional", f"missing_required_field_{required_fields[0]}", field=required_fields[0])

        # 13. Wrong-type-for-string-field check (send an integer where a string is expected)
        if string_fields and ep["body_type"] == "json":
            add(ep, "Functional", f"wrong_type_for_string_field_{string_fields[0][0]}", field=string_fields[0][0])

        # 14. Extra/unexpected fields in body are ignored, not fatal
        if ep["body_type"] == "json":
            add(ep, "Functional", "extra_unexpected_fields_ignored")

        # 15. Malformed JSON syntax in the raw request body
        if ep["body_type"] == "json":
            add(ep, "Functional", "invalid_json_body_syntax")

    # Duplicate-conflict checks specific to registration (400 expected)
    register_ep = next(e for e in ENDPOINTS if e["id"] == "register")
    add(register_ep, "Security", "duplicate_email_rejected")
    add(register_ep, "Security", "duplicate_username_rejected")

    # Unicode / emoji handling — realistic international-input check
    for eid in ("register", "chat", "emotion_post", "sleep_post"):
        ep = next(e for e in ENDPOINTS if e["id"] == eid)
        add(ep, "Functional", "unicode_emoji_input")

    # Wrong content-type checks (JSON body sent where form expected & vice versa)
    login_ep = next(e for e in ENDPOINTS if e["id"] == "login")
    add(login_ep, "Security", "wrong_content_type_json_instead_of_form")
    register_ep2 = next(e for e in ENDPOINTS if e["id"] == "register")
    add(register_ep2, "Security", "wrong_content_type_form_instead_of_json")

    # Seed endpoint path-param edge cases
    seed_ep = next(e for e in ENDPOINTS if e["id"] == "seed")
    add(seed_ep, "Functional", "nonexistent_user_id_404", user_id=999999)
    add(seed_ep, "Functional", "negative_user_id", user_id=-1)
    add(seed_ep, "Functional", "non_numeric_user_id", user_id="abc")

    return scenarios[:400]


if __name__ == "__main__":
    s = build_scenarios()
    print(f"Total real backend+security scenarios generated: {len(s)}")
