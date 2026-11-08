from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Stage = Literal["input", "processing", "decision", "output"]


class InquiryTriageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: Literal["inquiry_triage"]
    messages: list[Annotated[str, Field(min_length=3, max_length=1000)]] = Field(min_length=1, max_length=20)


class SaleRecord(BaseModel):
    model_config = ConfigDict(extra="forbid")

    date: date
    product: str = Field(min_length=1, max_length=60)
    region: str = Field(min_length=1, max_length=60)
    amount: float = Field(ge=0, le=10_000_000)


class SalesSummaryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: Literal["sales_summary"]
    records: list[SaleRecord] = Field(min_length=2, max_length=500)


# The `task` field decides which workflow runs.
WorkflowRequest = Annotated[InquiryTriageRequest | SalesSummaryRequest, Field(discriminator="task")]


class StepLog(BaseModel):
    index: int
    stage: Stage
    tool: str
    description: str
    duration_ms: float
    output_summary: str


class WorkflowRun(BaseModel):
    run_id: str
    task: str
    engine: str = Field(description="Which engine produced the result")
    steps: list[StepLog]
    result: dict
    report_markdown: str
    notes: list[str]
