"""Authentication utilities: password hashing and session token management."""

import hashlib
import hmac
import secrets
from sqlite3 import Connection


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}:{key.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a stored hash. Handles legacy plaintext hashes."""
    if ":" not in password_hash:
        return hmac.compare_digest(password, password_hash)
    salt, stored_key = password_hash.split(":", 1)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return hmac.compare_digest(key.hex(), stored_key)


def create_session(conn: Connection, user_id: int) -> str:
    """Create a new session token for a user and persist it."""
    token = secrets.token_hex(32)
    conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    conn.commit()
    return token


def get_user_id_from_token(conn: Connection, token: str) -> int | None:
    """Return the user_id for a valid session token, or None."""
    row = conn.execute("SELECT user_id FROM sessions WHERE token = ?", (token,)).fetchone()
    return row[0] if row else None


def delete_session(conn: Connection, token: str) -> None:
    """Invalidate a session token."""
    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
