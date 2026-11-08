from fastapi import APIRouter, Body, Depends

from ...services.rate_limit import limit_demo
from ...services.remote import forward
from ..registry import get_demo
from . import service
from .schemas import WorkflowRequest, WorkflowRun

demo = get_demo("automation-agent")
router = APIRouter(prefix=demo.base_path, tags=["demo: automation agent"], dependencies=[Depends(limit_demo)])


@router.get("/samples")
async def samples() -> dict:
    """Sample inputs the frontend can use to pre-fill the workflow demo (clearly sample data)."""
    if url := demo.service_url():
        return await forward(url, "GET", "/samples")
    return {"sample_data": True, "samples": service.SAMPLES}


@router.post("/run", response_model=WorkflowRun)
async def run(req: WorkflowRequest = Body(...)):
    if url := demo.service_url():
        return await forward(url, "POST", "/run", json=req.model_dump(mode="json"))
    return service.run_workflow(req)
