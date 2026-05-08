"""Tests for board, card, and column API routes."""

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password
from app.db import get_db
from app.main import app

SCHEMA_PATH = Path(__file__).parent.parent / "schema.sql"
AUTH = {"Authorization": "Bearer test-token"}


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    with open(SCHEMA_PATH) as f:
        conn.executescript(f.read())
    conn.executescript(f"""
        INSERT INTO users (id, email, password_hash) VALUES (1, 'user', '{hash_password("password")}');
        INSERT INTO sessions (token, user_id) VALUES ('test-token', 1);
        INSERT INTO kanban_boards (id, user_id, title) VALUES (1, 1, 'My Board');
        INSERT INTO kanban_columns (id, board_id, title, position) VALUES (1, 1, 'To Do', 0);
        INSERT INTO kanban_columns (id, board_id, title, position) VALUES (2, 1, 'In Progress', 1);
        INSERT INTO kanban_columns (id, board_id, title, position) VALUES (3, 1, 'Done', 2);
    """)
    yield conn
    conn.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def seed_cards(db, cards):
    """Helper to insert cards: list of (column_id, title, position)."""
    for col_id, title, pos in cards:
        db.execute(
            "INSERT INTO kanban_cards (column_id, title, position) VALUES (?, ?, ?)",
            (col_id, title, pos),
        )
    db.commit()


class TestListBoards:
    def test_success(self, client):
        r = client.get("/api/boards", headers=AUTH)
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["title"] == "My Board"

    def test_unauthorized(self, client):
        r = client.get("/api/boards")
        assert r.status_code == 401


class TestCreateBoard:
    def test_success(self, client):
        r = client.post("/api/boards", headers=AUTH, json={"title": "Sprint Board"})
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "Sprint Board"
        assert len(data["columns"]) == 4  # default columns

    def test_creates_default_columns(self, client):
        r = client.post("/api/boards", headers=AUTH, json={"title": "New Board"})
        assert r.status_code == 201
        cols = [c["title"] for c in r.json()["columns"]]
        assert "Backlog" in cols
        assert "Done" in cols

    def test_with_description(self, client):
        r = client.post("/api/boards", headers=AUTH, json={"title": "Board", "description": "My board"})
        assert r.status_code == 201
        assert r.json()["description"] == "My board"

    def test_unauthorized(self, client):
        r = client.post("/api/boards", json={"title": "Board"})
        assert r.status_code == 401


class TestGetBoard:
    def test_get_by_id(self, client):
        r = client.get("/api/boards/1", headers=AUTH)
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "My Board"
        assert len(data["columns"]) == 3

    def test_not_found(self, client):
        r = client.get("/api/boards/999", headers=AUTH)
        assert r.status_code == 404

    def test_returns_cards_in_columns(self, client, db):
        seed_cards(db, [(1, "Task A", 0), (1, "Task B", 1)])
        r = client.get("/api/boards/1", headers=AUTH)
        assert r.status_code == 200
        col = r.json()["columns"][0]
        assert len(col["cards"]) == 2

    def test_legacy_board_endpoint(self, client):
        r = client.get("/api/board", headers=AUTH)
        assert r.status_code == 200
        assert r.json()["title"] == "My Board"

    def test_unauthorized(self, client):
        r = client.get("/api/boards/1")
        assert r.status_code == 401


class TestUpdateBoard:
    def test_rename(self, client):
        r = client.put("/api/boards/1", headers=AUTH, json={"title": "Renamed Board"})
        assert r.status_code == 200
        assert r.json()["title"] == "Renamed Board"

    def test_not_found(self, client):
        r = client.put("/api/boards/999", headers=AUTH, json={"title": "X"})
        assert r.status_code == 404


class TestDeleteBoard:
    def test_success(self, client, db):
        r = client.delete("/api/boards/1", headers=AUTH)
        assert r.status_code == 204
        assert db.execute("SELECT COUNT(*) FROM kanban_boards").fetchone()[0] == 0

    def test_not_found(self, client):
        r = client.delete("/api/boards/999", headers=AUTH)
        assert r.status_code == 404


