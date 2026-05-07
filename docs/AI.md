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

## Architecture

- `backend/app/ai.py` — `chat()` function and `OpenRouterError` exception
- `backend/app/routes/ai.py` — `/api/ai/test` and (in Part 9) `/api/ai/chat`

The `chat()` function wraps `httpx.AsyncClient` with a 30-second timeout. All network failures surface as `OpenRouterError`; routes catch these and return HTTP 502.

## What's next (Part 9)

`POST /api/ai/chat` will accept a user message plus conversation history, inject the current board state as context, and return a structured JSON response that may include card operations (create/edit/move).
