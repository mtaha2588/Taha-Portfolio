from fastapi import APIRouter, Depends, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from ...database import get_db
from ...services.rate_limit import limit_demo
from ...services.remote import forward
from ..registry import get_demo
from . import service
from .inventory import SAMPLE_INVENTORY
from .schemas import InventoryResponse, LeadCreate, LeadResult, PipelineResponse

demo = get_demo("car-sales")
router = APIRouter(prefix=demo.base_path, tags=["demo: car sales"], dependencies=[Depends(limit_demo)])


@router.get("/inventory", response_model=InventoryResponse)
async def inventory():
    if url := demo.service_url():
        return await forward(url, "GET", "/inventory")
    return InventoryResponse(vehicles=SAMPLE_INVENTORY)


@router.post("/leads", response_model=LeadResult, status_code=status.HTTP_201_CREATED)
async def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    if url := demo.service_url():
        return await forward(url, "POST", "/leads", json=lead.model_dump())
    return await run_in_threadpool(service.create_lead, db, lead)


@router.get("/pipeline", response_model=PipelineResponse)
async def pipeline(db: Session = Depends(get_db)):
    if url := demo.service_url():
        return await forward(url, "GET", "/pipeline")
    return await run_in_threadpool(service.pipeline, db)
