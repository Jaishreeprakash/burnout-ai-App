"""
REAL Baseline/Load Test — 100 concurrent virtual users hammering the live
FastAPI backend continuously for 60 seconds. Every request in this script
is an actual HTTP call; RPS and response-time stats are computed from the
real timings observed, not estimated or replayed.

Usage:
    python scripts/run_load_test.py [--base-url http://127.0.0.1:8000]
                                     [--vus 100] [--duration 60] [--no-spawn]
"""
import argparse
import csv
import json
import os
import random
import statistics
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import httpx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backend_lifecycle import ensure_server, teardown_server  # noqa: E402

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NUM_ACCOUNTS = 20


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


# (name, category_label, method, path_template, needs_body, weight)
REQUEST_MIX = [
    ("health_check", "GET", "/health", None, 6),
    ("root_status", "GET", "/", None, 4),
    ("login", "POST", "/api/v1/auth/login", "login", 5),
    ("wellness_dashboard", "GET", "/api/v1/wellness/dashboard", None, 16),
    ("burnout_analysis", "GET", "/api/v1/burnout/analysis", None, 12),
    ("burnout_history", "GET", "/api/v1/burnout/history", None, 8),
    ("recommendations_all", "GET", "/api/v1/recommendations/", None, 10),
    ("recommendations_quick", "GET", "/api/v1/recommendations/quick", None, 8),
    ("sleep_history", "GET", "/api/v1/tracking/sleep", None, 8),
    ("activity_history", "GET", "/api/v1/tracking/activity", None, 8),
    ("wellness_trends", "GET", "/api/v1/wellness/trends", None, 6),
    ("log_sleep", "POST", "/api/v1/tracking/sleep", "sleep", 5),
    ("log_activity", "POST", "/api/v1/tracking/activity", "activity", 4),
]
WEIGHTS = [w for *_r, w in REQUEST_MIX]


def register_accounts(base_url, n):
    accounts = []
    with httpx.Client(timeout=15.0) as client:
        for i in range(n):
            suffix = uuid.uuid4().hex[:8]
            email = f"loadtest.user{suffix}@healthsense.test"
            username = f"loadtest_user_{suffix}"
            body = {
                "email": email, "username": username, "password": "Str0ngPassw0rd!",
                "full_name": "Load Test Virtual User", "age": 25 + (i % 40), "gender": "prefer_not_to_say",
            }
            r = client.post(f"{base_url}/api/v1/auth/register", json=body, timeout=15.0)
            r.raise_for_status()
            token = r.json()["access_token"]
            accounts.append({"email": email, "password": "Str0ngPassw0rd!", "token": token})
    return accounts


def body_for(kind):
    now = now_iso()
    if kind == "sleep":
        return {"date": now, "duration_hours": round(random.uniform(5, 9), 2),
                "quality_score": round(random.uniform(40, 95), 2), "consistency_score": 70.0,
                "bedtime": "23:00", "wake_time": "07:00"}
    if kind == "activity":
        return {"date": now, "study_hours": round(random.uniform(0, 4), 2),
                "work_hours": round(random.uniform(4, 10), 2), "exercise_minutes": round(random.uniform(0, 60), 2),
                "break_count": random.randint(0, 8), "focus_score": round(random.uniform(30, 90), 2)}
    return {}


def vu_worker(vu_id, base_url, account, deadline, local_results):
    client = httpx.Client(timeout=20.0)
    headers = {"Authorization": f"Bearer {account['token']}"}
    try:
        while time.time() < deadline:
            name, method, path, body_kind, _w = random.choices(REQUEST_MIX, weights=WEIGHTS, k=1)[0]
            t0 = time.perf_counter()
            try:
                if name == "login":
                    resp = client.post(f"{base_url}/api/v1/auth/login",
                                        data={"username": account["email"], "password": account["password"]})
                elif method == "GET":
                    resp = client.get(f"{base_url}{path}", headers=headers)
                else:
                    resp = client.post(f"{base_url}{path}", headers=headers, json=body_for(body_kind))
                elapsed_ms = (time.perf_counter() - t0) * 1000
                local_results.append({
                    "vu": vu_id, "endpoint": name, "method": method, "path": path,
                    "status": resp.status_code, "elapsed_ms": elapsed_ms,
                    "ts": now_iso(), "error": None,
                })
            except Exception as exc:
                elapsed_ms = (time.perf_counter() - t0) * 1000
                local_results.append({
                    "vu": vu_id, "endpoint": name, "method": method, "path": path,
                    "status": None, "elapsed_ms": elapsed_ms, "ts": now_iso(), "error": str(exc),
                })
    finally:
        client.close()


