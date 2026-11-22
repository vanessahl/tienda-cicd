#!/usr/bin/env bash
# Genera el entorno de liberación (staging): construye la imagen y levanta API + Prometheus.
# Uso: scripts/create-environment.sh [staging]
set -euo pipefail

ENV_NAME="${1:-staging}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

command -v docker >/dev/null || { echo "ERROR: Docker no está instalado." >&2; exit 1; }
docker compose version >/dev/null || { echo "ERROR: falta Docker Compose v2." >&2; exit 1; }

ENV_FILE=".env.${ENV_NAME}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Generando ${ENV_FILE} a partir de .env.example"
  sed "s/^APP_ENV=.*/APP_ENV=${ENV_NAME}/" .env.example > "$ENV_FILE"
fi

# Variables que puede inyectar el pipeline (versión e imagen).
export APP_VERSION="${APP_VERSION:-$(git rev-parse --short HEAD 2>/dev/null || echo local)}"

echo "Levantando el entorno '${ENV_NAME}' (versión ${APP_VERSION})..."
docker compose -f docker-compose.staging.yml --env-file "$ENV_FILE" up -d --build

PORT="$(grep -E '^APP_PORT=' "$ENV_FILE" | cut -d= -f2)"
./scripts/wait-for-health.sh "http://localhost:${PORT:-3000}" 60

echo "Entorno '${ENV_NAME}' listo: API en http://localhost:${PORT:-3000}"
