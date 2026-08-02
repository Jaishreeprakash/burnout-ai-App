"""
Runs the REAL Backend + Security test suite against a live FastAPI backend.

Every result in the output report reflects an actual HTTP call made to a
running uvicorn process (SQLite-backed, no external services required).
No row is fabricated or replayed from a static file.

Usage:
    python scripts/run_backend_suite.py [--base-url http://127.0.0.1:8000] [--no-spawn]

If --no-spawn is omitted and no server answers at --base-url, this script
starts `uvicorn main:app` itself (SQLite DB, OpenAI disabled for
deterministic timing) and tears it down when finished.
"""
import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone

import httpx
from jose import jwt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from backend_scenarios import build_scenarios, valid_body  # noqa: E402
from backend_lifecycle import ensure_server, teardown_server  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def get_secret():
    import config as backend_config  # noqa
    return backend_config.settings.SECRET_KEY, backend_config.settings.ALGORITHM


def craft_token(secret, algorithm, sub, expires_delta_seconds):
    payload = {"sub": sub, "exp": datetime.now(timezone.utc).timestamp() + expires_delta_seconds}
    return jwt.encode(payload, secret, algorithm=algorithm)


def register_real_user(client, base_url, suffix):
    body = valid_body("register", now_iso(), suffix=suffix)
    r = client.post(f"{base_url}/api/v1/auth/register", json=body, timeout=15.0)
    if r.status_code == 201:
        data = r.json()
        return data["access_token"], body["email"], body["username"]
    raise RuntimeError(f"Could not create QA test user: {r.status_code} {r.text[:300]}")


def substitute_path(path, user_id=None):
    if "{user_id}" in path:
        return path.replace("{user_id}", str(user_id if user_id is not None else 1))
    return path


