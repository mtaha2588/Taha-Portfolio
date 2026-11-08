import os
import tempfile
from pathlib import Path

import pytest

# Use a throwaway database and a clean configuration for every test run.
# Must happen before the app is imported.
_tmp = Path(tempfile.mkdtemp()) / "test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.as_posix()}"
os.environ["ADMIN_API_KEY"] = "test-admin-key"
os.environ["SMTP_HOST"] = ""
for key in ("AVALANCHE_SERVICE_URL", "AUTOMATION_AGENT_SERVICE_URL", "CAR_SALES_SERVICE_URL"):
    os.environ[key] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services.rate_limit import contact_limiter, demo_limiter  # noqa: E402


@pytest.fixture()
def client():
    contact_limiter.reset()
    demo_limiter.reset()
    with TestClient(app) as c:
        yield c
