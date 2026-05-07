import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv, find_dotenv
load_dotenv(find_dotenv())

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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
    title="Project Management MVP API",
    description="Backend API for Kanban board with AI integration",
    version="0.1.0",
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


@app.post("/api/auth/login")
async def login(credentials: dict):
    username = credentials.get("username")
    password = credentials.get("password")
    if username == "user" and password == "password":
        logger.info(f"User {username} logged in successfully")
        return {"message": "Login successful", "token": "dummy-token"}
    logger.warning(f"Failed login attempt for user: {username}")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials"
    )


@app.post("/api/auth/logout")
async def logout():
    return {"message": "Logout successful"}


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
        "message": "Project Management MVP",
        "docs": "/docs",
        "status": "Frontend not built yet - run 'npm run build' in frontend/",
    }


@app.get("/{path:path}")
async def catch_all(path: str):
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    static_path = os.path.join(frontend_dir, path)
    if os.path.isfile(static_path):
        return FileResponse(static_path, media_type="text/html" if path.endswith('.html') else None)
    dir_index = os.path.join(static_path, "index.html")
    if os.path.isfile(dir_index):
        return FileResponse(dir_index, media_type="text/html")
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path, media_type="text/html")
    raise HTTPException(status_code=404, detail="Frontend not built")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
