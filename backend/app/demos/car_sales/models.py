from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ...database import Base
from ...models.contact import utcnow


class DemoLead(Base):
    """A lead created through the portfolio demo. Deliberately stores no personal data."""

    __tablename__ = "demo_car_leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vehicle_id: Mapped[str] = mapped_column(String(20), index=True)
    budget: Mapped[int] = mapped_column(Integer)
    timeframe: Mapped[str] = mapped_column(String(20))
    financing: Mapped[str] = mapped_column(String(20))
    wants_test_drive: Mapped[bool] = mapped_column(default=False)
    has_trade_in: Mapped[bool] = mapped_column(default=False)
    score: Mapped[int] = mapped_column(Integer)
    stage: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
