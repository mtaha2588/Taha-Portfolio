"""Forwarding to your real project services.

Each project demo can run either:
  * locally  - the built-in implementation in app/demos/<project>/service.py, or
  * remotely - forwarded to your deployed project API when <PROJECT>_SERVICE_URL is set.

The remote service must accept the same request JSON and return the same
response shape. That way the portfolio frontend keeps working unchanged
as your real projects grow.
"""

import httpx
from fastapi import HTTPException, status


async def forward(base_url: str, method: str, path: str, *, json: dict | None = None, params: dict | None = None) -> dict:
    url = f"{base_url.rstrip('/')}{path}"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(method, url, json=json, params=params)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The project service is currently unreachable. Please try again later.",
        ) from exc

    if response.status_code >= 400:
        detail = "The project service returned an error."
        try:
            detail = response.json().get("detail", detail)
        except ValueError:
            pass
        raise HTTPException(status_code=response.status_code, detail=detail)
    return response.json()
