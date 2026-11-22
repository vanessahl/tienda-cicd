#!/usr/bin/env bash
# Espera a que la API responda en /health.
# Uso: scripts/wait-for-health.sh http://localhost:3000 [segundos_maximos]
set -euo pipefail

BASE_URL="${1:?Falta la URL base, ej. http://localhost:3000}"
TIMEOUT="${2:-60}"

echo "Esperando a que ${BASE_URL}/health responda (máx. ${TIMEOUT}s)..."
for ((i = 1; i <= TIMEOUT; i++)); do
  if curl -fsS "${BASE_URL}/health" >/dev/null 2>&1; then
    echo "OK: la API respondió después de ${i}s."
    exit 0
  fi
  sleep 1
done

echo "ERROR: la API no respondió en ${TIMEOUT}s." >&2
exit 1
