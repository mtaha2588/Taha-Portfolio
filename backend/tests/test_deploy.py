"""Deployment-related behaviour: database URLs and CORS for the production frontend."""

from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from fastapi import FastAPI

from app.database import _normalise


def test_postgres_urls_use_psycopg3():
    assert _normalise("postgres://u:p@h:5432/db") == "postgresql+psycopg://u:p@h:5432/db"
    assert _normalise("postgresql://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert _normalise("sqlite:///./portfolio.db") == "sqlite:///./portfolio.db"


def test_cors_allows_listed_origin_and_preview_regex():
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["https://portfolio.vercel.app"],
        allow_origin_regex=r"^https://portfolio-[a-z0-9-]+\.vercel\.app$",
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @app.get("/ping")
    def ping():
        return {"ok": True}

    c = TestClient(app)
    allowed = ["https://portfolio.vercel.app", "https://portfolio-git-main-abc123.vercel.app"]
    for origin in allowed:
        assert c.get("/ping", headers={"Origin": origin}).headers.get("access-control-allow-origin") == origin
    assert "access-control-allow-origin" not in c.get("/ping", headers={"Origin": "https://evil.example"}).headers


def test_cors_preflight_from_dev_frontend(client):
    r = client.options(
        "/api/contact",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"},
    )
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"
