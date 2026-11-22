# tienda-api: liberación y despliegue continuo (CI/CD)

API de pedidos de ejemplo (Node.js, sin dependencias externas) usada como caso de estudio
para practicar un pipeline de integración, liberación y despliegue continuo.

## Estructura del repositorio

| Carpeta / archivo | Qué contiene |
|---|---|
| `src/` | Código de la API (`/health`, `/metrics`, `/orders`) |
| `tests/unit/` | Pruebas unitarias (se ejecutan con `npm test`) |
| `.github/workflows/ci-cd.yml` | **Scripts del pipeline** (GitHub Actions) |
| `Dockerfile`, `docker-compose.staging.yml`, `scripts/create-environment.sh`, `scripts/destroy-environment.sh` | **Generación del entorno de liberación** |
| `scripts/smoke-test.sh`, `scripts/wait-for-health.sh` | **Pruebas en el entorno de liberación** |
| `scripts/deploy.sh` | **Generación del despliegue** (staging y producción) |
| `monitoring/` | Configuración de Prometheus y alertas ligadas a los niveles de servicio |
| `.env.example` | Parámetros del entorno |

## Cómo funciona el pipeline

1. **Pruebas unitarias**: validan el código en cada push y cada pull request.
2. **Entorno de liberación**: crea el entorno con Docker Compose (API + Prometheus), corre las pruebas de humo y lo destruye.
3. **Publicar imagen** (solo `main`): sube la imagen a GitHub Container Registry.
4. **Despliegue a producción** (solo `main`): espera la aprobación manual, dispara el despliegue en Render y verifica con pruebas de humo.

## Probarlo en tu computadora

Requisitos: Node.js 20 o superior, Docker Desktop y Git Bash (en Windows).

```bash
npm test                              # pruebas unitarias
./scripts/create-environment.sh       # levanta el entorno staging
./scripts/smoke-test.sh http://localhost:3000
./scripts/destroy-environment.sh      # lo apaga
```

Prometheus queda en http://localhost:9090 y las métricas de la API en http://localhost:3000/metrics.

## Configurar la herramienta de liberación continua (GitHub Actions)

1. Crea un repositorio nuevo en GitHub y sube este proyecto a la rama `main`.
2. **Render** (producción): crea un *Web Service* desde tu repositorio, entorno *Docker*,
   y en *Settings → Auto-Deploy* elige **Off**. Copia el **Deploy Hook** y la URL pública del servicio.
3. En GitHub, ve a *Settings → Secrets and variables → Actions*:
   - Pestaña **Secrets** → `RENDER_DEPLOY_HOOK_URL` = el Deploy Hook de Render.
   - Pestaña **Variables** → `PRODUCTION_URL` = la URL pública (por ejemplo `https://tienda-api.onrender.com`).
4. En *Settings → Environments* crea el entorno **production** y agrega tu usuario como *Required reviewer*
   (así el despliegue pide aprobación manual).
5. Haz un push a `main` y revisa la pestaña **Actions**: verás las cuatro etapas del pipeline.

## Niveles de servicio

Disponibilidad mensual de 99.5 %, latencia p95 menor a 500 ms y tasa de errores 5xx menor a 1 %.
Las alertas en `monitoring/alerts.yml` vigilan estos objetivos. El detalle está en el documento del proyecto.
