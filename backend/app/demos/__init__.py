"""Live project demos.

Each sub-package (avalanche/, automation_agent/, car_sales/) is a small,
self-contained backend for one portfolio project:

    router.py   - HTTP endpoints (mounted at /api/demos/<key>)
    schemas.py  - request/response models (the contract the frontend relies on)
    service.py  - the built-in implementation

As your real projects mature, set <PROJECT>_SERVICE_URL in .env and the
router forwards requests to your deployed service instead of running the
built-in implementation. Keep the request/response shapes in schemas.py
as the contract between the two.
"""
