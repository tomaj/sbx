#!/bin/bash
# SBX Deploy Script
# Usage: ./deploy/deploy.sh [--skip-golden]
# Run from the root of the monorepo on your local machine

set -e

SERVER="root@46.224.90.233"
APP_DIR="/opt/sbx"
SKIP_GOLDEN=false

for arg in "$@"; do
  [[ "$arg" == "--skip-golden" ]] && SKIP_GOLDEN=true
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

# 3. Build and restart on server
echo ">>> Building and restarting on server..."
ssh "$SERVER" bash << 'REMOTE'
set -e
cd /opt/sbx

# Start/update infra
echo "--- Starting infrastructure..."
docker compose -f deploy/docker-compose.infra.yml up -d

# Wait for postgres to be ready
echo "--- Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  docker compose -f deploy/docker-compose.infra.yml exec -T postgres pg_isready -U sbx && break
  echo "  waiting... ($i)"
  sleep 2
done

# Ensure MinIO bucket exists
echo "--- Ensuring MinIO bucket..."
docker run --rm --network host \
  -e MC_HOST_minio=http://minioadmin:minioadmin@localhost:9000 \
  minio/mc mb --ignore-existing minio/assets 2>/dev/null || true

# Install dependencies
echo "--- Installing dependencies..."
pnpm install --frozen-lockfile

# Build API
echo "--- Building API..."
cd /opt/sbx/apps/api
pnpm build

# Run DB migrations (via journal order)
echo "--- Running DB migrations..."
python3 -c "
import json, subprocess, os, sys
journal = json.load(open('/opt/sbx/apps/api/drizzle/meta/_journal.json'))
for entry in journal['entries']:
    sql_file = f\"/opt/sbx/apps/api/drizzle/{entry['tag']}.sql\"
    if os.path.exists(sql_file):
        with open(sql_file) as f:
            sql = f.read()
        result = subprocess.run(
            ['docker', 'compose', '-f', '/opt/sbx/deploy/docker-compose.infra.yml',
             'exec', '-T', 'postgres', 'psql', '-U', 'sbx', 'sbx'],
            input=sql, capture_output=True, text=True
        )
        print(f'  {entry[\"tag\"]}: OK')
"

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

# Reload nginx (certbot manages /etc/nginx/sites-available/sbx, do not overwrite)
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

# 4. Sync golden data (optional, can be slow ~10GB)
if [ "$SKIP_GOLDEN" = false ] && [ -d "golden" ]; then
  echo ">>> Syncing golden data (this may take a while)..."
  rsync -az --info=progress2 golden/ "$SERVER:$APP_DIR/golden/"
  echo ">>> Golden data synced."
fi

echo ""
echo "=== Done! ==="
echo "Admin: http://46.224.90.233"
echo "API:   http://46.224.90.233 (requests needing API subdomain)"
