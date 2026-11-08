import logging
import secrets

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import SessionLocal, get_db
from ..models.contact import ContactMessage
from ..schemas.contact import ContactAccepted, ContactCreate, ContactRecord
from ..services.email_service import send_contact_notification
from ..services.rate_limit import client_ip, contact_limiter
from ..services.sanitize import spam_reason

router = APIRouter(prefix="/api/contact", tags=["contact"])
logger = logging.getLogger("portfolio.contact")


def _notify_and_record(message_id: int, payload: dict) -> None:
    sent = send_contact_notification(message_id=message_id, **payload)
    if sent:
        with SessionLocal() as db:
            record = db.get(ContactMessage, message_id)
            if record:
                record.email_sent = True
                db.commit()


@router.post("", response_model=ContactAccepted, status_code=status.HTTP_201_CREATED)
def submit_contact(
    data: ContactCreate,
    request: Request,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> ContactAccepted:
    ip = client_ip(request)
    contact_limiter.check(f"contact:{ip}")

    reason = spam_reason(honeypot=data.website, elapsed_ms=data.elapsed_ms)
    if reason:
        # Look successful to bots so they don't adapt, but store nothing.
        logger.info("Discarded likely spam contact submission (%s) from %s", reason, ip)
        return ContactAccepted()

    record = ContactMessage(
        name=data.name,
        email=str(data.email).lower(),
        company=data.company,
        message=data.message,
        ip_address=ip,
        user_agent=(request.headers.get("user-agent") or "")[:300] or None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    background.add_task(
        _notify_and_record,
        record.id,
        {"name": record.name, "email": record.email, "company": record.company, "message": record.message},
    )
    return ContactAccepted()


@router.get("/messages", response_model=list[ContactRecord])
def list_messages(
    x_admin_key: str | None = Header(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[ContactMessage]:
    """Read saved messages. Requires the X-Admin-Key header to match ADMIN_API_KEY."""
    admin_key = get_settings().admin_api_key
    if not admin_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if not x_admin_key or not secrets.compare_digest(x_admin_key, admin_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")
    stmt = select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(limit)
    return list(db.scalars(stmt))
