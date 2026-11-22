#!/usr/bin/env bash
# Pruebas de humo en el entorno de liberación o producción.
# Uso: scripts/smoke-test.sh http://localhost:3000
set -uo pipefail

BASE_URL="${1:?Falta la URL base, ej. http://localhost:3000}"
FAILS=0

check() {  # check "descripción" esperado obtenido
  if [[ "$2" == "$3" ]]; then
    echo "  OK    $1"
  else
    echo "  FALLA $1 (esperado: $2, obtenido: $3)"
    FAILS=$((FAILS + 1))
  fi
}

echo "Pruebas de humo contra ${BASE_URL}"

code=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/health")
check "GET /health devuelve 200" 200 "$code"

resp=$(curl -s -w '\n%{http_code}' -X POST "${BASE_URL}/orders" \
  -H 'Content-Type: application/json' \
  -d '{"customer":"Prueba","items":[{"sku":"A1","qty":2,"price":10}]}')
code=$(tail -n1 <<<"$resp")
body=$(sed '$d' <<<"$resp")
check "POST /orders crea un pedido (201)" 201 "$code"

id=$(sed -n 's/.*"id":\([0-9]*\).*/\1/p' <<<"$body")
code=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/orders/${id:-0}")
check "GET /orders/:id encuentra el pedido (200)" 200 "$code"

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${BASE_URL}/orders" \
  -H 'Content-Type: application/json' -d '{"customer":""}')
check "POST /orders inválido devuelve 400" 400 "$code"

if curl -s "${BASE_URL}/metrics" | grep -q '^orders_created_total'; then
  check "GET /metrics expone orders_created_total" ok ok
else
  check "GET /metrics expone orders_created_total" ok falta
fi

start=$(date +%s%N)
curl -s -o /dev/null "${BASE_URL}/health"
ms=$(( ($(date +%s%N) - start) / 1000000 ))
if (( ms <= 500 )); then
  check "Latencia de /health <= 500 ms (${ms} ms)" ok ok
else
  check "Latencia de /health <= 500 ms (${ms} ms)" ok lenta
fi

if (( FAILS > 0 )); then
  echo "RESULTADO: ${FAILS} prueba(s) fallaron." >&2
  exit 1
fi
echo "RESULTADO: todas las pruebas de humo pasaron."
