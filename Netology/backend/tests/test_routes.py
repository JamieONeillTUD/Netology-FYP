# test_routes.py — Integration tests for Flask API endpoints.
#
# The database layer is mocked with unittest.mock so no live PostgreSQL
# connection is required. Tests verify HTTP status codes, response shapes,
# and business-rule enforcement (validation, duplicate detection, etc.).

import pytest
from unittest.mock import MagicMock, patch

from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def make_mock_conn(*fetchone_side_effects):
    """Return a mock connection whose cursor().fetchone() returns values in order."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_conn.cursor.return_value = mock_cur
    mock_cur.fetchone.side_effect = list(fetchone_side_effects)
    return mock_conn


# ── Health check ─────────────────────────────────────────────────────────────

class TestHealthz:
    def test_returns_200(self, client):
        response = client.get("/healthz")
        assert response.status_code == 200

    def test_returns_ok_true(self, client):
        assert client.get("/healthz").get_json() == {"ok": True}


# ── POST /register ────────────────────────────────────────────────────────────

class TestRegister:
    VALID = {
        "first_name": "Jamie",
        "last_name": "O'Neill",
        "username": "jamie123",
        "email": "jamie@example.com",
        "dob": "2000-01-01",
        "password": "securepass1",
        "confirm_password": "securepass1",
        "reasons": "learning",
    }

    # Validation errors — no DB needed

    def test_missing_all_fields_returns_400(self, client):
        r = client.post("/register", data={})
        assert r.status_code == 400
        assert r.get_json()["success"] is False

    def test_missing_first_name_returns_400(self, client):
        data = {**self.VALID, "first_name": ""}
        r = client.post("/register", data=data)
        assert r.status_code == 400

    def test_invalid_email_returns_400(self, client):
        data = {**self.VALID, "email": "notanemail"}
        r = client.post("/register", data=data)
        assert r.status_code == 400
        assert r.get_json()["success"] is False

    def test_password_too_short_returns_400(self, client):
        data = {**self.VALID, "password": "short", "confirm_password": "short"}
        r = client.post("/register", data=data)
        assert r.status_code == 400
        assert "8 characters" in r.get_json()["message"]

    def test_passwords_mismatch_returns_400(self, client):
        data = {**self.VALID, "confirm_password": "different99"}
        r = client.post("/register", data=data)
        assert r.status_code == 400
        assert r.get_json()["success"] is False

    def test_no_reasons_returns_400(self, client):
        data = {**self.VALID}
        data.pop("reasons")
        r = client.post("/register", data=data)
        assert r.status_code == 400

    # DB-dependent: duplicate checks

    def test_duplicate_email_returns_409(self, client):
        mock_conn = make_mock_conn((1,))  # email already exists
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.post("/register", data=self.VALID)
        assert r.status_code == 409
        assert "already registered" in r.get_json()["message"]

    def test_duplicate_username_returns_409(self, client):
        mock_conn = make_mock_conn(None, (1,))  # email free, username taken
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.post("/register", data=self.VALID)
        assert r.status_code == 409
        assert "username" in r.get_json()["message"].lower()

    def test_successful_register_returns_200(self, client):
        mock_conn = make_mock_conn(None, None)  # email free, username free
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.post("/register", data=self.VALID)
        assert r.status_code == 200
        assert r.get_json()["success"] is True


# ── POST /login ───────────────────────────────────────────────────────────────

class TestLogin:
    def test_user_not_found_returns_401(self, client):
        mock_conn = make_mock_conn(None)  # no user row
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.post("/login", data={
                "email": "nobody@example.com",
                "password": "anything",
            })
        assert r.status_code == 401
        assert r.get_json()["success"] is False

    def test_wrong_password_returns_401(self, client):
        # Return a real bcrypt hash for "correctpassword" so the check fails.
        from flask_bcrypt import Bcrypt
        _bcrypt = Bcrypt(app)
        pw_hash = _bcrypt.generate_password_hash("correctpassword").decode("utf-8")

        mock_conn = make_mock_conn(
            ("Jamie", "O'Neill", pw_hash, 0, "jamie123", "novice", True, False)
        )
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.post("/login", data={
                "email": "jamie@example.com",
                "password": "wrongpassword",
            })
        assert r.status_code == 401
        assert r.get_json()["success"] is False

    def test_correct_credentials_returns_200(self, client):
        from flask_bcrypt import Bcrypt
        _bcrypt = Bcrypt(app)
        pw_hash = _bcrypt.generate_password_hash("securepass1").decode("utf-8")

        mock_conn = make_mock_conn(
            ("Jamie", "O'Neill", pw_hash, 150, "jamie123", "novice", True, False)
        )
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.post("/login", data={
                "email": "jamie@example.com",
                "password": "securepass1",
            })
        assert r.status_code == 200
        data = r.get_json()
        assert data["success"] is True
        assert data["first_name"] == "Jamie"
        assert data["xp"] == 150

    def test_login_response_includes_level_and_rank(self, client):
        from flask_bcrypt import Bcrypt
        _bcrypt = Bcrypt(app)
        pw_hash = _bcrypt.generate_password_hash("pass1234").decode("utf-8")

        # 300 XP → level 3 → Intermediate
        mock_conn = make_mock_conn(
            ("Test", "User", pw_hash, 300, "testuser", "intermediate", False, True)
        )
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.post("/login", data={
                "email": "test@example.com",
                "password": "pass1234",
            })
        data = r.get_json()
        assert data["numeric_level"] == 3
        assert data["rank"] == "Intermediate"


# ── GET /user-info ────────────────────────────────────────────────────────────

class TestUserInfo:
    def test_missing_email_returns_400(self, client):
        r = client.get("/user-info")
        assert r.status_code == 400
        assert r.get_json()["success"] is False

    def test_unknown_email_returns_404(self, client):
        mock_conn = make_mock_conn(None)
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.get("/user-info?email=ghost@example.com")
        assert r.status_code == 404

    def test_known_user_returns_profile(self, client):
        from datetime import datetime
        mock_conn = make_mock_conn(
            ("Jamie", "O'Neill", 250, "jamie123", "jamie@example.com", "novice",
             datetime(2025, 9, 1))
        )
        with patch("auth_routes.get_db_connection", return_value=mock_conn):
            r = client.get("/user-info?email=jamie@example.com")
        assert r.status_code == 200
        data = r.get_json()
        assert data["success"] is True
        assert data["username"] == "jamie123"
        assert data["xp"] == 250
