#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Manual / emergency deploy script for the self-hosted server.
# Run this directly on the server when you need to deploy without GitHub Actions.
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh [image_tag]        # default tag: latest
#
# Environment variables (can also be set in .env):
#   DOCKER_IMAGE   — Docker Hub image, e.g. youruser/fitinfinity
#   DEPLOY_PATH    — Absolute path to the project on the server
#   DATABASE_URL   — Postgres connection string
# =============================================================================

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
IMAGE_TAG="${1:-latest}"
DOCKER_IMAGE="${DOCKER_IMAGE:-youruser/fitinfinity}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/fitinfinity}"
LOG_FILE="${DEPLOY_PATH}/logs/deploy.log"

# ── Helpers ───────────────────────────────────────────────────────────────────
log() {
  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[${ts}] $*" | tee -a "${LOG_FILE}"
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
log "=============================="
log "Starting deploy — image: ${DOCKER_IMAGE}:${IMAGE_TAG}"
log "=============================="

if [ ! -f "${DEPLOY_PATH}/docker-compose.yml" ]; then
  log "ERROR: docker-compose.yml not found at ${DEPLOY_PATH}"
  exit 1
fi

cd "${DEPLOY_PATH}"

# ── Pull latest image ─────────────────────────────────────────────────────────
log "Pulling image ${DOCKER_IMAGE}:${IMAGE_TAG} …"
docker pull "${DOCKER_IMAGE}:${IMAGE_TAG}"

# ── Update the compose override to pin the new tag ────────────────────────────
log "Updating APP_IMAGE_TAG to ${IMAGE_TAG} …"
export APP_IMAGE_TAG="${IMAGE_TAG}"

# ── Database migrations ───────────────────────────────────────────────────────
log "Running Prisma migrations …"
docker compose run --rm \
  -e DATABASE_URL="${DATABASE_URL}" \
  app npx prisma migrate deploy

# ── Rolling restart of the app container ──────────────────────────────────────
log "Recreating app container …"
docker compose up -d --no-deps --force-recreate app

# ── Clean up old images ───────────────────────────────────────────────────────
log "Pruning dangling images …"
docker image prune -f

# ── Health check ──────────────────────────────────────────────────────────────
APP_URL="${APP_URL:-http://localhost:3099}"
log "Waiting 15 s for app to boot …"
sleep 15

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}" || true)
if [ "${HTTP_STATUS}" -ge 200 ] && [ "${HTTP_STATUS}" -lt 400 ]; then
  log "✅  Deploy succeeded — HTTP ${HTTP_STATUS}"
else
  log "⚠️   Health check returned HTTP ${HTTP_STATUS} — check container logs:"
  docker compose logs --tail=50 app
  exit 1
fi