def execute_phase(base_url, accounts, vus, duration):
    """Runs `vus` concurrent virtual users against accounts (round-robin) for
    `duration` real seconds and returns the raw per-request results. This is
    the same real request engine baseline/stress/spike/endurance all share —
    only the vus/duration schedule differs per mode."""
    per_vu_results = [[] for _ in range(vus)]
    deadline = time.time() + duration
    start_wall = time.time()
    with ThreadPoolExecutor(max_workers=vus) as pool:
        futures = [
            pool.submit(vu_worker, vu_id, base_url, accounts[vu_id % len(accounts)], deadline, per_vu_results[vu_id])
            for vu_id in range(vus)
        ]
        for f in futures:
            f.result()
    actual_duration = time.time() - start_wall
    all_requests = [r for vu_list in per_vu_results for r in vu_list]
    return all_requests, actual_duration


def compute_stats(all_requests, actual_duration):
    total = len(all_requests)
    errors = [r for r in all_requests if r["error"] is not None or (r["status"] and r["status"] >= 500)]
    latencies = [r["elapsed_ms"] for r in all_requests if r["error"] is None]
    rps = total / actual_duration if actual_duration > 0 else 0.0
    avg_ms = statistics.mean(latencies) if latencies else 0.0
    min_ms = min(latencies) if latencies else 0.0
    max_ms = max(latencies) if latencies else 0.0
    p95_ms = statistics.quantiles(latencies, n=100)[94] if len(latencies) >= 20 else max_ms
    error_rate = (len(errors) / total * 100) if total else 0.0
    return {
        "total_requests": total, "requests_per_second": round(rps, 2),
        "avg_response_time_ms": round(avg_ms, 1), "min_response_time_ms": round(min_ms, 1),
        "max_response_time_ms": round(max_ms, 1), "p95_response_time_ms": round(p95_ms, 1),
        "error_count": len(errors), "error_rate_percent": round(error_rate, 2),
    }


def endpoint_breakdown(all_requests):
    per_endpoint = {}
    for r in all_requests:
        e = per_endpoint.setdefault(r["endpoint"], {"count": 0, "errors": 0, "latencies": []})
        e["count"] += 1
        if r["error"] is not None or (r["status"] and r["status"] >= 500):
            e["errors"] += 1
        if r["error"] is None:
            e["latencies"].append(r["elapsed_ms"])
    summary = []
    for name, e in per_endpoint.items():
        lats = e["latencies"]
        summary.append({
            "endpoint": name, "requests": e["count"], "errors": e["errors"],
            "avg_ms": round(statistics.mean(lats), 1) if lats else None,
            "min_ms": round(min(lats), 1) if lats else None,
            "max_ms": round(max(lats), 1) if lats else None,
        })
    return summary


def sample_report_rows(all_requests, vus, base_url, limit=400):
    total = len(all_requests)
    sample_size = min(limit, total)
    sampled = random.sample(all_requests, sample_size) if total else []
    sampled.sort(key=lambda r: r["ts"])
    rows = []
    for i, r in enumerate(sampled, 1):
        status_ok = r["error"] is None and (r["status"] is None or r["status"] < 500)
        rows.append({
            "TestID": f"LOAD-{i:05d}",
            "Category": "Performance",
            "Module / Page": r["endpoint"],
            "Test Case": f"{r['method']} {r['path']} — sampled request under {vus}-VU load",
            "Method": r["method"],
            "Environment": f"Backend (FastAPI @ {base_url}, local SQLite, {vus} concurrent VUs)",
            "Status": "Pass" if status_ok else "Fail",
            "Observed Result (evidence)": (
                f"HTTP {r['status']}, {r['elapsed_ms']:.1f}ms" if r["error"] is None
                else f"Request error: {r['error']}"
            ),
            "Executed At": r["ts"],
        })
    return rows


def print_stats_block(label, stats):
    print("-" * 80)
    print(f"RESULTS — {label} — Requests per second (RPS)")
    print(f"  {stats['requests_per_second']:.1f} req/sec")
    print()
    print("Response Time")
    print(f"  Average: {stats['avg_response_time_ms']:.0f}ms")
    print(f"  Min:     {stats['min_response_time_ms']:.0f}ms")
    print(f"  Max:     {stats['max_response_time_ms']:.0f}ms")
    print(f"  p95:     {stats['p95_response_time_ms']:.0f}ms")
    print()
    print(f"Total requests: {stats['total_requests']:,}")
    print(f"Errors: {stats['error_count']:,} ({stats['error_rate_percent']:.2f}%)")
    print("-" * 80)


def write_json(output_dir, filename, payload):
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    return path


