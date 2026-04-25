"""GoldMine backend API tests - covers auth, CRUD, dashboard, isolation."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://action-hub-115.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _new_email(tag="u"):
    return f"test_{tag}_{uuid.uuid4().hex[:8]}@goldmineapp.com"


@pytest.fixture(scope="session")
def primary_user():
    email = _new_email("p")
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "GoldMine123!", "name": "Primary"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    return {"email": email, "password": "GoldMine123!", "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def secondary_user():
    email = _new_email("s")
    r = requests.post(f"{API}/auth/signup", json={"email": email, "password": "GoldMine123!", "name": "Secondary"})
    assert r.status_code == 200, r.text
    return {"email": email, "password": "GoldMine123!", "token": r.json()["token"]}


def H(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------- Auth ----------
class TestAuth:
    def test_signup_returns_token_and_user(self, primary_user):
        assert primary_user["token"]
        assert primary_user["user"]["email"] == primary_user["email"].lower()
        assert primary_user["user"]["auth_provider"] == "email"

    def test_signup_duplicate_email_400(self, primary_user):
        r = requests.post(f"{API}/auth/signup", json={"email": primary_user["email"], "password": "x"})
        assert r.status_code == 400

    def test_login_valid(self, primary_user):
        r = requests.post(f"{API}/auth/login", json={"email": primary_user["email"], "password": primary_user["password"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_invalid_returns_401(self):
        r = requests.post(f"{API}/auth/login", json={"email": "nobody@nope.io", "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, primary_user):
        r = requests.get(f"{API}/auth/me", headers=H(primary_user["token"]))
        assert r.status_code == 200
        assert r.json()["email"] == primary_user["email"].lower()

    def test_me_without_auth_401(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_ok(self, primary_user):
        r = requests.post(f"{API}/auth/logout", headers=H(primary_user["token"]))
        assert r.status_code == 200
        # Bearer JWT still valid (cookie was used to delete session); /me should still work
        r2 = requests.get(f"{API}/auth/me", headers=H(primary_user["token"]))
        assert r2.status_code == 200

    def test_google_session_with_fake_id(self):
        r = requests.post(f"{API}/auth/google-session", json={"session_id": "fake-session-id-xyz"})
        assert r.status_code in (401, 502)


# ---------- Categories ----------
class TestCategories:
    def test_crud(self, primary_user):
        h = H(primary_user["token"])
        r = requests.post(f"{API}/categories", headers=h, json={"name": "TEST_AI", "color": "#fff"})
        assert r.status_code == 200
        cat = r.json()
        cid = cat["id"]
        assert cat["name"] == "TEST_AI"

        r = requests.get(f"{API}/categories", headers=h)
        assert r.status_code == 200
        assert any(c["id"] == cid for c in r.json())

        r = requests.put(f"{API}/categories/{cid}", headers=h, json={"name": "TEST_AI2", "color": "#000"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_AI2"

        r = requests.delete(f"{API}/categories/{cid}", headers=h)
        assert r.status_code == 200

        r = requests.put(f"{API}/categories/{cid}", headers=h, json={"name": "x"})
        assert r.status_code == 404


# ---------- Creators ----------
class TestCreators:
    def test_crud(self, primary_user):
        h = H(primary_user["token"])
        payload = {
            "name": "TEST_Creator",
            "bio": "test",
            "links": [{"platform": "X", "url": "https://x.com/abc"}, {"platform": "YouTube", "url": "https://youtube.com/c/abc"}],
        }
        r = requests.post(f"{API}/creators", headers=h, json=payload)
        assert r.status_code == 200
        cid = r.json()["id"]
        assert len(r.json()["links"]) == 2

        r = requests.get(f"{API}/creators", headers=h)
        assert any(c["id"] == cid for c in r.json())

        r = requests.put(f"{API}/creators/{cid}", headers=h, json={**payload, "name": "TEST_Creator_v2"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Creator_v2"

        r = requests.delete(f"{API}/creators/{cid}", headers=h)
        assert r.status_code == 200


# ---------- Vault + move-to-action ----------
class TestVault:
    def test_platform_detection_and_move(self, primary_user):
        h = H(primary_user["token"])
        cases = [
            ("https://x.com/foo/status/1", "X"),
            ("https://www.youtube.com/watch?v=abc", "YouTube"),
            ("https://www.instagram.com/p/abc/", "Instagram"),
            ("https://example.com/blog", "Other"),
        ]
        ids = []
        for url, expected in cases:
            r = requests.post(f"{API}/vault", headers=h, json={"title": f"TEST_{expected}", "url": url})
            assert r.status_code == 200, r.text
            assert r.json()["platform"] == expected, f"{url} -> {r.json()['platform']}"
            ids.append(r.json()["id"])

        # Update vault item
        r = requests.put(f"{API}/vault/{ids[0]}", headers=h, json={"title": "TEST_X_v2", "url": "https://x.com/bar"})
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_X_v2"

        # Move to action
        r = requests.post(
            f"{API}/vault/{ids[0]}/move-to-action",
            headers=h,
            json={"action_type": "Build", "deadline": "2026-12-31", "notes": "TEST_note"},
        )
        assert r.status_code == 200
        action = r.json()
        assert action["action_type"] == "Build"
        assert action["vault_item_id"] == ids[0]

        # Verify vault item moved_to_action=true
        items = requests.get(f"{API}/vault", headers=h).json()
        v = next(i for i in items if i["id"] == ids[0])
        assert v["moved_to_action"] is True

        # Verify action listed
        actions = requests.get(f"{API}/actions", headers=h).json()
        assert any(a["id"] == action["id"] for a in actions)

        # Cleanup
        for vid in ids:
            requests.delete(f"{API}/vault/{vid}", headers=h)


# ---------- Prompts ----------
class TestPrompts:
    def test_crud(self, primary_user):
        h = H(primary_user["token"])
        r = requests.post(f"{API}/prompts", headers=h, json={"title": "TEST_p", "prompt_text": "hi"})
        assert r.status_code == 200
        pid = r.json()["id"]
        r = requests.put(f"{API}/prompts/{pid}", headers=h, json={"title": "TEST_p2", "prompt_text": "hello"})
        assert r.status_code == 200 and r.json()["title"] == "TEST_p2"
        r = requests.delete(f"{API}/prompts/{pid}", headers=h)
        assert r.status_code == 200


# ---------- Actions: status transitions ----------
class TestActions:
    def test_status_transitions(self, primary_user):
        h = H(primary_user["token"])
        r = requests.post(f"{API}/actions", headers=h, json={"title": "TEST_action", "action_type": "Learn"})
        assert r.status_code == 200
        aid = r.json()["id"]
        assert r.json()["completed_at"] is None

        # Mark Done
        r = requests.put(f"{API}/actions/{aid}", headers=h, json={"title": "TEST_action", "action_type": "Learn", "status": "Done"})
        assert r.status_code == 200
        assert r.json()["completed_at"] is not None

        # Switch back to In Progress -> completed_at cleared
        r = requests.put(f"{API}/actions/{aid}", headers=h, json={"title": "TEST_action", "action_type": "Learn", "status": "In Progress"})
        assert r.status_code == 200
        assert r.json()["completed_at"] is None

        requests.delete(f"{API}/actions/{aid}", headers=h)


# ---------- Notes ----------
class TestNotes:
    def test_crud(self, primary_user):
        h = H(primary_user["token"])
        r = requests.post(f"{API}/notes", headers=h, json={"title": "TEST_n", "content": "<b>hi</b>"})
        assert r.status_code == 200
        nid = r.json()["id"]
        r = requests.put(f"{API}/notes/{nid}", headers=h, json={"title": "TEST_n2", "content": "x"})
        assert r.status_code == 200 and r.json()["title"] == "TEST_n2"
        r = requests.delete(f"{API}/notes/{nid}", headers=h)
        assert r.status_code == 200


# ---------- Dashboard ----------
class TestDashboard:
    def test_stats_shape(self, primary_user):
        h = H(primary_user["token"])
        # Seed: one vault, one action done
        v = requests.post(f"{API}/vault", headers=h, json={"title": "TEST_dash", "url": "https://x.com/d"}).json()
        a = requests.post(f"{API}/actions", headers=h, json={"title": "TEST_dash_a", "action_type": "Learn"}).json()
        requests.put(f"{API}/actions/{a['id']}", headers=h, json={"title": "TEST_dash_a", "action_type": "Learn", "status": "Done"})

        r = requests.get(f"{API}/dashboard/stats", headers=h)
        assert r.status_code == 200
        s = r.json()
        for k in ["total_saved", "total_actions", "done_actions", "in_progress", "not_started",
                  "save_to_action_ratio", "accountability_score", "saved_this_week",
                  "completed_this_week", "overdue", "by_type"]:
            assert k in s
        assert isinstance(s["overdue"], list)
        assert isinstance(s["by_type"], dict)
        assert 0 <= s["accountability_score"] <= 100
        assert s["total_saved"] >= 1
        assert s["done_actions"] >= 1

        # cleanup
        requests.delete(f"{API}/vault/{v['id']}", headers=h)
        requests.delete(f"{API}/actions/{a['id']}", headers=h)


# ---------- User isolation ----------
class TestIsolation:
    def test_user_a_cannot_see_user_b_data(self, primary_user, secondary_user):
        ha = H(primary_user["token"])
        hb = H(secondary_user["token"])
        a = requests.post(f"{API}/vault", headers=ha, json={"title": "TEST_A", "url": "https://x.com/a"}).json()
        b_items = requests.get(f"{API}/vault", headers=hb).json()
        assert all(i["id"] != a["id"] for i in b_items)

        # B cannot delete A's item
        r = requests.delete(f"{API}/vault/{a['id']}", headers=hb)
        assert r.status_code == 404
        # A can delete its own
        r = requests.delete(f"{API}/vault/{a['id']}", headers=ha)
        assert r.status_code == 200
