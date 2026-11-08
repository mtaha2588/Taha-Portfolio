"""Central list of project demos, linking each one to its portfolio project."""

from dataclasses import dataclass, field

from ..config import get_settings


@dataclass(frozen=True)
class Demo:
    key: str
    project_slug: str
    title: str
    description: str
    service_url_setting: str
    endpoints: list[dict] = field(default_factory=list)

    @property
    def base_path(self) -> str:
        return f"/api/demos/{self.key}"

    def service_url(self) -> str:
        return getattr(get_settings(), self.service_url_setting, "") or ""

    def mode(self) -> str:
        """'remote' when forwarding to your real project service, otherwise 'built-in'."""
        return "remote" if self.service_url() else "built-in"

    def describe(self) -> dict:
        return {
            "key": self.key,
            "title": self.title,
            "description": self.description,
            "mode": self.mode(),
            "base_path": self.base_path,
            "endpoints": [{**e, "path": f"{self.base_path}{e['path']}"} for e in self.endpoints],
        }


DEMOS: tuple[Demo, ...] = (
    Demo(
        key="avalanche",
        project_slug="avalanche-intelligence-platform",
        title="Terrain analysis demo",
        description=(
            "Generates a synthetic elevation model, computes slope and aspect with Horn's method and "
            "classifies avalanche-relevant slope angles. Also evaluates a single location against "
            "well-established avalanche terrain and loading factors. Educational only, not a forecast."
        ),
        service_url_setting="avalanche_service_url",
        endpoints=[
            {"method": "GET", "path": "/terrain/sample", "summary": "Synthetic DEM with slope & slope-class grids"},
            {"method": "POST", "path": "/assess", "summary": "Rule-based terrain susceptibility indicators"},
        ],
    ),
    Demo(
        key="automation-agent",
        project_slug="ai-business-automation-agent",
        title="Workflow agent demo",
        description=(
            "Runs a real multi-step workflow (input, processing, decision, output) over data you send, "
            "using deterministic tools, and returns a step-by-step execution log plus a generated report."
        ),
        service_url_setting="automation_agent_service_url",
        endpoints=[
            {"method": "GET", "path": "/samples", "summary": "Sample inputs for each workflow"},
            {"method": "POST", "path": "/run", "summary": "Execute a workflow and get its log & report"},
        ],
    ),
    Demo(
        key="car-sales",
        project_slug="ai-enabled-car-sales-platform",
        title="Lead management demo",
        description=(
            "Sample inventory, lead capture with automatic scoring and stage assignment, simulated "
            "follow-up automation and a live pipeline summary from stored demo leads."
        ),
        service_url_setting="car_sales_service_url",
        endpoints=[
            {"method": "GET", "path": "/inventory", "summary": "Sample vehicle inventory"},
            {"method": "POST", "path": "/leads", "summary": "Capture & score a demo lead"},
            {"method": "GET", "path": "/pipeline", "summary": "Live pipeline summary of demo leads"},
        ],
    ),
)

_BY_KEY = {d.key: d for d in DEMOS}
_BY_PROJECT = {d.project_slug: d for d in DEMOS}


def get_demo(key: str) -> Demo:
    return _BY_KEY[key]


def demo_for_project(slug: str) -> Demo | None:
    return _BY_PROJECT.get(slug)
