"""Tests for the AI client and endpoints."""

import pytest
import httpx
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.ai import OpenRouterError, chat, get_api_key

client = TestClient(app)


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
        mock_client = self._make_mock_client(
            side_effect=httpx.ConnectError("connection refused")
        )
        with patch("app.ai.httpx.AsyncClient", return_value=mock_client):
            with pytest.raises(OpenRouterError, match="connection error"):
                await chat([{"role": "user", "content": "2+2"}])


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
