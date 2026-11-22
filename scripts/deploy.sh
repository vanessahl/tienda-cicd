#!/usr/bin/env bash
# Genera el despliegue en el entorno indicado y lo verifica.
# Uso:
#   scripts/deploy.sh staging
#   RENDER_DEPLOY_HOOK_URL=... PRODUCTION_URL=https://mi-app.onrender.com scripts/deploy.sh production
set -euo pipefail

TARGET="${1:?Indica el destino: staging o production}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

case "$TARGET" in
  staging)
    ./scripts/create-environment.sh staging
    ./scripts/smoke-test.sh "http://localhost:${APP_PORT:-3000}"
    ;;

  production)
    : "${RENDER_DEPLOY_HOOK_URL:?Falta RENDER_DEPLOY_HOOK_URL (secreto del repositorio)}"
    : "${PRODUCTION_URL:?Falta PRODUCTION_URL (URL pública de la app)}"

    echo "Disparando el despliegue en producción..."
    curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL" >/dev/null

    # El despliegue tarda un poco; esperamos hasta 5 minutos.
    ./scripts/wait-for-health.sh "$PRODUCTION_URL" 300
    ./scripts/smoke-test.sh "$PRODUCTION_URL"
    ;;

  *)
    echo "Destino desconocido: $TARGET (usa staging o production)" >&2
    exit 1
    ;;
esac

echo "Despliegue en '${TARGET}' completado."
