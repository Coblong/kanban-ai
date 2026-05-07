"""Tests for the AI client, prompt building, parsing, and history."""

import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.ai import (
    OpenRouterError,
    add_to_history,
    build_system_prompt,
    chat,
    clear_history,
    format_board_context,
    get_api_key,
    get_history,
    parse_ai_response,
)

client = TestClient(app)

SAMPLE_BOARD = {
    "title": "My Board",
    "columns": [
        {
            "id": 1,
            "title": "To Do",
            "cards": [
                {"id": 5, "title": "Fix bug", "description": "Urgent"},
                {"id": 6, "title": "Write tests", "description": None},
            ],
        },
        {"id": 2, "title": "Done", "cards": []},
    ],
}


class TestGetApiKey:
    def test_missing_key_raises(self, monkeypatch):
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        with pytest.raises(OpenRouterError, match="not configured"):
            get_api_key()

    def test_present_key_returned(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        assert get_api_key() == "test-key"


class TestChat:
    def _make_mock_client(self, response_data=None, side_effect=None):
        mock_response = MagicMock()
        mock_response.json.return_value = response_data or {
            "choices": [{"message": {"content": "4"}}]
        }
        mock_response.raise_for_status = MagicMock()
        mock_client = AsyncMock()
        if side_effect:
            mock_client.post = AsyncMock(side_effect=side_effect)
        else:
            mock_client.post = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        return mock_client

    @pytest.mark.asyncio
    async def test_chat_returns_content(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        mock_client = self._make_mock_client()
        with patch("app.ai.httpx.AsyncClient", return_value=mock_client):
            result = await chat([{"role": "user", "content": "2+2"}])
        assert result == "4"

    @pytest.mark.asyncio
    async def test_chat_sends_correct_request(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        mock_client = self._make_mock_client()
        with patch("app.ai.httpx.AsyncClient", return_value=mock_client):
            await chat([{"role": "user", "content": "hello"}], model="test-model")
        call_kwargs = mock_client.post.call_args
        assert call_kwargs.kwargs["json"]["model"] == "test-model"
        assert call_kwargs.kwargs["headers"]["Authorization"] == "Bearer test-key"

    @pytest.mark.asyncio
    async def test_chat_timeout_raises(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        mock_client = self._make_mock_client(side_effect=httpx.TimeoutException("timeout"))
        with patch("app.ai.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(OpenRouterError, match="timed out"):
                await chat([{"role": "user", "content": "2+2"}])

    @pytest.mark.asyncio
    async def test_chat_http_error_raises(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_client = self._make_mock_client(
            side_effect=httpx.HTTPStatusError("401", request=MagicMock(), response=mock_resp)
        )
        with patch("app.ai.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(OpenRouterError, match="API error: 401"):
                await chat([{"role": "user", "content": "2+2"}])

    @pytest.mark.asyncio
    async def test_chat_connection_error_raises(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        mock_client = self._make_mock_client(side_effect=httpx.ConnectError("connection refused"))
        with patch("app.ai.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(OpenRouterError, match="connection error"):
                await chat([{"role": "user", "content": "2+2"}])


class TestFormatBoardContext:
    def test_includes_board_title(self):
        ctx = format_board_context(SAMPLE_BOARD)
        assert "My Board" in ctx

    def test_includes_column_names_and_ids(self):
        ctx = format_board_context(SAMPLE_BOARD)
        assert "To Do (id: 1)" in ctx
        assert "Done (id: 2)" in ctx

    def test_includes_card_titles_and_ids(self):
        ctx = format_board_context(SAMPLE_BOARD)
        assert '"Fix bug" (id: 5)' in ctx
        assert '"Write tests" (id: 6)' in ctx

    def test_includes_card_description(self):
        ctx = format_board_context(SAMPLE_BOARD)
        assert "Urgent" in ctx

    def test_empty_column_shows_empty(self):
        ctx = format_board_context(SAMPLE_BOARD)
        assert "(empty)" in ctx

    def test_empty_board(self):
        ctx = format_board_context({"title": "Empty", "columns": []})
        assert "Empty" in ctx


class TestBuildSystemPrompt:
    def test_includes_board_context(self):
        prompt = build_system_prompt(SAMPLE_BOARD)
        assert "My Board" in prompt
        assert "To Do" in prompt
        assert "Fix bug" in prompt

    def test_includes_operation_instructions(self):
        prompt = build_system_prompt(SAMPLE_BOARD)
        assert "create_card" in prompt
        assert "move_card" in prompt
        assert "update_card" in prompt
        assert "delete_card" in prompt

    def test_includes_json_format_instruction(self):
        prompt = build_system_prompt(SAMPLE_BOARD)
        assert '"message"' in prompt
        assert '"operations"' in prompt


class TestParseAiResponse:
    def test_valid_response(self):
        raw = '{"message": "Done", "operations": []}'
        result = parse_ai_response(raw)
        assert result["message"] == "Done"
        assert result["operations"] == []

    def test_valid_with_operations(self):
        raw = '{"message": "Created a card", "operations": [{"type": "create_card", "column_id": 1, "title": "New"}]}'
        result = parse_ai_response(raw)
        assert len(result["operations"]) == 1
        assert result["operations"][0]["type"] == "create_card"

    def test_strips_markdown_code_fences(self):
        raw = '```json\n{"message": "Hi", "operations": []}\n```'
        result = parse_ai_response(raw)
        assert result["message"] == "Hi"

    def test_strips_code_fence_without_language(self):
        raw = '```\n{"message": "Hi", "operations": []}\n```'
        result = parse_ai_response(raw)
        assert result["message"] == "Hi"

    def test_invalid_json_raises(self):
        with pytest.raises(ValueError, match="not valid JSON"):
            parse_ai_response("not json")

    def test_missing_message_raises(self):
        with pytest.raises(ValueError, match="missing 'message'"):
            parse_ai_response('{"operations": []}')

    def test_missing_operations_raises(self):
        with pytest.raises(ValueError, match="missing 'operations'"):
            parse_ai_response('{"message": "Hi"}')

    def test_message_not_string_raises(self):
        with pytest.raises(ValueError, match="missing 'message'"):
            parse_ai_response('{"message": 42, "operations": []}')


class TestConversationHistory:
    def setup_method(self):
        clear_history(99)

    def test_empty_history_returns_empty_list(self):
        assert get_history(99) == []

    def test_add_and_retrieve(self):
        add_to_history(99, "user", "hello")
        add_to_history(99, "assistant", "hi there")
        history = get_history(99)
        assert history == [
            {"role": "user", "content": "hello"},
            {"role": "assistant", "content": "hi there"},
        ]

    def test_history_is_copy(self):
        add_to_history(99, "user", "msg")
        h = get_history(99)
        h.append({"role": "user", "content": "tampered"})
        assert len(get_history(99)) == 1

    def test_capped_at_max(self):
        from app.ai import MAX_HISTORY_MESSAGES
        for i in range(MAX_HISTORY_MESSAGES + 5):
            add_to_history(99, "user", f"msg{i}")
        assert len(get_history(99)) == MAX_HISTORY_MESSAGES

    def test_cap_keeps_most_recent(self):
        from app.ai import MAX_HISTORY_MESSAGES
        for i in range(MAX_HISTORY_MESSAGES + 5):
            add_to_history(99, "user", f"msg{i}")
        history = get_history(99)
        assert history[0]["content"] == f"msg{5}"
        assert history[-1]["content"] == f"msg{MAX_HISTORY_MESSAGES + 4}"

    def test_clear_history(self):
        add_to_history(99, "user", "hello")
        clear_history(99)
        assert get_history(99) == []


class TestAiTestEndpoint:
    def test_success(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        with patch("app.routes.ai.chat", new=AsyncMock(return_value="4")):
            response = client.get("/api/ai/test")
        assert response.status_code == 200
        assert response.json() == {"response": "4"}

    def test_openrouter_error_returns_502(self, monkeypatch):
        monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
        with patch("app.routes.ai.chat", new=AsyncMock(side_effect=OpenRouterError("connection error"))):
            response = client.get("/api/ai/test")
        assert response.status_code == 502
        assert "connection error" in response.json()["detail"]

    def test_missing_key_returns_502(self, monkeypatch):
        monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
        response = client.get("/api/ai/test")
        assert response.status_code == 502
        assert "not configured" in response.json()["detail"]
