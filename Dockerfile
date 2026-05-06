# Multi-stage Dockerfile for Project Management MVP
# Stage 1: Frontend Build
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Copy frontend code
COPY frontend/package*.json ./
COPY frontend/tsconfig.json ./
COPY frontend/next.config.ts ./
COPY frontend/postcss.config.mjs ./
COPY frontend/eslint.config.mjs ./
COPY frontend/vitest.config.ts ./
COPY frontend/playwright.config.ts ./
COPY frontend/public ./public
COPY frontend/src ./src

# Install dependencies and build frontend
RUN npm ci
RUN npm run build

# Stage 2: Python Backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml and install dependencies using pip
COPY backend/pyproject.toml ./backend/
RUN cd backend && pip install -e .

# Copy backend code
COPY backend/app ./backend/app

# Copy frontend build from Stage 1
COPY --from=frontend-build /app/frontend/out ./frontend/out
COPY --from=frontend-build /app/frontend/public ./frontend/public

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
