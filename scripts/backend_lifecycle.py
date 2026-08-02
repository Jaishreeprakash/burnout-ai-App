"""Shared helpers for starting/waiting-on the real FastAPI backend used by
the test suites in this scripts/ folder. Every suite that needs a live
backend (functional/security tests, load tests) uses the same spawn logic
so behavior (SQLite DB, disabled OpenAI key) is consistent across suites."""
import os
import subprocess
import sys
import time

import httpx

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")


def wait_for_health(base_url, timeout=45):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = httpx.get(f"{base_url}/health", timeout=2.0)
            if r.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def _precreate_schema(env):
    """Create all tables in a single process before any multi-worker uvicorn
    starts. main.py's lifespan handler calls Base.metadata.create_all() on
    every worker process independently — with --workers > 1 that's N
    processes racing to CREATE TABLE against the same SQLite file at once.
    Confirmed in CI: intermittent ~80% error rate with every failing request
    erroring instantly (not slow), consistent with one or more workers
    losing that race at startup and never coming up cleanly. Creating the
    schema once, up front, removes the race entirely."""
    subprocess.run(
        [sys.executable, "-c",
         "import models.user, models.tracking; from database import Base, engine; "
         "Base.metadata.create_all(bind=engine)"],
        cwd=BACKEND_DIR, env=env, check=True,
    )


def spawn_server(base_url, db_filename="backend_ci_test.db", workers=1, openai_api_key=""):
    port = base_url.rsplit(":", 1)[-1]
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///./{db_filename}"
    if openai_api_key is not None:
        # "" forces the deterministic smart-engine fallback (no upstream network
        # calls) — used by suites that aren't specifically testing the OpenAI
        # integration (load test, web/mobile E2E). Passing None instead inherits
        # whatever OPENAI_API_KEY is already in the environment (a real secret in
        # CI, or whatever's in backend/.env locally), for suites that want to
        # exercise the real GPT-4o-mini path.
        env["OPENAI_API_KEY"] = openai_api_key
    db_path = os.path.join(BACKEND_DIR, db_filename)
    if os.path.exists(db_path):
        os.remove(db_path)
    cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", port]
    if workers > 1:
        # Every route handler here is a synchronous `def`, so a single uvicorn
        # worker only has ~40 threadpool slots for concurrent requests — under
        # real concurrent load (see run_load_test.py) that queues and times
        # out well before 100 concurrent users. Multiple worker processes is
        # the standard fix and is required for a meaningful load-test result.
        cmd += ["--workers", str(workers)]
        _precreate_schema(env)
    proc = subprocess.Popen(
        cmd, cwd=BACKEND_DIR, env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return proc


def ensure_server(base_url, no_spawn, db_filename="backend_ci_test.db", workers=1, openai_api_key=""):
    """Returns (proc_or_None, started_here_bool). Exits the process on failure."""
    if not no_spawn and not wait_for_health(base_url, timeout=1.5):
        ai_desc = "OpenAI disabled" if openai_api_key == "" else "OpenAI enabled" if openai_api_key else "OpenAI inherited from environment"
        print(f"No backend detected at {base_url} — starting uvicorn locally (SQLite, {ai_desc}, {workers} worker(s))...")
        proc = spawn_server(base_url, db_filename, workers=workers, openai_api_key=openai_api_key)
        if not wait_for_health(base_url, timeout=45):
            proc.terminate()
            print("Backend failed to start within 45s.")
            sys.exit(1)
        print("Backend is up.")
        return proc, True
    elif not wait_for_health(base_url, timeout=90):
        # 90s, not a quick fail: with --no-spawn this is usually the live Render
        # backend, which spins down on the free tier after inactivity and can
        # take 30-60s+ to cold-start on the first request.
        print(f"No backend reachable at {base_url} and --no-spawn was set. Aborting.")
        sys.exit(1)
    return None, False


def teardown_server(proc, started_here, db_filename="backend_ci_test.db"):
    if started_here and proc:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()
        # With --workers > 1, uvicorn's child worker processes can hold the
        # SQLite file open for a moment after the parent process exits
        # (especially on Windows) — retry briefly rather than crash on cleanup.
        db_path = os.path.join(BACKEND_DIR, db_filename)
        for attempt in range(5):
            if not os.path.exists(db_path):
                break
            try:
                os.remove(db_path)
                break
            except OSError:
                time.sleep(1)
