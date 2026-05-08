"""Board, column, and card API routes."""

from sqlite3 import Connection
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status

from ..auth import get_user_id_from_token
from ..db import get_db
from ..models import (
    Board, BoardCreate, BoardFull, BoardUpdate,
    Card, CardCreate, CardMove, CardUpdate,
    ColumnCreate, ColumnUpdate, ColumnWithCards,
)

router = APIRouter(prefix="/api")


def get_current_user_id(authorization: Optional[str] = Header(None), conn: Connection = Depends(get_db)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    user_id = get_user_id_from_token(conn, token)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return user_id


def _row(conn: Connection, sql: str, params: tuple = ()):
    row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def _rows(conn: Connection, sql: str, params: tuple = ()):
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def _fetch_full_board(conn: Connection, board_id: int, user_id: int) -> dict | None:
    board = _row(
        conn,
        "SELECT * FROM kanban_boards WHERE id = ? AND user_id = ?",
        (board_id, user_id),
    )
    if not board:
        return None
    columns = _rows(conn, "SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY position", (board["id"],))
    col_ids = tuple(col["id"] for col in columns)
    if col_ids:
        placeholders = ",".join("?" * len(col_ids))
        all_cards = _rows(
            conn,
            f"SELECT * FROM kanban_cards WHERE column_id IN ({placeholders}) ORDER BY column_id, position",
            col_ids,
        )
        cards_by_col: dict[int, list] = {cid: [] for cid in col_ids}
        for card in all_cards:
            cards_by_col[card["column_id"]].append(card)
        for col in columns:
            col["cards"] = cards_by_col[col["id"]]
    else:
        for col in columns:
            col["cards"] = []
    board["columns"] = columns
    return board


def _fetch_first_board(conn: Connection, user_id: int) -> dict | None:
    board = _row(conn, "SELECT * FROM kanban_boards WHERE user_id = ? ORDER BY created_at LIMIT 1", (user_id,))
    if not board:
        return None
    return _fetch_full_board(conn, board["id"], user_id)


# --- Board endpoints ---

@router.get("/boards", response_model=list[Board])
def list_boards(conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return _rows(conn, "SELECT * FROM kanban_boards WHERE user_id = ? ORDER BY created_at", (user_id,))


@router.post("/boards", response_model=BoardFull, status_code=status.HTTP_201_CREATED)
def create_board(body: BoardCreate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    cursor = conn.execute(
        "INSERT INTO kanban_boards (user_id, title, description, color) VALUES (?, ?, ?, ?)",
        (user_id, body.title, body.description, body.color),
    )
    board_id = cursor.lastrowid
    for pos, title in enumerate(["Backlog", "In Progress", "Review", "Done"]):
        conn.execute(
            "INSERT INTO kanban_columns (board_id, title, position) VALUES (?, ?, ?)",
            (board_id, title, pos),
        )
    conn.commit()
    return _fetch_full_board(conn, board_id, user_id)


@router.get("/boards/{board_id}", response_model=BoardFull)
def get_board_by_id(board_id: int, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    board = _fetch_full_board(conn, board_id, user_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@router.put("/boards/{board_id}", response_model=Board)
def update_board(board_id: int, body: BoardUpdate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    board = _row(conn, "SELECT * FROM kanban_boards WHERE id = ? AND user_id = ?", (board_id, user_id))
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    fields = {k: v for k, v in [("title", body.title), ("description", body.description), ("color", body.color)] if v is not None}
    if fields:
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        conn.execute(
            f"UPDATE kanban_boards SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (*fields.values(), board_id),
        )
        conn.commit()
    return _row(conn, "SELECT * FROM kanban_boards WHERE id = ?", (board_id,))


@router.delete("/boards/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_board(board_id: int, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    board = _row(conn, "SELECT * FROM kanban_boards WHERE id = ? AND user_id = ?", (board_id, user_id))
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    conn.execute("DELETE FROM kanban_boards WHERE id = ?", (board_id,))
    conn.commit()


# Backward-compat: returns the first board
@router.get("/board", response_model=BoardFull)
def get_board(conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    board = _fetch_first_board(conn, user_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


# --- Column endpoints ---

@router.post("/columns", response_model=ColumnWithCards, status_code=status.HTTP_201_CREATED)
def create_column(body: ColumnCreate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    board = _row(conn, "SELECT * FROM kanban_boards WHERE id = ? AND user_id = ?", (body.board_id, user_id))
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    next_pos = conn.execute(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM kanban_columns WHERE board_id = ?",
        (body.board_id,),
    ).fetchone()[0]
    cursor = conn.execute(
        "INSERT INTO kanban_columns (board_id, title, position) VALUES (?, ?, ?)",
        (body.board_id, body.title, next_pos),
    )
    col_id = cursor.lastrowid
    conn.commit()
    col = _row(conn, "SELECT * FROM kanban_columns WHERE id = ?", (col_id,))
    col["cards"] = []
    return col


@router.put("/column/{column_id}", response_model=ColumnWithCards)
def rename_column(column_id: int, update: ColumnUpdate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    col = _row(
        conn,
        "SELECT c.* FROM kanban_columns c JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE c.id = ? AND b.user_id = ?",
        (column_id, user_id),
    )
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    if update.title is not None:
        conn.execute(
            "UPDATE kanban_columns SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (update.title, column_id),
        )
        conn.commit()
    col = _row(conn, "SELECT * FROM kanban_columns WHERE id = ?", (column_id,))
    col["cards"] = _rows(conn, "SELECT * FROM kanban_cards WHERE column_id = ? ORDER BY position", (column_id,))
    return col


@router.delete("/column/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_column(column_id: int, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    col = _row(
        conn,
        "SELECT c.* FROM kanban_columns c JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE c.id = ? AND b.user_id = ?",
        (column_id, user_id),
    )
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")
    conn.execute("DELETE FROM kanban_columns WHERE id = ?", (column_id,))
    conn.commit()


# --- Card endpoints ---

@router.post("/card", response_model=Card, status_code=status.HTTP_201_CREATED)
def create_card(card: CardCreate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    if not _row(
        conn,
        "SELECT c.id FROM kanban_columns c JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE c.id = ? AND b.user_id = ?",
        (card.column_id, user_id),
    ):
        raise HTTPException(status_code=404, detail="Column not found")

    next_pos = conn.execute(
        "SELECT COALESCE(MAX(position), -1) + 1 FROM kanban_cards WHERE column_id = ?",
        (card.column_id,),
    ).fetchone()[0]

    cursor = conn.execute(
        "INSERT INTO kanban_cards (column_id, title, description, position) VALUES (?, ?, ?, ?)",
        (card.column_id, card.title, card.description, next_pos),
    )
    new_id = cursor.lastrowid
    conn.commit()
    return _row(conn, "SELECT * FROM kanban_cards WHERE id = ?", (new_id,))


@router.put("/card/{card_id}", response_model=Card)
def update_card(card_id: int, update: CardUpdate, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    card = _row(
        conn,
        "SELECT k.* FROM kanban_cards k "
        "JOIN kanban_columns c ON c.id = k.column_id "
        "JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE k.id = ? AND b.user_id = ?",
        (card_id, user_id),
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    fields = {k: v for k, v in [("title", update.title), ("description", update.description)] if v is not None}
    if fields:
        set_clause = ", ".join(f"{k} = ?" for k in fields)
        conn.execute(
            f"UPDATE kanban_cards SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (*fields.values(), card_id),
        )
        conn.commit()
    return _row(conn, "SELECT * FROM kanban_cards WHERE id = ?", (card_id,))


@router.delete("/card/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: int, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    card = _row(
        conn,
        "SELECT k.* FROM kanban_cards k "
        "JOIN kanban_columns c ON c.id = k.column_id "
        "JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE k.id = ? AND b.user_id = ?",
        (card_id, user_id),
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    conn.execute("DELETE FROM kanban_cards WHERE id = ?", (card_id,))
    conn.execute(
        "UPDATE kanban_cards SET position = position - 1, updated_at = CURRENT_TIMESTAMP "
        "WHERE column_id = ? AND position > ?",
        (card["column_id"], card["position"]),
    )
    conn.commit()


@router.put("/card/{card_id}/move", response_model=Card)
def move_card(card_id: int, move: CardMove, conn: Connection = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    card = _row(
        conn,
        "SELECT k.* FROM kanban_cards k "
        "JOIN kanban_columns c ON c.id = k.column_id "
        "JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE k.id = ? AND b.user_id = ?",
        (card_id, user_id),
    )
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if not _row(
        conn,
        "SELECT c.id FROM kanban_columns c JOIN kanban_boards b ON b.id = c.board_id "
        "WHERE c.id = ? AND b.user_id = ?",
        (move.column_id, user_id),
    ):
        raise HTTPException(status_code=404, detail="Target column not found")

    src_col, src_pos = card["column_id"], card["position"]
    dst_col = move.column_id
    count = conn.execute("SELECT COUNT(*) FROM kanban_cards WHERE column_id = ?", (dst_col,)).fetchone()[0]
    max_pos = count - 1 if src_col == dst_col else count
    dst_pos = max(0, min(move.position, max(0, max_pos)))

    if src_col == dst_col and src_pos == dst_pos:
        return card

    if src_col == dst_col:
        if src_pos < dst_pos:
            conn.execute(
                "UPDATE kanban_cards SET position = position - 1, updated_at = CURRENT_TIMESTAMP "
                "WHERE column_id = ? AND position > ? AND position <= ? AND id != ?",
                (src_col, src_pos, dst_pos, card_id),
            )
        else:
            conn.execute(
                "UPDATE kanban_cards SET position = position + 1, updated_at = CURRENT_TIMESTAMP "
                "WHERE column_id = ? AND position >= ? AND position < ? AND id != ?",
                (src_col, dst_pos, src_pos, card_id),
            )
    else:
        conn.execute(
            "UPDATE kanban_cards SET position = position - 1, updated_at = CURRENT_TIMESTAMP "
            "WHERE column_id = ? AND position > ?",
            (src_col, src_pos),
        )
        conn.execute(
            "UPDATE kanban_cards SET position = position + 1, updated_at = CURRENT_TIMESTAMP "
            "WHERE column_id = ? AND position >= ?",
            (dst_col, dst_pos),
        )

    conn.execute(
        "UPDATE kanban_cards SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (dst_col, dst_pos, card_id),
    )
    conn.commit()
    return _row(conn, "SELECT * FROM kanban_cards WHERE id = ?", (card_id,))
