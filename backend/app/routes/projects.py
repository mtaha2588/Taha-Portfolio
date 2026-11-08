from fastapi import APIRouter, HTTPException, status

from ..demos.registry import demo_for_project
from ..services.project_service import get_project, load_projects

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _public(project: dict) -> dict:
    demo = demo_for_project(project["slug"])
    return {**project, "demo": demo.describe() if demo else None}


@router.get("")
def list_projects() -> dict:
    """Public information for every portfolio project, including its live demo endpoints."""
    return {"projects": [_public(p) for p in load_projects()]}


@router.get("/{slug}")
def project_detail(slug: str) -> dict:
    project = get_project(slug)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _public(project)
