"""OpenRouter AI client."""

import os
import httpx

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL = "openai/gpt-oss-120b"


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
