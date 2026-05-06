# Backend Setup Guide

## Overview

The backend is a **FastAPI** application serving the Project Management MVP API. It:

- Handles all API requests for the Kanban board (CRUD operations for cards, columns)
- Serves the built frontend static files
- Integrates with OpenRouter for AI functionality
- Persists data to SQLite database (in later phases)

## Tech Stack

- **Framework**: FastAPI 0.104.1
- **Server**: Uvicorn (ASGI server)
- **Python**: 3.11+
- **Package Manager**: uv (for fast dependency resolution)
- **Database**: SQLite (coming in Part 5)
- **AI**: OpenRouter API integration (coming in Part 8)

## Project Structure

```
backend/
├── app/
│   ├── __init__.py           # Package marker
│   ├── main.py               # FastAPI application entry point
│   ├── models/               # Pydantic models (coming in Part 5)
│   ├── routes/               # API route handlers (coming in Part 6)
│   ├── services/             # Business logic (coming in Part 6)
│   ├── db/                   # Database models & queries (coming in Part 5)
│   └── tests/                # Backend tests
├── pyproject.toml            # Project metadata & dependencies
└── requirements.txt          # Alternative pip requirements file
```

## Installation & Setup

### Prerequisites

- **Docker Desktop** (recommended) or Docker + Docker Compose installed
- **Python 3.11+** (if running locally without Docker)
- **uv** package manager (installed automatically in Docker)

### Running with Docker Compose (Recommended)

```bash
# From project root
./scripts/start.sh              # Mac/Linux
scripts\start.bat               # Windows

# Application starts at http://localhost:8000
# API documentation at http://localhost:8000/docs
```

The Docker setup:

1. Builds the frontend in a Node.js container
2. Installs Python dependencies with uv
3. Creates the final image with both frontend assets and backend code
4. Runs FastAPI on port 8000
5. Mounts source code volumes for live development

### Running Locally (Without Docker)

Requires Python 3.11+ and uv installed:

```bash
# Install uv (macOS/Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or install via pip
pip install uv

# Install dependencies
cd backend
uv pip install -e .

# Run the server
python -m uvicorn app.main:app --reload --port 8000
```

The app will be available at http://localhost:8000.

## API Endpoints

### Current (Part 2)

| Method | Endpoint        | Description                                             |
| ------ | --------------- | ------------------------------------------------------- |
| GET    | `/`             | Root endpoint with API info                             |
| GET    | `/health`       | Health check (used by Docker)                           |
| GET    | `/api/hello`    | Example endpoint returning `{"message": "hello world"}` |
| GET    | `/docs`         | Swagger UI (interactive API docs)                       |
| GET    | `/openapi.json` | OpenAPI schema                                          |

### Coming Later

**Part 6 (Backend API Routes & Persistence)**:

- `GET /api/board` - Fetch board for user
- `POST /api/card` - Create card
- `PUT /api/card/{id}` - Update card
- `DELETE /api/card/{id}` - Delete card
- `PUT /api/card/{id}/move` - Move card
- `PUT /api/column/{id}` - Rename column

**Part 8 (AI Connectivity)**:

- `GET /api/ai/test` - Test AI connectivity
- `POST /api/ai/chat` - Chat with AI about board

## Testing Connectivity

### Verify Backend is Running

```bash
# Health check
curl http://localhost:8000/health

# Expected output:
# {"status":"ok"}
```

### Test Hello Endpoint

```bash
curl http://localhost:8000/api/hello

# Expected output:
# {"message":"hello world"}
```

### View API Documentation

Open browser to: http://localhost:8000/docs

This shows interactive Swagger UI where you can test endpoints directly.

## Logging

All requests and events are logged to stdout with timestamps and log levels:

```
2024-05-05 10:30:45,123 - uvicorn.access - INFO - GET /api/hello 200
2024-05-05 10:30:46,456 - app - INFO - Health check called
```

Logs appear in the terminal/Docker container output.

## Error Handling

The backend includes:

- **Global exception handler**: Catches all unhandled errors and returns HTTP 500 with details
- **CORS middleware**: Allows frontend (any origin in dev) to make requests
- **Validation**: Pydantic validates all request payloads
- **Logging**: All errors are logged with full stack traces

Example error response:

```json
{
  "detail": "Internal server error",
  "error": "Detailed error message here"
}
```

## Environment Variables

Create a `.env` file in the project root:

```env
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

In Docker, this is automatically loaded from `.env` into the container.

## Development Workflow

### Live Reload (Local Development)

When running locally with `--reload` flag, the server restarts when code changes:

```bash
python -m uvicorn app.main:app --reload
```

### With Docker

Code changes in `backend/app/` are reflected immediately because of volume mounts in `docker-compose.yml`:

```yaml
volumes:
  - ./backend/app:/app/backend/app
```

Edit files, save, and the FastAPI app auto-reloads.

## Stopping the Application

```bash
# Stop Docker containers
./scripts/stop.sh                # Mac/Linux
scripts\stop.bat                 # Windows

# Or with Ctrl+C if running directly
```

## Troubleshooting

### Port 8000 Already in Use

```bash
# Find process using port 8000
lsof -i :8000              # Mac/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process or use a different port
# If using docker-compose, edit docker-compose.yml ports section
```

### Docker Build Fails

```bash
# Clean Docker cache and rebuild
docker-compose down --volumes
docker-compose up --build --remove-orphans
```

### Frontend Build Fails During Docker Build

Check that the frontend builds locally first:

```bash
cd frontend
npm install
npm run build
```

If that succeeds, the Docker build should too.

### Module Import Errors

Ensure dependencies are installed:

```bash
cd backend
uv pip install -e .
```

## Next Steps

- **Part 3**: Frontend will be integrated to serve static files from backend
- **Part 5**: Database schema and SQLite setup
- **Part 6**: Implement full CRUD API routes
- **Part 8**: AI integration with OpenRouter

## Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Uvicorn Documentation](https://www.uvicorn.org/)
- [Docker Documentation](https://docs.docker.com/)
- [uv Package Manager](https://astral.sh/uv/)
