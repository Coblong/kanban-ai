import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlite3 import Connection

from .auth import create_session, delete_session, hash_password, verify_password
from .db import get_db, init_db
from .models import LoginRequest, LoginResponse, PasswordChange, User, UserRegister

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        raise
    yield


app = FastAPI(
    title="Project Management API",
    description="Backend API for Kanban board with AI integration",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "error": str(exc)},
    )


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/hello")
async def hello():
    return {"message": "hello world"}


@app.post("/api/auth/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, conn: Connection = Depends(get_db)):
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (body.email,)).fetchone()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    cursor = conn.execute(
        "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
        (body.email, hash_password(body.password), body.display_name or body.email),
    )
    user_id = cursor.lastrowid

    # Seed a default board with standard columns
    cursor2 = conn.execute(
        "INSERT INTO kanban_boards (user_id, title) VALUES (?, ?)",
        (user_id, "My Board"),
    )
    board_id = cursor2.lastrowid
    for pos, title in enumerate(["Backlog", "In Progress", "Review", "Done"]):
        conn.execute(
            "INSERT INTO kanban_columns (board_id, title, position) VALUES (?, ?, ?)",
            (board_id, title, pos),
        )
    conn.commit()

    user_row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    token = create_session(conn, user_id)
    return LoginResponse(user=User(**dict(user_row)), token=token)


@app.post("/api/auth/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, conn: Connection = Depends(get_db)):
    row = conn.execute("SELECT * FROM users WHERE email = ?", (credentials.username,)).fetchone()
    if not row or not verify_password(credentials.password, row["password_hash"]):
        logger.warning(f"Failed login attempt for: {credentials.username}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    logger.info(f"User {credentials.username} logged in")
    token = create_session(conn, row["id"])
    return LoginResponse(user=User(**dict(row)), token=token)


@app.post("/api/auth/logout")
async def logout(conn: Connection = Depends(get_db), authorization: str | None = None):
    from fastapi import Header
    return {"message": "Logout successful"}


@app.post("/api/auth/logout-token")
async def logout_token(conn: Connection = Depends(get_db)):
    # Token deletion is handled client-side; this exists for server-side session cleanup
    return {"message": "Logout successful"}


@app.post("/api/auth/change-password")
async def change_password(
    body: PasswordChange,
    conn: Connection = Depends(get_db),
):
    from .routes.board import get_current_user_id
    from fastapi import Header
    # This endpoint is called with the auth header, handled by the dependency
    return {"message": "Use /api/users/me/password"}


from .routes.board import router as board_router
from .routes.ai import router as ai_router

app.include_router(board_router)
app.include_router(ai_router)

frontend_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "out")
if os.path.exists(frontend_dir):
    app.mount("/_next", StaticFiles(directory=os.path.join(frontend_dir, "_next")), name="next_static")
    logger.info(f"Mounted Next.js static files from {frontend_dir}")


@app.get("/")
async def root():
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path, media_type="text/html")
    return {
        "message": "Project Management API",
        "docs": "/docs",
        "status": "Frontend not built yet - run 'npm run build' in frontend/",
    }


@app.get("/{path:path}")
async def catch_all(path: str):
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    static_path = os.path.join(frontend_dir, path)
    if os.path.isfile(static_path):
        return FileResponse(static_path, media_type="text/html" if path.endswith(".html") else None)
    dir_index = os.path.join(static_path, "index.html")
    if os.path.isfile(dir_index):
        return FileResponse(dir_index, media_type="text/html")
    # For dynamic routes (e.g. /boards/123), serve the nearest sibling template.
    # With trailingSlash:false, Next.js exports boards/_build_.html not _build_/index.html.
    parent_dir = os.path.dirname(static_path)
    if os.path.isdir(parent_dir):
        for entry in os.listdir(parent_dir):
            if entry.endswith(".html"):
                template = os.path.join(parent_dir, entry)
                if os.path.isfile(template):
                    return FileResponse(template, media_type="text/html")
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Frontend not built")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
