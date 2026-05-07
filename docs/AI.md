# AI Integration

## Setup

The backend integrates with [OpenRouter](https://openrouter.ai) to access AI models.

### Get an API key

1. Sign up at https://openrouter.ai
2. Create an API key in your account settings

### Configure the key

Add it to the `.env` file in the project root:

```
OPENROUTER_API_KEY=sk-or-v1-...
```

Docker Compose loads this file automatically. For local backend dev (`uvicorn --reload`), export it in your shell:

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
```

## Model

All AI calls use `openai/gpt-oss-120b` via OpenRouter's OpenAI-compatible API.

## Test connectivity

Once the app is running, verify the AI connection:

```bash
curl http://localhost:8000/api/ai/test
# {"response": "4"}
```

A 502 response means the key is missing or invalid, or OpenRouter is unreachable.

## Chat endpoint

`POST /api/ai/chat` — requires the `Authorization: Bearer dummy-token` header.

**Request:**
```json
{ "message": "Move the bug fix card to In Progress" }
```

**Response:**
```json
{
  "message": "Moved 'Fix login bug' to In Progress.",
  "operations": [
    { "type": "move_card", "card_id": 5, "column_id": 2, "position": 0 }
  ],
  "board": { ... }
}
```

The response always includes the full updated board so the frontend can refresh in one round-trip.

### Operations

The AI can perform these board operations when asked:

| Type | Required fields |
|------|-----------------|
| `create_card` | `column_id`, `title`, `description` (optional) |
| `move_card` | `card_id`, `column_id`, `position` |
| `update_card` | `card_id`, `title` and/or `description` |
| `delete_card` | `card_id` |

Operations that fail (e.g., referencing a non-existent card) are silently skipped and omitted from the response.

### Conversation history

The backend stores conversation history in memory per user (capped at 20 messages). Each call to `/api/ai/chat` automatically includes prior messages so the AI has context. History resets when the server restarts.

## Prompt engineering

The system prompt sent to the AI includes:
- The current board state (all columns and cards with their IDs)
- The JSON response format the AI must follow
- Instructions to only perform operations the user explicitly requests

The board state is regenerated fresh on every call, so the AI always sees current data.

## Architecture

- `backend/app/ai.py` — `chat()`, `build_system_prompt()`, `format_board_context()`, `parse_ai_response()`, history management
- `backend/app/routes/ai.py` — `GET /api/ai/test`, `POST /api/ai/chat`
- `backend/app/models.py` — `CardOperation`, `ChatRequest`, `ChatResponse`

## Known limitations

- History is in-memory only — clears on server restart
- Operations that fail are silently skipped (errors logged server-side)
- Single user only (MVP constraint)
