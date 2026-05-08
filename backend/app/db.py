import sqlite3
from pathlib import Path

from .auth import hash_password

DB_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DB_DIR / "kanban.db"


def get_db_connection():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _migrate(conn: sqlite3.Connection):
    """Apply incremental schema migrations to existing databases."""
    migrations = [
        "CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
    ]
    for sql in migrations:
        try:
            conn.execute(sql)
        except sqlite3.OperationalError:
            pass

    # Add optional columns that may be missing from older installs
    for table, col, defn in [
        ("users", "display_name", "TEXT"),
        ("kanban_boards", "description", "TEXT"),
    ]:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {defn}")
        except sqlite3.OperationalError:
            pass
    conn.commit()


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        schema_path = Path(__file__).parent / "schema.sql"
        with open(schema_path) as f:
            schema_sql = f.read()
        cursor.executescript(schema_sql)
        _migrate(conn)

        cursor.execute("SELECT id FROM users WHERE email = ?", ("user",))
        if cursor.fetchone() is None:
            cursor.execute(
                "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
                ("user", hash_password("password"), "Default User"),
            )
            user_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO kanban_boards (user_id, title) VALUES (?, ?)",
                (user_id, "My Board"),
            )
            board_id = cursor.lastrowid
            columns = [
                ("Backlog", 0),
                ("Discovery", 1),
                ("In Progress", 2),
                ("Review", 3),
                ("Done", 4),
            ]
            for title, position in columns:
                cursor.execute(
                    "INSERT INTO kanban_columns (board_id, title, position) VALUES (?, ?, ?)",
                    (board_id, title, position),
                )
            conn.commit()
    finally:
        conn.close()


def get_db():
    """FastAPI dependency: yields a database connection for the duration of a request."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
