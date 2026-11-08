"""Database engine and session handling (SQLAlchemy 2.x).

SQLite is used locally. Switching to PostgreSQL only requires changing
DATABASE_URL; the models are database-agnostic.
"""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()


def _normalise(url: str) -> str:
    """Hosting providers hand out postgres:// or postgresql:// URLs; use the psycopg 3 driver for both."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


_url = _normalise(settings.database_url)

_connect_args = {"check_same_thread": False} if _url.startswith("sqlite") else {}
engine = create_engine(_url, connect_args=_connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Import every module that defines models so their tables are registered.
    from .models import contact  # noqa: F401
    from .demos.car_sales import models as car_models  # noqa: F401

    Base.metadata.create_all(bind=engine)