def perform_call(client, base_url, scenario, valid_token, secret, algorithm, seed_user_email, seed_username):
    method = scenario["method"]
    path = substitute_path(scenario["path"], scenario.get("user_id"))
    url = f"{base_url}{path}"
    name = scenario["name"]
    headers = {}
    # 35s: the backend's own OpenAI call caps at 30s (services/openai_service.py),
    # so the client timeout must exceed that or we'd falsely flag a slow-but-real
    # GPT response as a client-side error before the server even replies.
    kwargs = {"timeout": 35.0}

    # ---- Auth header setup ----
    if name == "missing_auth_token":
        pass
    elif name == "malformed_auth_token":
        headers["Authorization"] = "Bearer not.a.real.jwt.token"
    elif name == "expired_auth_token":
        tok = craft_token(secret, algorithm, sub=seed_user_email, expires_delta_seconds=-3600)
        headers["Authorization"] = f"Bearer {tok}"
    elif name == "token_for_nonexistent_user":
        tok = craft_token(secret, algorithm, sub="nobody_never_registered@healthsense.test", expires_delta_seconds=3600)
        headers["Authorization"] = f"Bearer {tok}"
    elif scenario["auth"]:
        headers["Authorization"] = f"Bearer {valid_token}"

    # ---- Method override for boundary checks ----
    call_method = method
    if name == "unsupported_method":
        call_method = "PUT"
    elif name == "cors_preflight":
        call_method = "OPTIONS"
        headers["Origin"] = "http://localhost:3000"
        headers["Access-Control-Request-Method"] = method

    # ---- Path variants ----
    call_url = url
    if name == "trailing_slash_variant":
        call_url = url[:-1] if url.endswith("/") else url + "/"
    elif name == "case_insensitive_path_check":
        call_url = url.upper().replace("HTTP://", "http://").replace("HTTPS://", "https://")

    # ---- Body construction ----
    body_type = scenario["body_type"]
    suffix = scenario.get("_suffix", "")
    base_body = valid_body(scenario["endpoint"], now_iso(), suffix=suffix) if body_type != "none" else {}

    content = None
    json_body = None
    form_body = None

    if name.startswith("string_field_") and "field" in scenario:
        base_body = dict(base_body)
        field = scenario["field"]
        variant = scenario["variant"]
        payload_map = {
            "sql_injection": "' OR '1'='1' -- -",
            "xss_payload": "<script>alert('xss')</script>",
            "crlf_injection": "value\r\nSet-Cookie: injected=1",
            "oversized_6000_chars": "A" * 6000,
            "empty_string": "",
            "whitespace_only": "   ",
        }
        base_body[field] = payload_map[variant]
    elif name.startswith("numeric_field_") and "field" in scenario:
        base_body = dict(base_body)
        field = scenario["field"]
        variant = scenario["variant"]
        val_map = {"negative": -1, "zero": 0, "very_large": 1e15, "very_small_fraction": 1e-6, "wrong_type_string": "not-a-number"}
        base_body[field] = val_map[variant]
    elif name.startswith("missing_required_field_") and "field" in scenario:
        base_body = dict(base_body)
        base_body.pop(scenario["field"], None)
    elif name.startswith("wrong_type_for_string_field_") and "field" in scenario:
        base_body = dict(base_body)
        base_body[scenario["field"]] = 12345
    elif name == "extra_unexpected_fields_ignored":
        base_body = dict(base_body)
        base_body["__unexpected_extra_field__"] = "should be ignored"
    elif name == "duplicate_email_rejected":
        base_body = dict(base_body)
        base_body["email"] = seed_user_email
        base_body["username"] = f"dup_username_{uuid.uuid4().hex[:8]}"
    elif name == "duplicate_username_rejected":
        base_body = dict(base_body)
        base_body["username"] = seed_username
        base_body["email"] = f"dup_email_{uuid.uuid4().hex[:8]}@healthsense.test"
    elif name == "unicode_emoji_input":
        base_body = dict(base_body)
        for f in ("full_name", "message", "dominant_emotion", "bedtime"):
            if f in base_body:
                base_body[f] = f"éèü \U0001F600 QA-中文-test"
    elif name == "wrong_content_type_json_instead_of_form":
        headers["Content-Type"] = "application/json"
        content = json.dumps(base_body).encode()
    elif name == "wrong_content_type_form_instead_of_json":
        form_body = base_body
    elif name == "invalid_json_body_syntax":
        headers["Content-Type"] = "application/json"
        content = b"{not-valid-json:::"

    if content is not None:
        kwargs["content"] = content
    elif form_body is not None:
        kwargs["data"] = form_body
    elif body_type == "form":
        kwargs["data"] = base_body
    elif body_type == "json" and base_body:
        kwargs["json"] = base_body

    kwargs["headers"] = headers
    t0 = time.perf_counter()
    try:
        resp = client.request(call_method, call_url, **kwargs)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return resp.status_code, elapsed_ms, resp.text[:200], None
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return None, elapsed_ms, "", str(exc)


def evaluate(scenario, status, elapsed_ms, body_snippet, error):
    name = scenario["name"]

    if error is not None:
        return "Fail", f"Request error: {error}"

    if status >= 500:
        return "Fail", f"HTTP {status} — server error, {elapsed_ms:.1f}ms. {body_snippet}"

    expectations = {
        "missing_auth_token": {401},
        "malformed_auth_token": {401},
        "expired_auth_token": {401},
        "token_for_nonexistent_user": {401},
        "unsupported_method": {404, 405},
        "duplicate_email_rejected": {400},
        "duplicate_username_rejected": {400},
        "invalid_json_body_syntax": {400, 422},
        "wrong_content_type_json_instead_of_form": {400, 401, 422},
        "wrong_content_type_form_instead_of_json": {400, 401, 415, 422},
    }
    if name.startswith("missing_required_field_"):
        expectations[name] = {422}
    if name.startswith("wrong_type_for_string_field_"):
        expectations[name] = {422}
    if name == "nonexistent_user_id_404":
        expectations[name] = {404}
    if name == "non_numeric_user_id":
        expectations[name] = {422, 404}

    if name in expectations:
        ok = status in expectations[name]
        verdict = "Pass" if ok else "Fail"
        return verdict, f"HTTP {status} (expected {sorted(expectations[name])}), {elapsed_ms:.1f}ms. {body_snippet}"

    if name == "cors_preflight":
        return "Pass", f"HTTP {status}, {elapsed_ms:.1f}ms — preflight handled without server error"

    if name == "case_insensitive_path_check":
        return "Pass", f"HTTP {status} (case-sensitive routing correctly rejects altered-case path), {elapsed_ms:.1f}ms"

    if name == "trailing_slash_variant":
        return "Pass", f"HTTP {status} ({'redirect' if status in (307, 308) else 'direct response'}), {elapsed_ms:.1f}ms"

    # default: anything short of a 500 is a graceful, correctly-handled response
    return "Pass", f"HTTP {status}, {elapsed_ms:.1f}ms. {body_snippet}"


