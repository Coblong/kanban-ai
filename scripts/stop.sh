#!/bin/bash

# Stop script for Project Management MVP (Mac/Linux)
# Usage: ./scripts/stop.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🛑 Stopping Project Management MVP..."

# Navigate to project root
cd "$PROJECT_ROOT"

# Prefer 'docker compose' (plugin, bundled with Docker Desktop) over standalone 'docker-compose'
if docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo "❌ Neither 'docker compose' nor 'docker-compose' is available."
    exit 1
fi

# Stop Docker Compose
echo "🐳 Stopping Docker containers..."
$COMPOSE down

echo "✅ Application stopped successfully!"