class TestCreateColumn:
    def test_success(self, client):
        r = client.post("/api/columns", headers=AUTH, json={"board_id": 1, "title": "New Column"})
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "New Column"
        assert data["position"] == 3  # after existing 3 columns

    def test_invalid_board(self, client):
        r = client.post("/api/columns", headers=AUTH, json={"board_id": 999, "title": "Col"})
        assert r.status_code == 404


class TestDeleteColumn:
    def test_success(self, client, db):
        r = client.delete("/api/column/1", headers=AUTH)
        assert r.status_code == 204
        assert db.execute("SELECT COUNT(*) FROM kanban_columns WHERE id = 1").fetchone()[0] == 0

    def test_not_found(self, client):
        r = client.delete("/api/column/999", headers=AUTH)
        assert r.status_code == 404


class TestCreateCard:
    def test_success(self, client):
        r = client.post("/api/card", headers=AUTH, json={"column_id": 1, "title": "New Card"})
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "New Card"
        assert data["column_id"] == 1
        assert data["position"] == 0

    def test_appends_to_existing_cards(self, client, db):
        seed_cards(db, [(1, "First", 0)])
        r = client.post("/api/card", headers=AUTH, json={"column_id": 1, "title": "Second"})
        assert r.status_code == 201
        assert r.json()["position"] == 1

    def test_with_description(self, client):
        r = client.post("/api/card", headers=AUTH, json={"column_id": 2, "title": "Card", "description": "Details"})
        assert r.status_code == 201
        assert r.json()["description"] == "Details"

    def test_invalid_column(self, client):
        r = client.post("/api/card", headers=AUTH, json={"column_id": 999, "title": "Card"})
        assert r.status_code == 404

    def test_unauthorized(self, client):
        r = client.post("/api/card", json={"column_id": 1, "title": "Card"})
        assert r.status_code == 401


class TestUpdateCard:
    def test_update_title(self, client, db):
        seed_cards(db, [(1, "Old Title", 0)])
        card_id = db.execute("SELECT id FROM kanban_cards LIMIT 1").fetchone()[0]
        r = client.put(f"/api/card/{card_id}", headers=AUTH, json={"title": "New Title"})
        assert r.status_code == 200
        assert r.json()["title"] == "New Title"

    def test_update_description(self, client, db):
        seed_cards(db, [(1, "Card", 0)])
        card_id = db.execute("SELECT id FROM kanban_cards LIMIT 1").fetchone()[0]
        r = client.put(f"/api/card/{card_id}", headers=AUTH, json={"description": "Updated"})
        assert r.status_code == 200
        assert r.json()["description"] == "Updated"

    def test_not_found(self, client):
        r = client.put("/api/card/999", headers=AUTH, json={"title": "X"})
        assert r.status_code == 404

    def test_unauthorized(self, client, db):
        seed_cards(db, [(1, "Card", 0)])
        card_id = db.execute("SELECT id FROM kanban_cards LIMIT 1").fetchone()[0]
        r = client.put(f"/api/card/{card_id}", json={"title": "X"})
        assert r.status_code == 401


class TestDeleteCard:
    def test_success(self, client, db):
        seed_cards(db, [(1, "Card", 0)])
        card_id = db.execute("SELECT id FROM kanban_cards LIMIT 1").fetchone()[0]
        r = client.delete(f"/api/card/{card_id}", headers=AUTH)
        assert r.status_code == 204
        assert db.execute("SELECT COUNT(*) FROM kanban_cards").fetchone()[0] == 0

    def test_reorders_remaining(self, client, db):
        seed_cards(db, [(1, "A", 0), (1, "B", 1), (1, "C", 2)])
        card_b_id = db.execute("SELECT id FROM kanban_cards WHERE title = 'B'").fetchone()[0]
        client.delete(f"/api/card/{card_b_id}", headers=AUTH)
        positions = [r[0] for r in db.execute("SELECT position FROM kanban_cards ORDER BY position").fetchall()]
        assert positions == [0, 1]

    def test_not_found(self, client):
        r = client.delete("/api/card/999", headers=AUTH)
        assert r.status_code == 404

    def test_unauthorized(self, client, db):
        seed_cards(db, [(1, "Card", 0)])
        card_id = db.execute("SELECT id FROM kanban_cards LIMIT 1").fetchone()[0]
        r = client.delete(f"/api/card/{card_id}")
        assert r.status_code == 401


