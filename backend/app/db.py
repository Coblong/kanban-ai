"""Database connection and initialization."""

import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime

# Database file location
DB_DIR = Path(__file__).parent.parent / "data"
DB_PATH = DB_DIR / "kanban.db"


def ensure_db_directory():
    """Create data directory if it doesn't exist."""
    DB_DIR.mkdir(parents=True, exist_ok=True)


def get_db_connection():
    """Get a SQLite connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # Enable foreign key constraints
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initialize database schema and seed default data if needed."""
    ensure_db_directory()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Read and execute schema
        schema_path = Path(__file__).parent / "schema.sql"
        with open(schema_path, "r") as f:
            schema_sql = f.read()
        
        # Execute schema (idempotent due to IF NOT EXISTS)
        cursor.executescript(schema_sql)
        
        # Seed default user and board if they don't exist
        cursor.execute("SELECT id FROM users WHERE email = ?", ("user",))
        if cursor.fetchone() is None:
            # Insert default user with password "password"
            # In production, this would be hashed; for MVP it's hardcoded
            cursor.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                ("user", "password")
            )
            user_id = cursor.lastrowid
            
            # Create default board
            cursor.execute(
                "INSERT INTO kanban_boards (user_id, title) VALUES (?, ?)",
                (user_id, "My Board")
            )
            board_id = cursor.lastrowid
            
            # Create default columns
            columns = [
                ("To Do", 0),
                ("In Progress", 1),
                ("Done", 2)
            ]
            for title, position in columns:
                cursor.execute(
                    "INSERT INTO kanban_columns (board_id, title, position) VALUES (?, ?, ?)",
                    (board_id, title, position)
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


@contextmanager
def get_db_session():
    """Context manager for database sessions."""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()


def dict_from_row(row):
    """Convert sqlite3.Row to dict."""
    if row is None:
        return None
    return dict(row)