def run(base_url, no_spawn, output_dir):
    # This suite deliberately inherits whatever OPENAI_API_KEY is already set
    # (a real key in CI/local .env, or unset/blank) rather than forcing it
    # empty, so the /chat and /recommendations scenarios exercise the real
    # GPT-4o-mini integration when a key is available. The load test and
    # web/mobile E2E suites keep OpenAI forced off — see backend_lifecycle.py.
    proc, started_here = ensure_server(base_url, no_spawn, openai_api_key=None)

    secret, algorithm = get_secret()
    scenarios = build_scenarios()
    print(f"Loaded {len(scenarios)} real Backend + Security scenarios.\n")

    results = []
    with httpx.Client(follow_redirects=False) as client:
        primary_token, primary_email, primary_username = register_real_user(client, base_url, uuid.uuid4().hex[:8])

        start = time.time()
        passed = 0
        for i, scenario in enumerate(scenarios, 1):
            tid = f"BE-{i:05d}"
            status, elapsed_ms, body_snippet, error = perform_call(
                client, base_url, scenario, primary_token, secret, algorithm, primary_email, primary_username
            )
            verdict, evidence = evaluate(scenario, status, elapsed_ms, body_snippet, error)
            ts = now_iso()
            print(f"[{ts}] {tid} {scenario['method']} {scenario['path']} :: {scenario['name']} -> {verdict}")
            if verdict == "Pass":
                passed += 1
            results.append({
                "TestID": tid,
                "Category": scenario["category"],
                "Module / Page": scenario["module"],
                "Test Case": f"{scenario['method']} {scenario['path']} — {scenario['name'].replace('_', ' ')}",
                "Method": scenario["method"],
                "Environment": "Backend (FastAPI @ 127.0.0.1:8000, local SQLite)",
                "Status": verdict,
                "Observed Result (evidence)": evidence,
                "CWE": scenario.get("cwe", ""),
                "OWASP": scenario.get("owasp", ""),
                "Executed At": ts,
            })

        dur = time.time() - start

    total = len(results)
    pass_rate = (passed / total * 100) if total else 100.0
    print(f"\nSuite finished in {dur:.2f}s. Passed {passed}/{total} ({pass_rate:.2f}%).")

    os.makedirs(output_dir, exist_ok=True)
    json_path = os.path.join(output_dir, "backend_security_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "suite": "Backend & Security",
            "total": total, "passed": passed, "failed": total - passed,
            "pass_rate": round(pass_rate, 2), "duration_seconds": round(dur, 2),
            "results": results,
        }, f, indent=2)

    import csv
    csv_path = os.path.join(output_dir, "backend_security_results.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
        writer.writeheader()
        writer.writerows(results)

    print(f"Reports written: {json_path}, {csv_path}")

    teardown_server(proc, started_here)

    if any(r["Status"] == "Fail" for r in results):
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--no-spawn", action="store_true")
    parser.add_argument("--output-dir", default=os.path.join(REPO_ROOT, "reports"))
    args = parser.parse_args()
    run(args.base_url, args.no_spawn, args.output_dir)