class TestMoveCard:
    def test_move_to_different_column(self, client, db):
        seed_cards(db, [(1, "Card", 0)])
        card_id = db.execute("SELECT id FROM kanban_cards LIMIT 1").fetchone()[0]
        r = client.put(f"/api/card/{card_id}/move", headers=AUTH, json={"column_id": 2, "position": 0})
        assert r.status_code == 200
        data = r.json()
        assert data["column_id"] == 2
        assert data["position"] == 0

    def test_move_down_same_column(self, client, db):
        seed_cards(db, [(1, "A", 0), (1, "B", 1), (1, "C", 2), (1, "D", 3)])
        card_a_id = db.execute("SELECT id FROM kanban_cards WHERE title = 'A'").fetchone()[0]
        r = client.put(f"/api/card/{card_a_id}/move", headers=AUTH, json={"column_id": 1, "position": 2})
        assert r.status_code == 200
        assert r.json()["position"] == 2
        positions = {
            row[0]: row[1]
            for row in db.execute("SELECT title, position FROM kanban_cards ORDER BY position").fetchall()
        }
        assert positions == {"B": 0, "C": 1, "A": 2, "D": 3}

    def test_move_up_same_column(self, client, db):
        seed_cards(db, [(1, "A", 0), (1, "B", 1), (1, "C", 2), (1, "D", 3)])
        card_d_id = db.execute("SELECT id FROM kanban_cards WHERE title = 'D'").fetchone()[0]
        r = client.put(f"/api/card/{card_d_id}/move", headers=AUTH, json={"column_id": 1, "position": 1})
        assert r.status_code == 200
        assert r.json()["position"] == 1
        positions = {
            row[0]: row[1]
            for row in db.execute("SELECT title, position FROM kanban_cards ORDER BY position").fetchall()
        }
        assert positions == {"A": 0, "D": 1, "B": 2, "C": 3}

    def test_source_column_gap_closed(self, client, db):
        seed_cards(db, [(1, "A", 0), (1, "B", 1), (1, "C", 2)])
        card_b_id = db.execute("SELECT id FROM kanban_cards WHERE title = 'B'").fetchone()[0]
        client.put(f"/api/card/{card_b_id}/move", headers=AUTH, json={"column_id": 2, "position": 0})
        positions = [r[0] for r in db.execute(
            "SELECT position FROM kanban_cards WHERE column_id = 1 ORDER BY position"
        ).fetchall()]
        assert positions == [0, 1]

    def test_not_found(self, client):
        r = client.put("/api/card/999/move", headers=AUTH, json={"column_id": 1, "position": 0})
        assert r.status_code == 404

    def test_invalid_target_column(self, client, db):
        seed_cards(db, [(1, "Card", 0)])
        card_id = db.execute("SELECT id FROM kanban_cards LIMIT 1").fetchone()[0]
        r = client.put(f"/api/card/{card_id}/move", headers=AUTH, json={"column_id": 999, "position": 0})
        assert r.status_code == 404

    def test_unauthorized(self, client, db):
        seed_cards(db, [(1, "Card", 0)])
        card_id = db.execute("SELECT id FROM kanban_cards LIMIT 1").fetchone()[0]
        r = client.put(f"/api/card/{card_id}/move", json={"column_id": 2, "position": 0})
        assert r.status_code == 401


class TestRenameColumn:
    def test_success(self, client):
        r = client.put("/api/column/1", headers=AUTH, json={"title": "Backlog"})
        assert r.status_code == 200
        assert r.json()["title"] == "Backlog"

    def test_not_found(self, client):
        r = client.put("/api/column/999", headers=AUTH, json={"title": "X"})
        assert r.status_code == 404

    def test_unauthorized(self, client):
        r = client.put("/api/column/1", json={"title": "X"})
        assert r.status_code == 401
