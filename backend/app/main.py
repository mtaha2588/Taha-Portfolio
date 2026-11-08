"""FastAPI application entry point.

Run locally (from the backend/ folder):
    .venv\\Scripts\\python -m uvicorn app.main:app --reload --port 8000
Interactive API docs: http://localhost:8000/docs
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .database import init_db
from .demos.automation_agent.router import router as agent_router
from .demos.avalanche.router import router as avalanche_router
from .demos.car_sales.router import router as car_sales_router
from .routes import contact, health, projects

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("portfolio")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    logger.info("Database ready. CORS origins: %s", settings.cors_origins)
    yield


app = FastAPI(
    title="AI Intelligence Universe API",
    version="1.0.0",
    description="Backend for the portfolio: contact form, project information and live project demos.",
    lifespan=lifespan,
    # Hide interactive docs in production unless you want them public.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Key"],
    max_age=600,
)


@app.middleware("http")
async def guard_and_secure(request: Request, call_next):
    # Reject oversized bodies early (protects against abuse of the JSON endpoints).
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > settings.max_body_bytes:
        return JSONResponse(status_code=status.HTTP_413_CONTENT_TOO_LARGE, content={"detail": "Request body too large."})
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    # Same shape as FastAPI's default, minus echoing the raw input back to the client.
    errors = [{"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on our side. Please try again later."})


app.include_router(health.router)
app.include_router(contact.router)
app.include_router(projects.router)
app.include_router(avalanche_router)
app.include_router(agent_router)
app.include_router(car_sales_router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"name": "AI Intelligence Universe API", "health": "/api/health", "docs": None if settings.is_production else "/docs"}
