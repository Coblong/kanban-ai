#!/bin/bash

# Stop script for Project Management MVP (Mac/Linux)
# Usage: ./scripts/stop.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🛑 Stopping Project Management MVP..."

# Navigate to project root
cd "$PROJECT_ROOT"

# Stop Docker Compose
echo "🐳 Stopping Docker containers..."
docker-compose down

echo "✅ Application stopped successfully!"
