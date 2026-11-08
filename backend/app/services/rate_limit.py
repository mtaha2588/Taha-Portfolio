"""Simple in-memory sliding-window rate limiter.

Good enough for a single portfolio server instance. If you later run
several instances, swap this for a shared store such as Redis.
"""

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

from ..config import get_settings


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry_after = int(self.window - (now - hits[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please wait a moment and try again.",
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def client_ip(request: Request) -> str:
    """Visitor IP. Only trusts X-Forwarded-For when TRUST_PROXY=true (i.e. behind Render/Railway)."""
    if get_settings().trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


_settings = get_settings()
contact_limiter = RateLimiter(_settings.contact_rate_limit, _settings.contact_rate_window_s)
demo_limiter = RateLimiter(_settings.demo_rate_limit, _settings.demo_rate_window_s)


def limit_demo(request: Request) -> None:
    """FastAPI dependency applied to every project demo endpoint."""
    demo_limiter.check(f"demo:{client_ip(request)}")
