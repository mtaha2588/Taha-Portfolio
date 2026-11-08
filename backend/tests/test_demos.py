import math

from app.demos.avalanche.terrain import slope_aspect

AV = "/api/demos/avalanche"
AG = "/api/demos/automation-agent"
CS = "/api/demos/car-sales"


# ---------------------------------------------------------------- avalanche

def test_horn_slope_on_known_plane():
    # A plane rising 1 m per 1 m eastwards is a 45° slope facing west (downslope = west).
    dem = [[float(c) for c in range(5)] for _ in range(5)]
    slopes, aspects = slope_aspect(dem, 1.0)
    assert math.isclose(slopes[2][2], 45.0, abs_tol=1e-6)
    assert math.isclose(aspects[2][2], 270.0, abs_tol=1e-6)


def test_terrain_sample(client):
    r = client.get(f"{AV}/terrain/sample", params={"size": 32, "seed": 3})
    assert r.status_code == 200
    t = r.json()
    assert t["synthetic"] is True
    assert len(t["elevation_m"]) == len(t["slope_deg"]) == len(t["slope_class"]) == 32 * 32
    assert math.isclose(sum(c["share_pct"] for c in t["classes"]), 100, abs_tol=0.5)
    assert "disclaimer" in t
    assert client.get(f"{AV}/terrain/sample", params={"size": 999}).status_code == 422


def test_assessment_levels(client):
    high = client.post(f"{AV}/assess", json={"slope_deg": 38, "aspect_deg": 45, "new_snow_cm": 40,
                                              "wind_speed_kmh": 40, "wind_from_deg": 225}).json()
    assert high["terrain_susceptibility"] == "high"
    assert high["aspect"] == "NE"
    wind = next(f for f in high["factors"] if f["key"] == "wind_loading")
    assert wind["present"] is True  # wind from SW loads NE-facing (lee) slopes

    elevated = client.post(f"{AV}/assess", json={"slope_deg": 35}).json()
    assert elevated["terrain_susceptibility"] == "elevated"

    low = client.post(f"{AV}/assess", json={"slope_deg": 15, "new_snow_cm": 80}).json()
    assert low["terrain_susceptibility"] == "low"

    assert client.post(f"{AV}/assess", json={"slope_deg": 120}).status_code == 422


# ---------------------------------------------------------------- automation agent

def test_agent_samples_run_end_to_end(client):
    samples = client.get(f"{AG}/samples").json()
    assert samples["sample_data"] is True

    run = client.post(f"{AG}/run", json=samples["samples"]["inquiry_triage"]).json()
    assert [s["stage"] for s in run["steps"]] == ["input", "processing", "processing", "decision", "output"]
    assert "rule-based" in run["engine"]
    top = run["result"]["items"][0]
    assert top["intent"] == "support" and top["priority"].startswith("P1")
    assert run["report_markdown"].startswith("# Inquiry triage report")


def test_agent_sales_summary(client):
    samples = client.get(f"{AG}/samples").json()["samples"]
    run = client.post(f"{AG}/run", json=samples["sales_summary"]).json()
    agg = run["result"]["aggregates"]
    assert agg["total"] == 21500
    assert next(iter(agg["by_product"])) == "Pro Plan"
    assert run["result"]["trend"]["direction"] == "up"


def test_agent_rejects_bad_task(client):
    assert client.post(f"{AG}/run", json={"task": "delete_everything"}).status_code == 422
    assert client.post(f"{AG}/run", json={"task": "inquiry_triage", "messages": []}).status_code == 422


# ---------------------------------------------------------------- car sales

def test_car_sales_lead_flow(client):
    inv = client.get(f"{CS}/inventory").json()
    assert inv["sample_data"] is True and len(inv["vehicles"]) >= 3

    hot = client.post(f"{CS}/leads", json={"vehicle_id": "v-101", "budget": 45000, "timeframe": "now",
                                           "financing": "pre-approved", "wants_test_drive": True})
    assert hot.status_code == 201
    hot = hot.json()
    assert hot["stage"] == "Hot" and hot["score"] >= 70
    assert all(a["simulated"] for a in hot["automation"])
    assert hot["alternatives"] == []

    cold = client.post(f"{CS}/leads", json={"vehicle_id": "v-103", "budget": 25000, "timeframe": "researching"}).json()
    assert cold["stage"] == "Nurture"
    assert cold["alternatives"], "should suggest affordable alternatives"
    assert all(v["price"] <= 25000 for v in cold["alternatives"])

    pipe = client.get(f"{CS}/pipeline").json()
    assert pipe["total_leads"] >= 2
    assert pipe["by_stage"]["Hot"] >= 1 and pipe["by_stage"]["Nurture"] >= 1
    assert "first_name" not in str(pipe)


def test_car_sales_validation(client):
    assert client.post(f"{CS}/leads", json={"vehicle_id": "nope", "budget": 30000, "timeframe": "now"}).status_code == 422
    assert client.post(f"{CS}/leads", json={"vehicle_id": "v-101", "budget": 30000, "timeframe": "someday"}).status_code == 422


def test_demo_rate_limit(client):
    codes = [client.get(f"{CS}/inventory").status_code for _ in range(32)]
    assert codes[0] == 200 and codes[-1] == 429


def test_remote_mode_forwards(client, monkeypatch):
    """With CAR_SALES_SERVICE_URL set, requests go to the real project service."""
    from app.config import get_settings
    from app.demos.car_sales import router as car_router

    calls = {}

    async def fake_forward(base_url, method, path, **kwargs):
        calls.update(base_url=base_url, method=method, path=path)
        return {"sample_data": False, "vehicles": []}

    monkeypatch.setattr(get_settings(), "car_sales_service_url", "https://cars.example.com")
    monkeypatch.setattr(car_router, "forward", fake_forward)

    r = client.get(f"{CS}/inventory")
    assert r.status_code == 200 and r.json()["sample_data"] is False
    assert calls == {"base_url": "https://cars.example.com", "method": "GET", "path": "/inventory"}
    assert client.get("/api/health").json()["demos"]["car-sales"] == "remote"
