# Walkthrough of Zero-State Dashboard Fix

I have completed the changes to ensure that a brand new user account starts with `0` values on the dashboard (Burnout Risk Score, Wellness Score, and component breakdown metrics) instead of displaying non-zero default scores.

## Changes Made

### 1. Burnout Analytics Router (`backend/routes/burnout.py`)
- Added a helper `_has_records(user_id, db)` that checks if the user has any tracking entries (Sleep, Phone, Emotion, Activity, or Typing).
- Modified the `/burnout/analysis` and `/burnout/assess` endpoints to check `_has_records` first.
- If no records exist, they return a zeroed `BurnoutAnalysis` response and **do not** write default/dummy `BurnoutRecord` entries to the database.

### 2. Wellness Router (`backend/routes/wellness.py`)
- Imported `TypingBehaviorRecord` to fully support check validations.
- Updated `get_wellness_score` (`/wellness/score`) to perform the same `_has_records` check.
- If no records exist, it returns a transient/mock `WellnessScore` object with all scores set to `0.0` and **does not** persist it to the database.
- Updated `has_records` check in the dashboard route to include `TypingBehaviorRecord` for completeness.
- **Latency & Timeout Fix**: Moved the `has_records` check to the very beginning of the `/wellness/dashboard` route, returning a pre-filled zero-state data structure (with the past 7 days of week names and all zero values) immediately. This completely avoids executing 28 slow database query roundtrips over the remote Supabase connection, resolving a client-side request timeout issue.

### 3. Recommendations Router (`backend/routes/recommendations.py`)
- Imported `TypingBehaviorRecord`.
- Added the `_has_records` helper.
- Updated `/`, `/quick`, `/narrative`, and `/emotion-insight` endpoints to return appropriate zero-state values (e.g. `burnout_score: 0.0`, `risk_level: "low"`, and empty list/friendly onboarding message) if the user has no tracking records.

---

Both the backend and web frontend servers have been restarted and are running in the background:
- **Backend API**: http://127.0.0.1:8000
- **Web App**: http://localhost:3000

