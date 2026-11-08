from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Timeframe = Literal["now", "1-3 months", "3-6 months", "researching"]
Financing = Literal["cash", "pre-approved", "needs financing", "undecided"]
LeadStage = Literal["Hot", "Warm", "Nurture"]


class Vehicle(BaseModel):
    id: str
    name: str
    body_type: str
    year: int
    price: int
    fuel: str
    mileage_km: int


class InventoryResponse(BaseModel):
    sample_data: bool = True
    vehicles: list[Vehicle]


class LeadCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    vehicle_id: str = Field(min_length=1, max_length=20)
    budget: int = Field(ge=1000, le=1_000_000)
    timeframe: Timeframe
    financing: Financing = "undecided"
    wants_test_drive: bool = False
    has_trade_in: bool = False


class ScoreItem(BaseModel):
    factor: str
    points: int
    reason: str


class AutomationAction(BaseModel):
    action: str
    when: datetime
    simulated: bool = True


class LeadResult(BaseModel):
    lead_id: int
    vehicle: Vehicle
    score: int
    stage: LeadStage
    score_breakdown: list[ScoreItem]
    automation: list[AutomationAction]
    alternatives: list[Vehicle]
    notes: list[str]


class PipelineLead(BaseModel):
    vehicle_id: str
    stage: LeadStage
    score: int
    created_at: datetime


class PipelineResponse(BaseModel):
    total_leads: int
    by_stage: dict[str, int]
    average_score: float | None
    by_vehicle: dict[str, int]
    recent: list[PipelineLead]
    note: str = "Counts come from leads created through this demo."
