import time

from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from config import settings

db_url = settings.effective_database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

is_sqlite = db_url.startswith("sqlite")
# timeout=30: how long sqlite3 waits for a lock before raising "database is
# locked", instead of the 5s default — under concurrent writers (multiple
# uvicorn workers sharing one file) that default was surfacing as real 500s
# under load rather than just queuing briefly.
if is_sqlite:
    connect_args = {"check_same_thread": False, "timeout": 30}
else:
    # connect_timeout: bounds how long a single connection attempt can take
    # (DNS failure, unreachable host, wrong credentials after a config
    # change) before psycopg2 gives up and raises -- without this, a broken
    # DATABASE_URL can hang a request (including /health) indefinitely
    # instead of failing fast with a clear error.
    connect_args = {"connect_timeout": 10}

# pool_pre_ping tests each connection with a cheap query before handing it to
# the app, so a connection the remote DB has silently dropped (idle timeout,
# transient DNS blip) gets transparently replaced instead of surfacing as a
# 500 mid-request. pool_recycle proactively retires connections before cloud
# load balancers (e.g. Supabase's pooler) tend to close them.
engine_kwargs = {"connect_args": connect_args, "pool_pre_ping": True}
if not is_sqlite:
    if ":6543" in db_url:
        # Use NullPool for Transaction Pooler to avoid conflicts and socket hangs
        engine_kwargs.update(poolclass=NullPool)
    else:
        engine_kwargs.update(pool_size=20, max_overflow=30, pool_recycle=280, pool_timeout=30)

engine = create_engine(db_url, **engine_kwargs)

if is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, _record):
        # WAL mode lets readers and writers proceed concurrently instead of
        # blocking each other on SQLite's default rollback journal — the
        # single biggest lever for reducing "database is locked" under
        # concurrent load. synchronous=NORMAL is the standard pairing with
        # WAL (still durable against app crashes, just not an OS-level power
        # loss mid-write, an acceptable tradeoff here).
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    # Retry session acquisition a few times with backoff so a transient DB
    # connectivity blip (dropped connection, brief DNS failure) doesn't
    # immediately fail every in-flight request with a 500.
    attempts = 3
    for attempt in range(attempts):
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            break
        except OperationalError:
            db.close()
            if attempt == attempts - 1:
                raise
            time.sleep(0.5 * (attempt + 1))
    try:
        yield db
    finally:
        db.close()
