"""Built-in lead scoring, automation and pipeline logic for the car sales demo."""

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .inventory import SAMPLE_INVENTORY, get_vehicle
from .models import DemoLead
from .schemas import AutomationAction, LeadCreate, LeadResult, PipelineLead, PipelineResponse, ScoreItem, Vehicle

MAX_STORED_LEADS = 500  # demo table is capped so it can't grow without limit

TIMEFRAME_POINTS = {"now": 35, "1-3 months": 25, "3-6 months": 12, "researching": 5}
FINANCING_POINTS = {"cash": 15, "pre-approved": 15, "needs financing": 8, "undecided": 0}


def score_lead(lead: LeadCreate, vehicle: dict) -> tuple[int, list[ScoreItem]]:
    items = [
        ScoreItem(factor="timeframe", points=TIMEFRAME_POINTS[lead.timeframe], reason=f"Buying timeframe: {lead.timeframe}"),
        ScoreItem(factor="financing", points=FINANCING_POINTS[lead.financing], reason=f"Financing: {lead.financing}"),
    ]
    ratio = lead.budget / vehicle["price"]
    if ratio >= 1:
        items.append(ScoreItem(factor="budget", points=25, reason="Budget covers the vehicle price"))
    elif ratio >= 0.9:
        items.append(ScoreItem(factor="budget", points=15, reason="Budget within 10% of the price"))
    elif ratio >= 0.75:
        items.append(ScoreItem(factor="budget", points=5, reason="Budget within 25% of the price"))
    else:
        items.append(ScoreItem(factor="budget", points=0, reason="Budget well below the price"))
    if lead.wants_test_drive:
        items.append(ScoreItem(factor="test_drive", points=20, reason="Requested a test drive"))
    if lead.has_trade_in:
        items.append(ScoreItem(factor="trade_in", points=5, reason="Has a trade-in vehicle"))
    return min(sum(i.points for i in items), 100), items


def stage_for(score: int) -> str:
    return "Hot" if score >= 70 else "Warm" if score >= 40 else "Nurture"


def plan_automation(stage: str, lead: LeadCreate, now: datetime) -> list[AutomationAction]:
    if stage == "Hot":
        actions = [AutomationAction(action="Notify the sales team immediately", when=now),
                   AutomationAction(action="Personal follow-up call", when=now + timedelta(hours=2))]
        if lead.wants_test_drive:
            actions.append(AutomationAction(action="Offer test-drive slots", when=now + timedelta(hours=4)))
    elif stage == "Warm":
        actions = [AutomationAction(action="Send vehicle brochure and pricing email", when=now + timedelta(minutes=5)),
                   AutomationAction(action="Follow-up email", when=now + timedelta(days=1))]
    else:
        actions = [AutomationAction(action="Add to monthly newsletter sequence", when=now + timedelta(minutes=5)),
                   AutomationAction(action="Check-in email", when=now + timedelta(days=7))]
    if lead.financing == "needs financing":
        actions.append(AutomationAction(action="Send financing options", when=now + timedelta(hours=1)))
    return actions


def alternatives_for(lead: LeadCreate, vehicle: dict) -> list[Vehicle]:
    if lead.budget >= vehicle["price"] * 0.9:
        return []
    affordable = [v for v in SAMPLE_INVENTORY if v["price"] <= lead.budget and v["id"] != vehicle["id"]]
    affordable.sort(key=lambda v: (v["body_type"] != vehicle["body_type"], -v["price"]))
    return [Vehicle(**v) for v in affordable[:2]]


def create_lead(db: Session, lead: LeadCreate) -> LeadResult:
    vehicle = get_vehicle(lead.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=422, detail="Unknown vehicle_id")

    score, breakdown = score_lead(lead, vehicle)
    stage = stage_for(score)
    now = datetime.now(timezone.utc)

    record = DemoLead(**lead.model_dump(), score=score, stage=stage, created_at=now)
    db.add(record)
    db.commit()
    db.refresh(record)
    _prune(db)

    return LeadResult(
        lead_id=record.id,
        vehicle=Vehicle(**vehicle),
        score=score,
        stage=stage,
        score_breakdown=breakdown,
        automation=plan_automation(stage, lead, now),
        alternatives=alternatives_for(lead, vehicle),
        notes=["Automation actions are scheduled in the response only; no messages are sent in this demo."],
    )


def _prune(db: Session) -> None:
    cutoff = db.scalar(select(DemoLead.id).order_by(DemoLead.id.desc()).offset(MAX_STORED_LEADS).limit(1))
    if cutoff is not None:
        db.execute(delete(DemoLead).where(DemoLead.id <= cutoff))
        db.commit()


def pipeline(db: Session) -> PipelineResponse:
    total = db.scalar(select(func.count(DemoLead.id))) or 0
    by_stage = {"Hot": 0, "Warm": 0, "Nurture": 0}
    for stage, count in db.execute(select(DemoLead.stage, func.count()).group_by(DemoLead.stage)):
        by_stage[stage] = count
    by_vehicle = {vid: count for vid, count in db.execute(select(DemoLead.vehicle_id, func.count()).group_by(DemoLead.vehicle_id))}
    avg = db.scalar(select(func.avg(DemoLead.score)))
    recent = db.scalars(select(DemoLead).order_by(DemoLead.id.desc()).limit(5))
    return PipelineResponse(
        total_leads=total,
        by_stage=by_stage,
        average_score=round(float(avg), 1) if avg is not None else None,
        by_vehicle=by_vehicle,
        recent=[PipelineLead(vehicle_id=r.vehicle_id, stage=r.stage, score=r.score, created_at=r.created_at) for r in recent],
    )
