"""Board, column, and card API routes."""

from sqlite3 import Connection
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from ..db import get_db
from ..models import BoardFull, Card, CardCreate, CardMove, CardUpdate, ColumnUpdate

router = APIRouter(prefix="/api")


def get_current_user_id(authorization: Optional[str] = Header(None)) -> int:
    if not authorization or authorization != "Bearer dummy-token":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return 1  # hardcoded for MVP


def _row(conn: Connection, sql: str, params: tuple = ()):
    row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def _rows(conn: Connection, sql: str, params: tuple = ()):
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


@router.get("/board", response_model=BoardFull)
def get_board(conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    board = _row(conn, "SELECT * FROM kanban_boards WHERE user_id = ?", (user_id,))
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    columns = _rows(conn, "SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY position", (board["id"],))
    for col in columns:
        col["cards"] = _rows(conn, "SELECT * FROM kanban_cards WHERE column_id = ? ORDER BY position", (col["id"],))
    board["columns"] = columns
    return board


@router.post("/card", response_model=Card, status_code=status.HTTP_201_CREATED)
def create_card(card: CardCreate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    if not _row(conn,
        "SELECT c.id FROM kanban_columns c JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE c.id = ? AND b.user_id = ?",
        (card.column_id, user_id)):
        raise HTTPException(status_code=404, detail="Column not found")

    next_pos = conn.execute(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM kanban_cards WHERE column_id = ?",
        (card.column_id,)
    ).fetchone()[0]

    cursor = conn.execute(
        "INSERT INTO kanban_cards (column_id, title, description, position) VALUES (?, ?, ?, ?)",
        (card.column_id, card.title, card.description, next_pos)
    )
    new_id = cursor.lastrowid
    conn.commit()
    return _row(conn, "SELECT * FROM kanban_cards WHERE id = ?", (new_id,))


@router.put("/card/{card_id}", response_model=Card)
def update_card(card_id: int, update: CardUpdate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    card = _row(conn,
        "SELECT k.* FROM kanban_cards k "
        "JOIN kanban_columns c ON c.id = k.column_id "
        "JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE k.id = ? AND b.user_id = ?",
        (card_id, user_id))
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if update.title is not None:
        conn.execute(
            "UPDATE kanban_cards SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (update.title, card_id)
        )
    if update.description is not None:
        conn.execute(
            "UPDATE kanban_cards SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (update.description, card_id)
        )
    if update.title is not None or update.description is not None:
        conn.commit()

    return _row(conn, "SELECT * FROM kanban_cards WHERE id = ?", (card_id,))


@router.delete("/card/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: int, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    card = _row(conn,
        "SELECT k.* FROM kanban_cards k "
        "JOIN kanban_columns c ON c.id = k.column_id "
        "JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE k.id = ? AND b.user_id = ?",
        (card_id, user_id))
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    conn.execute("DELETE FROM kanban_cards WHERE id = ?", (card_id,))
    conn.execute(
        "UPDATE kanban_cards SET position = position - 1, updated_at = CURRENT_TIMESTAMP "
        "WHERE column_id = ? AND position > ?",
        (card["column_id"], card["position"])
    )
    conn.commit()


@router.put("/card/{card_id}/move", response_model=Card)
def move_card(card_id: int, move: CardMove, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    card = _row(conn,
        "SELECT k.* FROM kanban_cards k "
        "JOIN kanban_columns c ON c.id = k.column_id "
        "JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE k.id = ? AND b.user_id = ?",
        (card_id, user_id))
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if not _row(conn,
        "SELECT c.id FROM kanban_columns c JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE c.id = ? AND b.user_id = ?",
        (move.column_id, user_id)):
        raise HTTPException(status_code=404, detail="Target column not found")

    src_col, src_pos = card["column_id"], card["position"]
    dst_col = move.column_id
    count = conn.execute("SELECT COUNT(*) FROM kanban_cards WHERE column_id = ?", (dst_col,)).fetchone()[0]
    max_pos = count - 1 if src_col == dst_col else count
    dst_pos = max(0, min(move.position, max(0, max_pos)))

    if src_col == dst_col and src_pos == dst_pos:
        return card

    if src_col == dst_col:
        if src_pos < dst_pos:  # moving down: shift cards between src and dst up
            conn.execute(
                "UPDATE kanban_cards SET position = position - 1, updated_at = CURRENT_TIMESTAMP "
                "WHERE column_id = ? AND position > ? AND position <= ? AND id != ?",
                (src_col, src_pos, dst_pos, card_id)
            )
        else:  # moving up: shift cards between dst and src down
            conn.execute(
                "UPDATE kanban_cards SET position = position + 1, updated_at = CURRENT_TIMESTAMP "
                "WHERE column_id = ? AND position >= ? AND position < ? AND id != ?",
                (src_col, dst_pos, src_pos, card_id)
            )
    else:
        # Close gap in source column
        conn.execute(
            "UPDATE kanban_cards SET position = position - 1, updated_at = CURRENT_TIMESTAMP "
            "WHERE column_id = ? AND position > ?",
            (src_col, src_pos)
        )
        # Make room in destination column
        conn.execute(
            "UPDATE kanban_cards SET position = position + 1, updated_at = CURRENT_TIMESTAMP "
            "WHERE column_id = ? AND position >= ?",
            (dst_col, dst_pos)
        )

    conn.execute(
        "UPDATE kanban_cards SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (dst_col, dst_pos, card_id)
    )
    conn.commit()
    return _row(conn, "SELECT * FROM kanban_cards WHERE id = ?", (card_id,))


@router.put("/column/{column_id}")
def rename_column(column_id: int, update: ColumnUpdate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    col = _row(conn,
        "SELECT c.* FROM kanban_columns c JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE c.id = ? AND b.user_id = ?",
        (column_id, user_id))
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")

    if update.title is not None:
        conn.execute(
            "UPDATE kanban_columns SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (update.title, column_id)
        )
        conn.commit()

    return _row(conn, "SELECT * FROM kanban_columns WHERE id = ?", (column_id,))
