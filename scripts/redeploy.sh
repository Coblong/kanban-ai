#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

"$SCRIPT_DIR/stop.sh"

cd "$PROJECT_ROOT"

if docker compose version &> /dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE="docker-compose"
else
    echo "Neither 'docker compose' nor 'docker-compose' is available."
    exit 1
fi

$COMPOSE build --no-cache
$COMPOSE up -d
