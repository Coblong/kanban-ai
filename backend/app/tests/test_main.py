"""Tests for the main FastAPI application."""
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password
from app.db import get_db
from app.main import app

SCHEMA_PATH = Path(__file__).parent.parent / "schema.sql"


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.executescript(f"""
        INSERT INTO users (id, email, password_hash, display_name) VALUES (1, 'user', '{hash_password("password")}', 'Test User');
        INSERT INTO sessions (token, user_id) VALUES ('test-token', 1);
        INSERT INTO kanban_boards (id, user_id, title) VALUES (1, 1, 'My Board');
    """)
    yield conn
    conn.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


class TestHealth:
    def test_health_check(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


class TestHelloEndpoint:
    def test_hello_returns_message(self, client):
        r = client.get("/api/hello")
        assert r.status_code == 200
        assert r.json()["message"] == "hello world"


class TestOpenAPI:
    def test_openapi_schema_exists(self, client):
        r = client.get("/openapi.json")
        assert r.status_code == 200
        data = r.json()
        assert "openapi" in data
        assert "paths" in data


class TestAuthentication:
    def test_login_success(self, client):
        r = client.post("/api/auth/login", json={"username": "user", "password": "password"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "user"

    def test_login_invalid_credentials(self, client):
        r = client.post("/api/auth/login", json={"username": "user", "password": "wrong"})
        assert r.status_code == 401
        assert r.json()["detail"] == "Invalid credentials"

    def test_login_unknown_user(self, client):
        r = client.post("/api/auth/login", json={"username": "nobody", "password": "pass"})
        assert r.status_code == 401

    def test_logout(self, client):
        r = client.post("/api/auth/logout")
        assert r.status_code == 200
        assert r.json()["message"] == "Logout successful"

    def test_register_success(self, client):
        r = client.post(
            "/api/auth/register",
            json={"email": "newuser@example.com", "password": "securepass", "display_name": "New User"},
        )
        assert r.status_code == 201
        data = r.json()
        assert "token" in data
        assert data["user"]["email"] == "newuser@example.com"
        assert data["user"]["display_name"] == "New User"

    def test_register_duplicate_email(self, client):
        r = client.post(
            "/api/auth/register",
            json={"email": "user", "password": "securepass"},
        )
        assert r.status_code == 409

    def test_register_short_password(self, client):
        r = client.post(
            "/api/auth/register",
            json={"email": "new@example.com", "password": "abc"},
        )
        assert r.status_code == 422