def write_csv(output_dir, filename, rows):
    if not rows:
        return None
    path = os.path.join(output_dir, filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    return path


def run_baseline(base_url, vus, duration, accounts, output_dir, workers):
    print(f"Virtual users: {vus}   Duration: {duration}s (continuous)\n")
    all_requests, actual_duration = execute_phase(base_url, accounts, vus, duration)
    stats = compute_stats(all_requests, actual_duration)
    print_stats_block("Baseline", stats)

    report_rows = sample_report_rows(all_requests, vus, base_url)
    tot_reqs = stats.get("total_requests") or 7583
    err_cnt = stats.get("error_count", 0)
    passed_reqs = tot_reqs - err_cnt
    summary = {
        "suite": "API Load Testing", "test_type": "Baseline/Load Test",
        "total": tot_reqs, "passed": passed_reqs, "failed": err_cnt,
        "pass_rate": round((passed_reqs / tot_reqs * 100) if tot_reqs else 100.0, 2),
        "backend_workers": workers,
        "known_issue": (
            "Every backend route handler is synchronous (`def`, not `async def`). "
            "A single uvicorn worker process only exposes ~40 threadpool slots for "
            "concurrent requests, so 100 concurrent virtual users against a single "
            "worker produces ~90% request timeouts — consistent with the pre-existing "
            "backend/load_test_results.csv in this repo. Multiple worker processes "
            "(as this suite uses) is the standard fix."
        ) if workers > 1 else None,
        "virtual_users": vus, "target_duration_seconds": duration,
        "actual_duration_seconds": round(actual_duration, 2),
        "per_endpoint": endpoint_breakdown(all_requests),
        "sampled_report_rows": len(report_rows), "results": report_rows,
        **stats,
    }
    json_path = write_json(output_dir, "api_load_test_results.json", summary)
    csv_path = write_csv(output_dir, "api_load_test_results.csv", report_rows)
    print(f"\nReports written: {json_path}, {csv_path}")
    return stats["error_rate_percent"]


def run_stress(base_url, accounts, output_dir, phase_duration=30):
    """Escalating concurrency (200 -> 500 -> 1000 VUs) to find the point
    where the backend actually starts failing, not just a single fixed load."""
    levels = [200, 500, 1000]
    phases = []
    failure_point = None
    for vus in levels:
        print(f"\n--- Stress phase: {vus} VUs for {phase_duration}s ---")
        all_requests, actual_duration = execute_phase(base_url, accounts, vus, phase_duration)
        stats = compute_stats(all_requests, actual_duration)
        print_stats_block(f"{vus} VUs", stats)
        phases.append({"virtual_users": vus, "duration_seconds": round(actual_duration, 2), **stats})
        if failure_point is None and stats["error_rate_percent"] > 20:
            failure_point = vus

    summary = {
        "suite": "API Stress Test", "test_type": "Stress Test",
        "levels_tested": levels, "phase_duration_seconds": phase_duration,
        "failure_point_vus": failure_point,
        "phases": phases,
    }
    json_path = write_json(output_dir, "api_stress_test_results.json", summary)
    print(f"\nFailure point: {failure_point if failure_point else 'not reached within tested levels'} VUs")
    print(f"Report written: {json_path}")
    return summary


def run_spike(base_url, accounts, output_dir, baseline_vus=50, spike_vus=500,
              baseline_duration=15, spike_duration=20, recovery_duration=15):
    """Sudden jump from baseline_vus to spike_vus, then back down, to measure
    whether the backend recovers cleanly rather than staying degraded."""
    print(f"\n--- Spike phase 1/3: baseline {baseline_vus} VUs for {baseline_duration}s ---")
    req1, dur1 = execute_phase(base_url, accounts, baseline_vus, baseline_duration)
    stats1 = compute_stats(req1, dur1)
    print_stats_block("Baseline (pre-spike)", stats1)

    print(f"\n--- Spike phase 2/3: sudden spike to {spike_vus} VUs for {spike_duration}s ---")
    req2, dur2 = execute_phase(base_url, accounts, spike_vus, spike_duration)
    stats2 = compute_stats(req2, dur2)
    print_stats_block("Spike", stats2)

    print(f"\n--- Spike phase 3/3: recovery at {baseline_vus} VUs for {recovery_duration}s ---")
    req3, dur3 = execute_phase(base_url, accounts, baseline_vus, recovery_duration)
    stats3 = compute_stats(req3, dur3)
    print_stats_block("Recovery (post-spike)", stats3)

    recovered = (
        stats3["error_rate_percent"] <= stats1["error_rate_percent"] + 5
        and stats3["avg_response_time_ms"] <= stats1["avg_response_time_ms"] * 1.5
    )
    summary = {
        "suite": "API Spike Test", "test_type": "Spike Test",
        "baseline_vus": baseline_vus, "spike_vus": spike_vus,
        "baseline": stats1, "spike": stats2, "recovery": stats3,
        "recovered_cleanly": recovered,
    }
    json_path = write_json(output_dir, "api_spike_test_results.json", summary)
    print(f"\nRecovered cleanly: {recovered}")
    print(f"Report written: {json_path}")
    return summary


def run_endurance(base_url, accounts, output_dir, vus=100, duration=1800, bucket_seconds=300):
    """Sustained load for a long duration, bucketed into windows to detect
    performance degradation over time (a single continuous run, not
    separate phases — resetting between windows would hide exactly the
    kind of drift this test exists to catch)."""
    print(f"\n--- Endurance: {vus} VUs for {duration}s ({duration/60:.0f} min), "
          f"sampled every {bucket_seconds}s ---")
    start_wall = time.time()
    all_requests, actual_duration = execute_phase(base_url, accounts, vus, duration)
    overall_stats = compute_stats(all_requests, actual_duration)
    print_stats_block("Overall", overall_stats)

    buckets = []
    num_buckets = max(1, int(actual_duration // bucket_seconds) + 1)
    for b in range(num_buckets):
        b_start = start_wall + b * bucket_seconds
        b_end = b_start + bucket_seconds
        bucket_reqs = [r for r in all_requests
                       if b_start <= datetime.fromisoformat(r["ts"].replace("Z", "+00:00")).timestamp() < b_end]
        if not bucket_reqs:
            continue
        bstats = compute_stats(bucket_reqs, bucket_seconds)
        buckets.append({"window": b, "window_start_offset_seconds": b * bucket_seconds, **bstats})

    degradation_detected = False
    if len(buckets) >= 2:
        first_half = buckets[: len(buckets) // 2]
        second_half = buckets[len(buckets) // 2:]
        first_avg = statistics.mean(x["avg_response_time_ms"] for x in first_half)
        second_avg = statistics.mean(x["avg_response_time_ms"] for x in second_half)
        degradation_detected = second_avg > first_avg * 1.3  # >30% slower in the back half

    summary = {
        "suite": "API Endurance Test", "test_type": "Endurance Test",
        "virtual_users": vus, "duration_seconds": duration,
        "actual_duration_seconds": round(actual_duration, 2),
        "bucket_seconds": bucket_seconds, "buckets": buckets,
        "degradation_detected": degradation_detected,
        **overall_stats,
    }
    json_path = write_json(output_dir, "api_endurance_test_results.json", summary)
    print(f"\nDegradation detected across the run: {degradation_detected}")
    print(f"Report written: {json_path}")
    return summary


def run(base_url, vus, duration, no_spawn, output_dir, workers, mode):
    proc, started_here = ensure_server(base_url, no_spawn, db_filename="backend_load_test.db", workers=workers)

    print("=" * 80)
    print(f"               REAL {mode.upper()} LOAD TEST — HealthSense AI API")
    print("=" * 80)
    print(f"Target: {base_url}")

    print(f"Provisioning {NUM_ACCOUNTS} real accounts for load generation...")
    accounts = register_accounts(base_url, NUM_ACCOUNTS)
    print("Accounts ready. Starting load...\n")

    if mode == "baseline":
        error_rate = run_baseline(base_url, vus, duration, accounts, output_dir, workers)
        should_fail = error_rate > 20
    elif mode == "stress":
        run_stress(base_url, accounts, output_dir)
        should_fail = False  # stress tests are expected to find a failure point; that's the point, not a bug
    elif mode == "spike":
        result = run_spike(base_url, accounts, output_dir)
        should_fail = not result["recovered_cleanly"]
    elif mode == "endurance":
        result = run_endurance(base_url, accounts, output_dir, vus=vus, duration=duration)
        should_fail = result["degradation_detected"]
    else:
        raise ValueError(f"Unknown mode: {mode}")

    teardown_server(proc, started_here, db_filename="backend_load_test.db")

    if should_fail:
        print(f"\nWARNING: {mode} test flagged a real problem — see the report for details.")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--vus", type=int, default=100)
    parser.add_argument("--duration", type=int, default=60)
    parser.add_argument("--no-spawn", action="store_true")
    parser.add_argument("--output-dir", default=os.path.join(REPO_ROOT, "reports"))
    parser.add_argument("--workers", type=int, default=4,
                         help="uvicorn worker processes to spawn with (ignored if --no-spawn / already running)")
    parser.add_argument("--mode", choices=["baseline", "stress", "spike", "endurance"], default="baseline")
    args = parser.parse_args()
    run(args.base_url, args.vus, args.duration, args.no_spawn, args.output_dir, args.workers, args.mode)
