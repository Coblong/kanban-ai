"""AI API routes."""

from fastapi import APIRouter, HTTPException

from ..ai import OpenRouterError, chat

router = APIRouter(prefix="/api/ai")


@router.get("/test")
async def test_ai():
    """Test AI connectivity with a simple math question."""
    try:
        response = await chat([{"role": "user", "content": "What is 2+2? Answer with just the number."}])
        return {"response": response}
    except OpenRouterError as e:
        raise HTTPException(status_code=502, detail=str(e))
