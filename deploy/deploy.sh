#!/bin/bash
# SBX Deploy Script
# Usage: ./deploy/deploy.sh [--skip-golden] [--skip-db]
# Run from the root of the monorepo on your local machine

set -e

SERVER="root@46.224.90.233"
APP_DIR="/opt/sbx"
SKIP_GOLDEN=false
SKIP_DB=false

for arg in "$@"; do
  [[ "$arg" == "--skip-golden" ]] && SKIP_GOLDEN=true
  [[ "$arg" == "--skip-db" ]] && SKIP_DB=true
done

echo "=== SBX Deploy ==="

# 1. Sync source code (exclude heavy/generated dirs)
echo ">>> Syncing code to server..."
rsync -az \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='dist' \
  --exclude='.DS_Store' \
  --exclude='golden' \
  --exclude='deploy/.env.prod' \
  ./ "$SERVER:$APP_DIR/"

# 2. Sync deploy config (including .env.prod)
echo ">>> Syncing deploy config..."
rsync -az deploy/.env.prod "$SERVER:$APP_DIR/deploy/.env.prod"

# 3. Export and upload local DB if not skipped
if [ "$SKIP_DB" = false ]; then
  echo ">>> Exporting local database..."
  pg_dump -U "${PGUSER:-$(whoami)}" -d sbx --clean --if-exists --no-owner --no-privileges -F custom -f /tmp/sbx-dump.pgcustom
  echo ">>> Uploading database dump..."
  scp /tmp/sbx-dump.pgcustom "$SERVER:/tmp/sbx-dump.pgcustom"
fi

# 4. Build and restart on server
echo ">>> Building and restarting on server..."
ssh "$SERVER" bash << 'REMOTE'
set -e
cd /opt/sbx

# Export deploy env so docker compose can substitute ${VAR} in compose file
set -a
# shellcheck disable=SC1091
source /opt/sbx/deploy/.env.prod
set +a

# Start/update infra
echo "--- Starting infrastructure..."
docker compose -f deploy/docker-compose.infra.yml up -d

# Wait for postgres to be ready
echo "--- Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  docker compose -f deploy/docker-compose.infra.yml exec -T postgres pg_isready -U sbx < /dev/null && break
  echo "  waiting... ($i)"
  sleep 2
done

# Restore DB from dump if present
if [ -f /tmp/sbx-dump.pgcustom ]; then
  echo "--- Restoring database from dump..."
  docker compose -f deploy/docker-compose.infra.yml exec -T postgres \
    pg_restore -U sbx -d sbx --clean --if-exists --no-owner --no-privileges /tmp/sbx-dump.pgcustom < /dev/null || true
  # pg_restore needs the file inside the container — use docker cp + exec instead
  docker cp /tmp/sbx-dump.pgcustom deploy-postgres-1:/tmp/sbx-dump.pgcustom
  docker compose -f deploy/docker-compose.infra.yml exec -T postgres \
    pg_restore -U sbx -d sbx --clean --if-exists --no-owner --no-privileges /tmp/sbx-dump.pgcustom < /dev/null || true
  echo "--- Database restored."
  rm -f /tmp/sbx-dump.pgcustom
fi

# Ensure MinIO bucket exists
echo "--- Ensuring MinIO bucket..."
docker run --rm --network host \
  -e MC_HOST_minio=http://minioadmin:minioadmin@localhost:9000 \
  minio/mc mb --ignore-existing minio/assets 2>/dev/null || true

# Install dependencies
echo "--- Installing dependencies..."
pnpm install --frozen-lockfile

# Build shared packages first
echo "--- Building shared packages..."
cd /opt/sbx
pnpm --filter @sbx/db build 2>/dev/null || true
pnpm --filter @sbx/jobs build 2>/dev/null || true
pnpm --filter @sbx/types build 2>/dev/null || true

# Build API
echo "--- Building API..."
cd /opt/sbx/apps/api
pnpm build

# Build CDN
echo "--- Building CDN..."
cd /opt/sbx/apps/cdn
pnpm build

# Build Workers
echo "--- Building Workers..."
cd /opt/sbx/apps/workers
pnpm build

# Build Admin
echo "--- Building Admin..."
cd /opt/sbx/apps/admin
grep -v '^#' /opt/sbx/deploy/.env.prod | grep -v '^$' > .env.production.local
pnpm build

# Build Demo
echo "--- Building Demo..."
cd /opt/sbx/apps/demo-nextjs
grep -v '^#' /opt/sbx/deploy/.env.prod | grep -v '^$' > .env.production.local
pnpm build

# Reload nginx
echo "--- Reloading nginx..."
nginx -t && systemctl reload nginx

# Start/restart apps with PM2
echo "--- Restarting apps..."
cd /opt/sbx
pm2 startOrRestart deploy/ecosystem.config.cjs --update-env
pm2 save

echo ""
echo "=== Deploy complete! ==="
pm2 list
REMOTE

# 5. Sync golden data (optional, can be slow ~10GB)
if [ "$SKIP_GOLDEN" = false ] && [ -d "golden" ]; then
  echo ">>> Syncing golden data (this may take a while)..."
  rsync -az --info=progress2 golden/ "$SERVER:$APP_DIR/golden/"
  echo ">>> Golden data synced."
fi

echo ""
echo "=== Done! ==="
echo "Admin: https://sb-x.online"
echo "API:   https://api.sb-x.online"
echo "CDN:   https://a.sb-x.online"
echo "Demo:  https://demo.sb-x.online"
