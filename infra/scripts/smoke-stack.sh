#!/usr/bin/env bash
# An isolated, disposable integration stack. Never points at a production DB.
set -euo pipefail
cd "$(dirname "$0")/../.."
project="openlintel-smoke-${$}"
work="$(mktemp -d)"
chmod 700 "$work"
export DATABASE_NETWORK="$project"
export DATABASE_URL="postgresql://postgres:$(openssl rand -hex 24)@smoke-postgres:5432/openlintel"
export AUTH_SECRET="$(openssl rand -hex 32)"
export JWT_SECRET="$(openssl rand -hex 32)"
export API_KEY_ENCRYPTION_SECRET="$(openssl rand -hex 32)"
export MEILI_MASTER_KEY="$(openssl rand -hex 32)"
export AUTH_URL=https://app.example.test
export NEXT_PUBLIC_COLLAB_SERVICE_URL=https://collab.example.test
export AWS_REGION=us-east-1 AWS_S3_BUCKET=disposable-smoke-bucket
export AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= AWS_SESSION_TOKEN=
export GITHUB_CLIENT_ID=disposable-smoke-oauth GITHUB_CLIENT_SECRET=disposable-smoke-oauth-secret
export BUILD_SHA="$(git rev-parse HEAD)"
export COMPOSE_PARALLEL_LIMIT=2
cat > "$work/override.yml" <<'YAML'
services:
  web:
    ports: ['127.0.0.1::3000']
  collaboration:
    ports: ['127.0.0.1::8009']
YAML
compose=(docker compose -p "$project" -f docker-compose.production.yml -f "$work/override.yml")
cleanup() {
  local code=$?
  if [ "$code" != 0 ]; then "${compose[@]}" ps -a; "${compose[@]}" logs --tail 50; fi
  "${compose[@]}" down --volumes --remove-orphans || true
  docker rm -f "$project-postgres" >/dev/null 2>&1 || true
  docker network rm "$project" >/dev/null 2>&1 || true
  rm -f "$work/override.yml"
  rmdir "$work"
  echo "SMOKE_EXIT=$code REVISION=$BUILD_SHA"
}
trap cleanup EXIT
"${compose[@]}" config --quiet
docker network create "$project"
# Password is passed without emitting the generated DATABASE_URL.
password="${DATABASE_URL#postgresql://postgres:}"
password="${password%@*}"
docker run -d --name "$project-postgres" --network "$project" --network-alias smoke-postgres \
  -e POSTGRES_PASSWORD="$password" -e POSTGRES_DB=openlintel postgres:16-alpine
for attempt in $(seq 1 30); do
  if docker exec "$project-postgres" pg_isready -U postgres; then break; fi
  sleep 2
done
"${compose[@]}" build
"${compose[@]}" up -d --wait --wait-timeout 180
"${compose[@]}" run --rm migrate
web="$("${compose[@]}" port web 3000)"
collab="$("${compose[@]}" port collaboration 8009)"
curl --fail "http://$web/api/health/ready"
curl --fail "http://$web/api/version"
curl --fail "http://$collab/health/ready"
test "$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://$web/api/payments/webhook")" = 503
echo 'All long-running containers healthy; migrations rerun successfully; billing rejected.'
