"""OpenRouter AI client, prompt building, response parsing, and conversation history."""

import json
import logging
import os

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "openai/gpt-oss-120b"
MAX_HISTORY_MESSAGES = 20

_SYSTEM_PROMPT_TEMPLATE = """\
You are an AI assistant helping manage a Kanban board. You can view the current board state and perform card operations when asked.

Current board state:
{board_context}

Always respond with valid JSON in exactly this format:
{{
  "message": "Your response to the user",
  "operations": []
}}

Available operations (add to "operations" when needed):
- Create card:  {{"type": "create_card",  "column_id": <int>, "title": "<str>", "description": "<str or null>"}}
- Move card:    {{"type": "move_card",    "card_id": <int>, "column_id": <int>, "position": <int>}}
- Update card:  {{"type": "update_card",  "card_id": <int>, "title": "<str or null>", "description": "<str or null>"}}
- Delete card:  {{"type": "delete_card",  "card_id": <int>}}

Rules:
- Always include both "message" and "operations" fields
- Use [] for operations if no board changes are needed
- Reference cards and columns by their IDs shown above
- Only perform operations the user explicitly requests"""

# In-memory conversation history per user: {user_id: [{role, content}, ...]}
_history: dict[int, list[dict]] = {}


class OpenRouterError(Exception):
    pass


def get_api_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise OpenRouterError("OPENROUTER_API_KEY not configured")
    return key


async def chat(messages: list[dict], model: str = MODEL) -> str:
    """Call OpenRouter chat completion and return the assistant message content."""
    api_key = get_api_key()

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{OPENROUTER_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": model, "messages": messages},
                timeout=30.0,
            )
            response.raise_for_status()
        except httpx.TimeoutException:
            raise OpenRouterError("AI request timed out")
        except httpx.HTTPStatusError as e:
            raise OpenRouterError(f"AI API error: {e.response.status_code}")
        except httpx.RequestError as e:
            raise OpenRouterError(f"AI connection error: {e}")

    data = response.json()
    return data["choices"][0]["message"]["content"]


def format_board_context(board: dict) -> str:
    """Format board data as readable text for the AI prompt."""
    lines = [f"Board: {board['title']}"]
    for col in board.get("columns", []):
        lines.append(f"\nColumn: {col['title']} (id: {col['id']})")
        cards = col.get("cards", [])
        if not cards:
            lines.append("  (empty)")
        for card in cards:
            desc = f" - {card['description']}" if card.get("description") else ""
            lines.append(f"  - \"{card['title']}\" (id: {card['id']}){desc}")
    return "\n".join(lines)


def build_system_prompt(board: dict) -> str:
    """Build the system prompt with current board state injected."""
    return _SYSTEM_PROMPT_TEMPLATE.format(board_context=format_board_context(board))


def parse_ai_response(raw: str) -> dict:
    """Parse structured JSON from AI response. Returns dict with 'message' and 'operations'."""
    text = raw.strip()
    # Strip markdown code fences if the model wraps the JSON
    if text.startswith("```"):
        lines = text.splitlines()
        start = 1
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[start:end])

    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"AI response is not valid JSON: {e}")

    if not isinstance(data.get("message"), str):
        raise ValueError("AI response missing 'message' string field")
    if not isinstance(data.get("operations"), list):
        raise ValueError("AI response missing 'operations' list field")

    return data


def get_history(user_id: int) -> list[dict]:
    """Return a copy of the conversation history for a user."""
    return list(_history.get(user_id, []))


def add_to_history(user_id: int, role: str, content: str) -> None:
    """Append a message to conversation history, capping at MAX_HISTORY_MESSAGES."""
    msgs = _history.setdefault(user_id, [])
    msgs.append({"role": role, "content": content})
    if len(msgs) > MAX_HISTORY_MESSAGES:
        _history[user_id] = msgs[-MAX_HISTORY_MESSAGES:]


def clear_history(user_id: int) -> None:
    """Clear conversation history for a user."""
    _history.pop(user_id, None)
