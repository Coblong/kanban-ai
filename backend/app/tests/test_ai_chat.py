"""Integration tests for POST /api/ai/chat — AI chat with board context and operations."""

import json
import sqlite3
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.ai import clear_history
from app.auth import hash_password
from app.db import get_db
from app.main import app

SCHEMA_PATH = Path(__file__).parent.parent / "schema.sql"
AUTH = {"Authorization": "Bearer test-token"}


@pytest.fixture
def client():
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
        INSERT INTO kanban_cards (id, column_id, title, description, position)
            VALUES (10, 1, 'Existing task', 'Some work', 0);
    """)
    app.dependency_overrides[get_db] = lambda: conn
    clear_history(1)
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    conn.close()


def ai_reply(message: str, operations: list | None = None) -> str:
    return json.dumps({"message": message, "operations": operations or []})


class TestChatEndpoint:
    def test_requires_auth(self, client):
        r = client.post("/api/ai/chat", json={"message": "hello"})
        assert r.status_code == 401

    def test_simple_message_no_operations(self, client):
        with patch("app.routes.ai.chat", new=AsyncMock(return_value=ai_reply("Hello!"))):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "hi"})
        assert r.status_code == 200
        data = r.json()
        assert data["message"] == "Hello!"
        assert data["operations"] == []
        assert data["board"] is None

    def test_returns_updated_board_after_operation(self, client):
        ops = [{"type": "create_card", "column_id": 1, "title": "Board check", "description": None}]
        with patch("app.routes.ai.chat", new=AsyncMock(return_value=ai_reply("Done", ops))):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "show board"})
        board = r.json()["board"]
        assert board["title"] == "My Board"
        assert len(board["columns"]) == 3

    def test_create_card_operation(self, client):
        ops = [{"type": "create_card", "column_id": 1, "title": "New task", "description": None}]
        with patch("app.routes.ai.chat", new=AsyncMock(return_value=ai_reply("Created it", ops))):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "add a card"})
        assert r.status_code == 200
        assert len(r.json()["operations"]) == 1
        # Verify card actually exists in board
        board = r.json()["board"]
        col1_cards = board["columns"][0]["cards"]
        assert any(c["title"] == "New task" for c in col1_cards)

    def test_move_card_operation(self, client):
        ops = [{"type": "move_card", "card_id": 10, "column_id": 2, "position": 0}]
        with patch("app.routes.ai.chat", new=AsyncMock(return_value=ai_reply("Moved it", ops))):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "move the task"})
        assert r.status_code == 200
        board = r.json()["board"]
        col2_cards = board["columns"][1]["cards"]
        assert any(c["title"] == "Existing task" for c in col2_cards)

    def test_update_card_operation(self, client):
        ops = [{"type": "update_card", "card_id": 10, "title": "Updated title", "description": None}]
        with patch("app.routes.ai.chat", new=AsyncMock(return_value=ai_reply("Updated", ops))):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "rename the task"})
        assert r.status_code == 200
        board = r.json()["board"]
        col1_cards = board["columns"][0]["cards"]
        assert any(c["title"] == "Updated title" for c in col1_cards)

    def test_delete_card_operation(self, client):
        ops = [{"type": "delete_card", "card_id": 10}]
        with patch("app.routes.ai.chat", new=AsyncMock(return_value=ai_reply("Deleted", ops))):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "delete the task"})
        assert r.status_code == 200
        board = r.json()["board"]
        col1_cards = board["columns"][0]["cards"]
        assert not any(c["id"] == 10 for c in col1_cards)

    def test_invalid_operation_skipped_gracefully(self, client):
        ops = [
            {"type": "delete_card", "card_id": 9999},  # non-existent card — skipped
            {"type": "create_card", "column_id": 1, "title": "Valid card", "description": None},
        ]
        with patch("app.routes.ai.chat", new=AsyncMock(return_value=ai_reply("Done", ops))):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "do stuff"})
        assert r.status_code == 200
        # Only the valid operation should be in executed list
        assert len(r.json()["operations"]) == 1
        assert r.json()["operations"][0]["type"] == "create_card"

    def test_ai_error_returns_502(self, client):
        from app.ai import OpenRouterError
        with patch("app.routes.ai.chat", new=AsyncMock(side_effect=OpenRouterError("timed out"))):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "hello"})
        assert r.status_code == 502
        assert "timed out" in r.json()["detail"]

    def test_malformed_ai_response_returns_502(self, client):
        with patch("app.routes.ai.chat", new=AsyncMock(return_value="not valid json")):
            r = client.post("/api/ai/chat", headers=AUTH, json={"message": "hello"})
        assert r.status_code == 502
        assert "invalid response" in r.json()["detail"]

    def test_conversation_history_updated(self, client):
        from app.ai import get_history
        with patch("app.routes.ai.chat", new=AsyncMock(return_value=ai_reply("Hi!"))):
            client.post("/api/ai/chat", headers=AUTH, json={"message": "hello"})
        history = get_history(1)
        assert len(history) == 2
        assert history[0] == {"role": "user", "content": "hello"}
        assert history[1]["role"] == "assistant"

    def test_history_included_in_subsequent_calls(self, client):
        calls = []

        async def mock_chat(messages, **kwargs):
            calls.append(messages)
            return ai_reply("response")

        with patch("app.routes.ai.chat", new=mock_chat):
            client.post("/api/ai/chat", headers=AUTH, json={"message": "first"})
            client.post("/api/ai/chat", headers=AUTH, json={"message": "second"})

        # Second call's messages should include the first user+assistant exchange
        second_call_messages = calls[1]
        roles = [m["role"] for m in second_call_messages]
        assert roles.count("user") >= 2  # system + prior user + current user

    def test_empty_message_rejected(self, client):
        r = client.post("/api/ai/chat", headers=AUTH, json={"message": ""})
        assert r.status_code == 422
