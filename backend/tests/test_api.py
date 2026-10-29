import csv
import io

FIELDS = [
    {"id": "name", "type": "text", "label": "Name", "required": True},
    {
        "id": "is_student",
        "type": "dropdown",
        "label": "Are you a student?",
        "options": ["Yes", "No"],
        "required": True,
    },
    {
        "id": "college",
        "type": "text",
        "label": "College name",
        "required": True,
        "show_if": {"field": "is_student", "op": "equals", "value": "Yes"},
    },
    {"id": "langs", "type": "checkbox", "label": "Languages", "options": ["Go", "Python"]},
]


def make_form(owner, fields=FIELDS, publish=True):
    form = owner.post("/api/forms", json={"title": "Signup", "schema": {"fields": fields}}).json()
    if publish:
        owner.post(f"/api/forms/{form['id']}/publish", json={"published": True})
    return form


def test_login(client):
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    assert client.get("/api/auth/me").json() == {"owner": False}
    client.post("/api/auth/login", json={"password": "test-pass"})
    assert client.get("/api/auth/me").json() == {"owner": True}
    client.post("/api/auth/logout")
    assert client.get("/api/forms").status_code == 401


def test_owner_routes_need_login(client):
    assert client.get("/api/forms").status_code == 401
    assert client.post("/api/forms", json={"title": "x"}).status_code == 401


def test_create_update_and_list(owner):
    form = make_form(owner, publish=False)
    assert form["published"] is False and len(form["slug"]) >= 10
    updated = owner.put(
        f"/api/forms/{form['id']}",
        json={
            "title": "Signup v2",
            "schema": {"fields": FIELDS[:2]},
        },
    ).json()
    assert updated["title"] == "Signup v2" and len(updated["schema"]["fields"]) == 2
    listed = owner.get("/api/forms").json()
    assert listed[0]["response_count"] == 0


def test_invalid_schema_points_at_field(owner):
    bad = [FIELDS[2], FIELDS[1]]  # condition refers to a field below it
    r = owner.post("/api/forms", json={"title": "Bad", "schema": {"fields": bad}})
    assert r.status_code == 422
    assert r.json()["detail"][0]["field"] == "college"


def test_cannot_publish_empty_form(owner):
    form = owner.post("/api/forms", json={"title": "Empty"}).json()
    r = owner.post(f"/api/forms/{form['id']}/publish", json={"published": True})
    assert r.status_code == 422


def test_unpublished_form_is_hidden(owner):
    form = make_form(owner, publish=False)
    assert owner.get(f"/api/public/forms/{form['slug']}").status_code == 404
    r = owner.post(f"/api/public/forms/{form['slug']}/responses", json={"name": "x"})
    assert r.status_code == 404


def test_public_form_does_not_leak_owner_fields(owner):
    form = make_form(owner)
    public = owner.get(f"/api/public/forms/{form['slug']}").json()
    assert set(public) == {"title", "description", "schema"}


def test_submit_with_conditional_branch(owner):
    slug = make_form(owner)["slug"]
    url = f"/api/public/forms/{slug}/responses"

    r = owner.post(url, json={"name": "Ak", "is_student": "Yes"})
    assert r.status_code == 422
    assert r.json()["detail"]["errors"] == {"college": "is required"}

    # The hidden "college" answer is dropped, not stored
    assert (
        owner.post(url, json={"name": "Ak", "is_student": "No", "college": "x"}).status_code == 201
    )
    assert (
        owner.post(
            url,
            json={
                "name": "Riya",
                "is_student": "Yes",
                "college": "SRMIST",
                "langs": ["Python", "Go"],
            },
        ).status_code
        == 201
    )

    data = owner.get("/api/forms/1/responses").json()
    assert [c["id"] for c in data["columns"]] == ["name", "is_student", "college", "langs"]
    newest, oldest = data["responses"]
    assert "college" not in oldest["answers"]
    assert newest["answers"]["langs"] == ["Go", "Python"]


def test_csv_export(owner):
    form = make_form(owner)
    url = f"/api/public/forms/{form['slug']}/responses"
    owner.post(
        url,
        json={
            "name": '=HYPERLINK("x")',
            "is_student": "Yes",
            "college": "IIT",
            "langs": ["Go", "Python"],
        },
    )
    # A field removed after people answered it still exports
    owner.put(
        f"/api/forms/{form['id']}", json={"title": "Signup", "schema": {"fields": FIELDS[:3]}}
    )

    r = owner.get(f"/api/forms/{form['id']}/responses.csv")
    assert r.headers["content-type"].startswith("text/csv")
    assert "Signup-responses.csv" in r.headers["content-disposition"]
    rows = list(csv.reader(io.StringIO(r.text)))
    assert rows[0] == [
        "Submitted at",
        "Name",
        "Are you a student?",
        "College name",
        "langs (removed)",
    ]
    assert rows[1][1] == '\'=HYPERLINK("x")'  # formula injection neutralised
    assert rows[1][4] == "Go; Python"


def test_delete_cascades(owner):
    form = make_form(owner)
    owner.post(
        f"/api/public/forms/{form['slug']}/responses", json={"name": "Ak", "is_student": "No"}
    )
    assert owner.delete(f"/api/forms/{form['id']}").status_code == 204
    assert owner.get(f"/api/forms/{form['id']}/responses").status_code == 404
