"""Loads public project information from app/data/projects.json.

That file is a copy of frontend/src/data/projects.json. Run
`npm run sync:projects` in the frontend after editing it.
"""

import json
from functools import lru_cache
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "projects.json"


@lru_cache
def load_projects() -> tuple[dict, ...]:
    with DATA_FILE.open(encoding="utf-8") as f:
        projects = json.load(f)
    if not isinstance(projects, list):
        raise ValueError("projects.json must contain a list of projects")
    return tuple(projects)


def get_project(slug: str) -> dict | None:
    return next((p for p in load_projects() if p.get("slug") == slug), None)
