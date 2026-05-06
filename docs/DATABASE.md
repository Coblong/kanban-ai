# Database Schema & Design

## Overview

This document defines the SQLite database schema for the Project Management MVP. The design supports:

- **Current MVP**: Single user (hardcoded "user"/"password"), single board per user
- **Future scaling**: Multiple users, multiple boards per user, team features

## Design Philosophy

1. **Normalization**: 3NF to prevent data anomalies
2. **Auditability**: All tables have `created_at` and `updated_at` timestamps
3. **Ordering**: Explicit `position` fields maintain column and card order within columns
4. **Simplicity**: No complex constraints; rely on application logic for validation
5. **Extensibility**: Schema designed to support future features (sharing, permissions, templates)

## Schema Tables

### users

Stores user account information.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Support multi-user system in future. MVP hardcodes credentials but uses this table.

**Fields**:

- `id`: Unique identifier
- `email`: User's email (unique), used as login identifier
- `password_hash`: Hashed password (bcrypt in production)
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp

**Indexes**: `UNIQUE(email)`

---

### kanban_boards

Stores Kanban boards owned by users.

```sql
CREATE TABLE kanban_boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT 'My Board',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Purpose**: One board per user (MVP). Future: multiple boards per user.

**Fields**:

- `id`: Unique identifier
- `user_id`: Owner of the board
- `title`: Board name (editable)
- `created_at`: Board creation timestamp
- `updated_at`: Last board update timestamp

**Indexes**: `FK(user_id)`, consider `UNIQUE(user_id)` for MVP (one board per user)

---

### kanban_columns

Stores columns within a Kanban board (e.g., "To Do", "In Progress", "Done").

```sql
CREATE TABLE kanban_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE
);
```

**Purpose**: Store column metadata and ordering.

**Fields**:

- `id`: Unique identifier
- `board_id`: Parent board
- `title`: Column name (editable)
- `position`: Sort order (0-indexed), maintained by app logic
- `created_at`: Column creation timestamp
- `updated_at`: Last column update timestamp

**Indexes**: `FK(board_id)`, `UNIQUE(board_id, position)` to ensure no gaps

**Notes**:

- MVP creates 3 default columns: "To Do" (pos 0), "In Progress" (pos 1), "Done" (pos 2)
- Positions are maintained by application when columns are added/removed

---

### kanban_cards

Stores individual cards within columns.

```sql
CREATE TABLE kanban_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE
);
```

**Purpose**: Store card data and order within columns.

**Fields**:

- `id`: Unique identifier
- `column_id`: Parent column
- `title`: Card title (required, editable)
- `description`: Card details (optional, editable)
- `position`: Sort order within column (0-indexed)
- `created_at`: Card creation timestamp
- `updated_at`: Last card update timestamp

**Indexes**: `FK(column_id)`, `UNIQUE(column_id, position)` to ensure no gaps

**Notes**:

- Position reordering handled by app when cards move or are added/deleted
- No explicit status field; status is implicit from `column_id`

---

## Relationships Diagram

```
users (1) ──── (N) kanban_boards
                     │
                     ├──── (N) kanban_columns
                     │           │
                     │           └──── (N) kanban_cards
```

**Cascade Delete**: Deleting a user cascades to boards, columns, and cards.

---

## Data Examples

### Sample users

```sql
INSERT INTO users (email, password_hash)
VALUES ('user', '$2b$12$...');  -- password: 'password' hashed
```

### Sample kanban_boards

```sql
INSERT INTO kanban_boards (user_id, title)
VALUES (1, 'My Board');
```

### Sample kanban_columns

```sql
INSERT INTO kanban_columns (board_id, title, position)
VALUES
    (1, 'To Do', 0),
    (1, 'In Progress', 1),
    (1, 'Done', 2);
```

### Sample kanban_cards

```sql
INSERT INTO kanban_cards (column_id, title, description, position)
VALUES
    (1, 'Design login page', 'Create mockups in Figma', 0),
    (1, 'Setup database', 'SQLite schema', 1),
    (2, 'Implement auth', 'JWT tokens', 0),
    (3, 'Deploy MVP', 'Docker container', 0);
```

---

## Initialization Strategy

### In Code (Recommended for MVP)

Python script using SQLAlchemy ORM:

1. Check if database exists and is initialized
2. If not, create tables from ORM models
3. If first-time setup, create default board and columns for hardcoded user
4. Idempotent: Running multiple times should not error

### Alembic Migrations (For Future)

When schema evolves, use Alembic for versioned migrations.

---

## Pydantic Models (TypeScript-equivalent JSON)

### User Model

```python
class User(BaseModel):
    id: int
    email: str
    created_at: datetime
    updated_at: datetime
```

### KanbanBoard Model

```python
class KanbanBoard(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
```

### KanbanColumn Model

```python
class KanbanColumn(BaseModel):
    id: int
    board_id: int
    title: str
    position: int
    created_at: datetime
    updated_at: datetime
```

### KanbanCard Model

```python
class KanbanCard(BaseModel):
    id: int
    column_id: int
    title: str
    description: Optional[str]
    position: int
    created_at: datetime
    updated_at: datetime
```

### Full Board Response

```python
class KanbanBoardFull(BaseModel):
    id: int
    user_id: int
    title: str
    columns: List[KanbanColumnFull]
    created_at: datetime
    updated_at: datetime

class KanbanColumnFull(BaseModel):
    id: int
    board_id: int
    title: str
    position: int
    cards: List[KanbanCard]
    created_at: datetime
    updated_at: datetime
```

---

## Notes on Design Decisions

1. **Explicit Positions**: Rather than relying on insertion order, we maintain explicit `position` fields for predictable ordering. This allows efficient reordering without cascading updates.

2. **Optional Description**: Card descriptions are nullable to keep the data model simple; users can leave cards without details.

3. **Soft Deletes**: For MVP, we use hard deletes (cascade). Future: consider soft deletes (archived cards/boards) for audit trails.

4. **No Status Enum**: Status is implicit from `column_id`. This keeps the schema flexible for future custom columns without schema changes.

5. **User-Friendly Emails**: We use plain `email` as the identifier for login, not a separate username. This simplifies authentication.

6. **Timestamps**: All tables have `created_at` and `updated_at` for audit purposes and potential future features (activity logs, undo).

---

## Testing the Schema

Sample SQL to verify schema is initialized and working:

```sql
-- Verify all tables exist
.tables

-- Check users table
SELECT COUNT(*) FROM users;

-- Check board structure
SELECT
    b.title as board_name,
    c.title as column_name,
    COUNT(k.id) as card_count
FROM kanban_boards b
LEFT JOIN kanban_columns c ON c.board_id = b.id
LEFT JOIN kanban_cards k ON k.column_id = c.id
GROUP BY b.id, c.id;
```
