from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DISCLAIMER = (
    "Educational demonstration using synthetic or user-supplied values and general rules of thumb. "
    "It is not an avalanche forecast and must not be used for safety decisions."
)


class SlopeClass(BaseModel):
    id: int
    label: str
    meaning: str
    share_pct: float


class TerrainSample(BaseModel):
    synthetic: bool = True
    seed: int
    size: int = Field(description="Grid is size x size cells, row-major, row 0 = north")
    cell_size_m: float
    min_elevation_m: float
    max_elevation_m: float
    elevation_m: list[float]
    slope_deg: list[float]
    slope_class: list[int]
    classes: list[SlopeClass]
    method: str
    disclaimer: str = DISCLAIMER


class AssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slope_deg: float = Field(ge=0, le=90, description="Slope angle in degrees")
    aspect_deg: float | None = Field(default=None, ge=0, lt=360, description="Direction the slope faces")
    new_snow_cm: float = Field(default=0, ge=0, le=500, description="New snow in the last 72 hours")
    wind_speed_kmh: float = Field(default=0, ge=0, le=300)
    wind_from_deg: float | None = Field(default=None, ge=0, lt=360, description="Direction the wind blows FROM")
    air_temp_c: float | None = Field(default=None, ge=-60, le=40)
    rapid_warming: bool = False


class Factor(BaseModel):
    key: str
    label: str
    present: bool
    detail: str


class AssessmentResponse(BaseModel):
    terrain_susceptibility: Literal["low", "elevated", "high"]
    slope_class: int
    slope_class_label: str
    aspect: str | None
    factors: list[Factor]
    summary: str
    method: str = "Rule-based indicators (slope angle, new snow, wind loading on lee slopes, warming)"
    disclaimer: str = DISCLAIMER
