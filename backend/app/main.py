import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for app startup/shutdown."""
    logger.info("Application starting up")
    # Initialize database on startup
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}", exc_info=True)
        raise
    yield
    logger.info("Application shutting down")


# Initialize FastAPI app
app = FastAPI(
    title="Project Management MVP API",
    description="Backend API for Kanban board with AI integration",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unexpected errors."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "error": str(exc)},
    )


# ============================================================================
# Health & Hello Endpoints
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    logger.info("Health check called")
    return {"status": "ok"}


@app.get("/api/hello")
async def hello():
    """Example endpoint returning a hello message."""
    logger.info("Hello endpoint called")
    return {"message": "hello world"}


# ============================================================================
# Authentication Endpoints
# ============================================================================

@app.post("/api/auth/login")
async def login(credentials: dict):
    """Authenticate user with hardcoded credentials."""
    username = credentials.get("username")
    password = credentials.get("password")

    if username == "user" and password == "password":
        logger.info(f"User {username} logged in successfully")
        return {"message": "Login successful", "token": "dummy-token"}
    else:
        logger.warning(f"Failed login attempt for user: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )


@app.post("/api/auth/logout")
async def logout():
    """Logout endpoint - for MVP, just return success."""
    logger.info("User logged out")
    return {"message": "Logout successful"}

# Import FileResponse for serving HTML
from fastapi.responses import FileResponse
from .routes.board import router as board_router
from .routes.ai import router as ai_router

app.include_router(board_router)
app.include_router(ai_router)

# Serve static frontend files from Next.js build
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "out")
if os.path.exists(frontend_dir):
    # Mount _next static assets
    app.mount("/_next", StaticFiles(directory=os.path.join(frontend_dir, "_next")), name="next_static")
    logger.info(f"Mounted Next.js static files from {frontend_dir}")

@app.get("/")
async def root():
    """Serve the frontend index page."""
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    else:
        # Fallback if index.html not found
        return {
            "message": "Project Management MVP",
            "docs": "/docs",
            "status": "Frontend not built yet - run 'npm run build' in frontend/",
        }

@app.get("/{path:path}")
async def catch_all(path: str):
    """Catch-all route for client-side routing and static files."""
    # Don't serve API routes through this catch-all
    if path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Try to serve static file first
    static_path = os.path.join(frontend_dir, path)
    if os.path.exists(static_path):
        if os.path.isfile(static_path):
            if path.endswith('.html'):
                return FileResponse(static_path, media_type="text/html")
            else:
                return FileResponse(static_path)
        elif os.path.isdir(static_path):
            # Check for index.html in directory
            index_path = os.path.join(static_path, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path, media_type="text/html")
    
    # For client-side routing, serve index.html
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail="Frontend not built")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
    )
