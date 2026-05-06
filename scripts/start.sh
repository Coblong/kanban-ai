#!/bin/bash

# Start script for Project Management MVP (Mac/Linux)
# Usage: ./scripts/start.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting Project Management MVP..."
echo "Project root: $PROJECT_ROOT"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Prefer 'docker compose' (plugin, bundled with Docker Desktop) over standalone 'docker-compose'
if docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo "❌ Neither 'docker compose' nor 'docker-compose' is available. Please install Docker Desktop."
    exit 1
fi

# Navigate to project root
cd "$PROJECT_ROOT"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating one..."
    touch .env
    echo "Please add OPENROUTER_API_KEY to .env file"
fi

# Start Docker Compose
echo "🐳 Starting Docker containers..."
$COMPOSE up --build

echo "✅ Application is running!"
echo "   Frontend: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the application"
