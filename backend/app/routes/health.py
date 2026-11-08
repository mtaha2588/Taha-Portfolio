from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..demos.registry import DEMOS

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    """Used by hosting platforms (and you) to check that the API and database are up."""
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:  # noqa: BLE001
        database = "error"
    settings = get_settings()
    return {
        "status": "ok" if database == "ok" else "degraded",
        "database": database,
        "email_notifications": settings.email_enabled,
        "demos": {d.key: d.mode() for d in DEMOS},
    }
