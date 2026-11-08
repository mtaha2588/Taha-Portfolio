from fastapi import APIRouter, Depends, Query

from ...services.rate_limit import limit_demo
from ...services.remote import forward
from ..registry import get_demo
from . import service
from .schemas import AssessmentRequest, AssessmentResponse, TerrainSample

demo = get_demo("avalanche")
router = APIRouter(prefix=demo.base_path, tags=["demo: avalanche"], dependencies=[Depends(limit_demo)])


@router.get("/terrain/sample", response_model=TerrainSample)
async def terrain_sample(
    size: int = Query(default=64, ge=16, le=128, description="Grid resolution"),
    seed: int = Query(default=7, ge=0, le=10_000),
):
    if url := demo.service_url():
        return await forward(url, "GET", "/terrain/sample", params={"size": size, "seed": seed})
    return service.terrain_sample(size, seed)


@router.post("/assess", response_model=AssessmentResponse)
async def assess(req: AssessmentRequest):
    if url := demo.service_url():
        return await forward(url, "POST", "/assess", json=req.model_dump())
    return service.assess(req)
