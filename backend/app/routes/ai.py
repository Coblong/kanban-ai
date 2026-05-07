"""AI API routes."""

import logging
from sqlite3 import Connection
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from ..ai import (
    OpenRouterError,
    add_to_history,
    build_system_prompt,
    chat,
    get_history,
    parse_ai_response,
)
from ..db import get_db
from ..models import BoardFull, CardOperation, ChatRequest, ChatResponse
from .board import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai")


def _fetch_board(conn: Connection, user_id: int) -> Optional[dict]:
    board = conn.execute(
        "SELECT * FROM kanban_boards WHERE user_id = ?", (user_id,)
    ).fetchone()
    if not board:
        return None
    board = dict(board)
    columns = [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY position",
            (board["id"],),
        ).fetchall()
    ]
    for col in columns:
        col["cards"] = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM kanban_cards WHERE column_id = ? ORDER BY position",
                (col["id"],),
            ).fetchall()
        ]
    board["columns"] = columns
    return board


def _execute_operations(
    conn: Connection, user_id: int, ops: list[dict]
) -> list[CardOperation]:
    """Execute AI-requested operations. Returns those successfully executed."""
    from ..models import CardCreate, CardMove, CardUpdate
    from .board import (
        create_card as _create_card,
        delete_card as _delete_card,
        move_card as _move_card,
        update_card as _update_card,
    )

    executed = []
    for op in ops:
        op_type = op.get("type")
        try:
            if op_type == "create_card":
                _create_card(
                    CardCreate(
                        column_id=op["column_id"],
                        title=op["title"],
                        description=op.get("description"),
                    ),
                    conn=conn,
                    user_id=user_id,
                )
            elif op_type == "move_card":
                _move_card(
                    op["card_id"],
                    CardMove(column_id=op["column_id"], position=op.get("position", 0)),
                    conn=conn,
                    user_id=user_id,
                )
            elif op_type == "update_card":
                _update_card(
                    op["card_id"],
                    CardUpdate(title=op.get("title"), description=op.get("description")),
                    conn=conn,
                    user_id=user_id,
                )
            elif op_type == "delete_card":
                _delete_card(op["card_id"], conn=conn, user_id=user_id)
            else:
                logger.warning("Unknown AI operation type: %s", op_type)
                continue
            executed.append(CardOperation.model_validate(op))
        except Exception as e:
            logger.warning("Failed to execute AI operation %s: %s", op, e)

    return executed


@router.get("/test")
async def test_ai():
    """Test AI connectivity with a simple math question."""
    try:
        response = await chat(
            [{"role": "user", "content": "What is 2+2? Answer with just the number."}]
        )
        return {"response": response}
    except OpenRouterError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    conn: Connection = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """AI chat with board context. The AI may create, move, update, or delete cards."""
    board = _fetch_board(conn, user_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    history = get_history(user_id)
    messages = [
        {"role": "system", "content": build_system_prompt(board)},
        *history,
        {"role": "user", "content": request.message},
    ]

    try:
        raw_response = await chat(messages)
    except OpenRouterError as e:
        raise HTTPException(status_code=502, detail=str(e))

    try:
        parsed = parse_ai_response(raw_response)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=f"AI returned invalid response: {e}")

    executed_ops = _execute_operations(conn, user_id, parsed["operations"])

    add_to_history(user_id, "user", request.message)
    add_to_history(user_id, "assistant", raw_response)

    updated_board = _fetch_board(conn, user_id)

    return ChatResponse(
        message=parsed["message"],
        operations=executed_ops,
        board=BoardFull.model_validate(updated_board) if updated_board else None,
    )
