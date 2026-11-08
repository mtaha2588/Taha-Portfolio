"""Optional SMTP notification when someone sends a contact message.

If SMTP is not configured, this does nothing: the message is still
saved to the database. Runs in a FastAPI background task, so a slow
mail server never delays the visitor's response.
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage

from ..config import get_settings

logger = logging.getLogger("portfolio.email")


def send_contact_notification(*, name: str, email: str, company: str | None, message: str, message_id: int) -> bool:
    settings = get_settings()
    if not settings.email_enabled:
        logger.info("SMTP not configured; contact message %s saved without email notification.", message_id)
        return False

    msg = EmailMessage()
    msg["Subject"] = f"New portfolio message from {name}"
    msg["From"] = settings.smtp_from
    msg["To"] = settings.contact_notify_email
    msg["Reply-To"] = email
    # Plain text only: nothing a visitor typed is ever rendered as HTML.
    msg.set_content(
        f"Name: {name}\nEmail: {email}\nCompany: {company or '-'}\nMessage ID: {message_id}\n\n{message}\n"
    )

    try:
        context = ssl.create_default_context()
        if settings.smtp_port == 465:
            server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context, timeout=15)
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
            server.starttls(context=context)
        with server:
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info("Notification email sent for contact message %s.", message_id)
        return True
    except Exception:  # noqa: BLE001 - email failure must never break the API
        logger.exception("Failed to send notification email for contact message %s.", message_id)
        return False
