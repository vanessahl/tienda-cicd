#!/usr/bin/env bash
# Elimina el entorno de liberación y sus volúmenes.
# Uso: scripts/destroy-environment.sh [staging]
set -euo pipefail

ENV_NAME="${1:-staging}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE=".env.${ENV_NAME}"
[[ -f "$ENV_FILE" ]] || ENV_FILE=".env.example"

docker compose -f docker-compose.staging.yml --env-file "$ENV_FILE" down -v --remove-orphans
echo "Entorno '${ENV_NAME}' eliminado."
