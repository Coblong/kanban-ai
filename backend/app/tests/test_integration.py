"""Integration tests: full request flows across auth, board, and card endpoints."""

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app

SCHEMA_PATH = Path(__file__).parent.parent / "schema.sql"
AUTH = {"Authorization": "Bearer dummy-token"}


@pytest.fixture
def client():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.executescript("""
        INSERT INTO users (id, email, password_hash) VALUES (1, 'user', 'password');
        INSERT INTO kanban_boards (id, user_id, title) VALUES (1, 1, 'My Board');
        INSERT INTO kanban_columns (id, board_id, title, position) VALUES (1, 1, 'To Do', 0);
        INSERT INTO kanban_columns (id, board_id, title, position) VALUES (2, 1, 'In Progress', 1);
        INSERT INTO kanban_columns (id, board_id, title, position) VALUES (3, 1, 'Done', 2);
    """)
    app.dependency_overrides[get_db] = lambda: conn
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    conn.close()


class TestFullBoardFlow:
    """Full flow: auth → get empty board → create cards → move → rename → delete."""

    def test_unauthenticated_requests_rejected(self, client):
        assert client.get("/api/board").status_code == 401
        assert client.post("/api/card", json={"column_id": 1, "title": "X"}).status_code == 401
        assert client.put("/api/card/1", json={"title": "X"}).status_code == 401
        assert client.delete("/api/card/1").status_code == 401
        assert client.put("/api/card/1/move", json={"column_id": 2, "position": 0}).status_code == 401
        assert client.put("/api/column/1", json={"title": "X"}).status_code == 401

    def test_login_then_access_board(self, client):
        # Login
        r = client.post("/api/auth/login", json={"username": "user", "password": "password"})
        assert r.status_code == 200
        assert r.json()["token"] == "dummy-token"

        # Fetch board
        r = client.get("/api/board", headers=AUTH)
        assert r.status_code == 200
        board = r.json()
        assert board["title"] == "My Board"
        assert len(board["columns"]) == 3
        assert all(col["cards"] == [] for col in board["columns"])

    def test_create_read_update_delete_card(self, client):
        # Create
        r = client.post("/api/card", headers=AUTH, json={"column_id": 1, "title": "Task 1", "description": "Do it"})
        assert r.status_code == 201
        card_id = r.json()["id"]
        assert r.json()["position"] == 0

        # Verify via board
        board = client.get("/api/board", headers=AUTH).json()
        assert len(board["columns"][0]["cards"]) == 1
        assert board["columns"][0]["cards"][0]["title"] == "Task 1"

        # Update
        r = client.put(f"/api/card/{card_id}", headers=AUTH, json={"title": "Task 1 Updated", "description": "Done"})
        assert r.status_code == 200
        assert r.json()["title"] == "Task 1 Updated"

        # Delete
        r = client.delete(f"/api/card/{card_id}", headers=AUTH)
        assert r.status_code == 204

        # Board should be empty again
        board = client.get("/api/board", headers=AUTH).json()
        assert board["columns"][0]["cards"] == []

    def test_move_card_across_columns_and_verify_board(self, client):
        # Create two cards in column 1
        r1 = client.post("/api/card", headers=AUTH, json={"column_id": 1, "title": "Alpha"})
        r2 = client.post("/api/card", headers=AUTH, json={"column_id": 1, "title": "Beta"})
        id1, id2 = r1.json()["id"], r2.json()["id"]

        # Move Alpha to column 2
        r = client.put(f"/api/card/{id1}/move", headers=AUTH, json={"column_id": 2, "position": 0})
        assert r.status_code == 200
        assert r.json()["column_id"] == 2

        # Board: col1 has only Beta at pos 0, col2 has Alpha at pos 0
        board = client.get("/api/board", headers=AUTH).json()
        col1 = next(c for c in board["columns"] if c["id"] == 1)
        col2 = next(c for c in board["columns"] if c["id"] == 2)
        assert len(col1["cards"]) == 1
        assert col1["cards"][0]["title"] == "Beta"
        assert col1["cards"][0]["position"] == 0
        assert len(col2["cards"]) == 1
        assert col2["cards"][0]["title"] == "Alpha"

    def test_rename_column_persists(self, client):
        r = client.put("/api/column/1", headers=AUTH, json={"title": "Backlog"})
        assert r.status_code == 200
        assert r.json()["title"] == "Backlog"

        board = client.get("/api/board", headers=AUTH).json()
        assert board["columns"][0]["title"] == "Backlog"

    def test_multiple_cards_ordering(self, client):
        # Create 3 cards, verify positions
        for title in ["A", "B", "C"]:
            client.post("/api/card", headers=AUTH, json={"column_id": 1, "title": title})

        board = client.get("/api/board", headers=AUTH).json()
        cards = board["columns"][0]["cards"]
        assert [c["title"] for c in cards] == ["A", "B", "C"]
        assert [c["position"] for c in cards] == [0, 1, 2]

        # Delete middle card, verify gap closes
        id_b = next(c["id"] for c in cards if c["title"] == "B")
        client.delete(f"/api/card/{id_b}", headers=AUTH)

        board = client.get("/api/board", headers=AUTH).json()
        cards = board["columns"][0]["cards"]
        assert [c["title"] for c in cards] == ["A", "C"]
        assert [c["position"] for c in cards] == [0, 1]
