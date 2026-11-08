VALID = {
    "name": "Jordan Lee",
    "email": "Jordan@Example.com",
    "company": "Acme",
    "message": "Hi! I'd like to talk about a contract role building AI automation.",
    "elapsed_ms": 9000,
}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["email_notifications"] is False
    assert body["demos"] == {"avalanche": "built-in", "automation-agent": "built-in", "car-sales": "built-in"}


def test_security_headers(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"


def test_projects_list_and_detail(client):
    r = client.get("/api/projects")
    assert r.status_code == 200
    projects = r.json()["projects"]
    assert len(projects) == 3
    assert all(p["demo"] and p["demo"]["endpoints"] for p in projects)

    slug = projects[0]["slug"]
    detail = client.get(f"/api/projects/{slug}").json()
    assert detail["slug"] == slug
    assert client.get("/api/projects/does-not-exist").status_code == 404


def test_contact_saved_and_listed(client):
    r = client.post("/api/contact", json=VALID)
    assert r.status_code == 201
    assert r.json()["ok"] is True

    listed = client.get("/api/contact/messages", headers={"X-Admin-Key": "test-admin-key"})
    assert listed.status_code == 200
    latest = listed.json()[0]
    assert latest["email"] == "jordan@example.com"
    assert latest["name"] == "Jordan Lee"


def test_contact_admin_requires_key(client):
    assert client.get("/api/contact/messages").status_code == 401
    assert client.get("/api/contact/messages", headers={"X-Admin-Key": "wrong"}).status_code == 401


def test_contact_validation_errors(client):
    r = client.post("/api/contact", json={**VALID, "email": "not-an-email", "message": "short"})
    assert r.status_code == 422
    fields = {e["loc"][-1] for e in r.json()["detail"]}
    assert {"email", "message"} <= fields


def test_contact_rejects_markup_and_link_spam(client):
    assert client.post("/api/contact", json={**VALID, "message": "Hello <script>alert(1)</script> there"}).status_code == 422
    links = " ".join(f"https://spam{i}.example" for i in range(5))
    assert client.post("/api/contact", json={**VALID, "message": f"Buy now {links}"}).status_code == 422
    assert client.post("/api/contact", json={**VALID, "name": "<b>x</b>"}).status_code == 422


def test_contact_honeypot_and_speed_are_silently_dropped(client):
    headers = {"X-Admin-Key": "test-admin-key"}
    before = len(client.get("/api/contact/messages", headers=headers).json())
    assert client.post("/api/contact", json={**VALID, "website": "http://bot"}).status_code == 201
    assert client.post("/api/contact", json={**VALID, "elapsed_ms": 300}).status_code == 201
    after = len(client.get("/api/contact/messages", headers=headers).json())
    assert after == before


def test_contact_rate_limited(client):
    codes = [client.post("/api/contact", json=VALID).status_code for _ in range(7)]
    assert codes[:5] == [201] * 5
    assert codes[-1] == 429


def test_unknown_fields_rejected(client):
    assert client.post("/api/contact", json={**VALID, "is_admin": True}).status_code == 422


def test_body_size_limit(client):
    big = {**VALID, "message": "x" * 70_000}
    assert client.post("/api/contact", json=big).status_code == 413
