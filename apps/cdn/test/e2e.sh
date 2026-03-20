#!/usr/bin/env bash
# E2E test script for the SBX Image Service
# Prerequisites:
#   - docker compose up -d (MinIO + Redis)
#   - pnpm --filter img start:dev  (service running on port 3002)
#   - mc (MinIO client) installed: brew install minio/stable/mc
#
# Usage:
#   chmod +x apps/img/test/e2e.sh
#   ./apps/img/test/e2e.sh

set -e

BASE_URL="http://localhost:3002"
MINIO_ALIAS="sbx"
BUCKET="assets"
SPACE_ID="285923"
IMG_KEY="${SPACE_ID}/test.jpg"

GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

pass() { echo -e "${GREEN}✓ $1${RESET}"; }
fail() { echo -e "${RED}✗ $1${RESET}"; exit 1; }

check_status() {
  local label="$1"
  local url="$2"
  local expected_type="$3"

  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  content_type=$(curl -s -I "$url" | grep -i "^content-type:" | awk '{print $2}' | tr -d '\r')

  if [ "$status" != "200" ]; then
    fail "$label → HTTP $status (expected 200)"
  fi

  if [ -n "$expected_type" ] && [[ "$content_type" != *"$expected_type"* ]]; then
    fail "$label → Content-Type '$content_type' (expected '$expected_type')"
  fi

  pass "$label"
}

# ─── 1. MinIO setup ─────────────────────────────────────────────────────────
echo ""
echo "── MinIO setup ──────────────────────────────────────────────────────────"

mc alias set $MINIO_ALIAS http://localhost:9000 minioadmin minioadmin --quiet 2>/dev/null || \
  fail "mc alias set failed — is MinIO running? (docker compose up -d)"

mc mb --quiet "${MINIO_ALIAS}/${BUCKET}" 2>/dev/null || true
pass "Bucket '${BUCKET}' ready"

# Download a small test JPEG (100x100 red square via Sharp in Node)
node -e "
const sharp = require('sharp');
sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 100, b: 50 } } })
  .jpeg({ quality: 90 })
  .toFile('/tmp/sbx_test.jpg')
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
" 2>/dev/null || fail "Failed to create test image (is sharp installed?)"

mc cp /tmp/sbx_test.jpg "${MINIO_ALIAS}/${BUCKET}/${IMG_KEY}" --quiet
pass "Uploaded test image → ${BUCKET}/${IMG_KEY}"

# ─── 2. Basic requests ──────────────────────────────────────────────────────
echo ""
echo "── Basic requests ───────────────────────────────────────────────────────"

check_status "Original (no /m/)" \
  "${BASE_URL}/f/${IMG_KEY}"

check_status "Resize 200x150" \
  "${BASE_URL}/f/${IMG_KEY}/m/200x150"

check_status "Width only (600x0)" \
  "${BASE_URL}/f/${IMG_KEY}/m/600x0"

check_status "Height only (0x400)" \
  "${BASE_URL}/f/${IMG_KEY}/m/0x400"

# ─── 3. Flip ────────────────────────────────────────────────────────────────
echo ""
echo "── Flip ─────────────────────────────────────────────────────────────────"

check_status "Flip horizontal (-300x200)" \
  "${BASE_URL}/f/${IMG_KEY}/m/-300x200"

check_status "Flip vertical (300x-200)" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x-200"

# ─── 4. Crop ────────────────────────────────────────────────────────────────
echo ""
echo "── Crop ─────────────────────────────────────────────────────────────────"

check_status "Manual crop (100x50:600x400)" \
  "${BASE_URL}/f/${IMG_KEY}/m/100x50:600x400"

check_status "Smart crop" \
  "${BASE_URL}/f/${IMG_KEY}/m/200x200/smart"

# ─── 5. Fit-in ──────────────────────────────────────────────────────────────
echo ""
echo "── Fit-in ───────────────────────────────────────────────────────────────"

check_status "Fit-in 300x300" \
  "${BASE_URL}/f/${IMG_KEY}/m/fit-in/300x300"

check_status "Fit-in with fill color" \
  "${BASE_URL}/f/${IMG_KEY}/m/fit-in/300x300/filters:fill(CCCCCC)"

check_status "Fit-in transparent PNG" \
  "${BASE_URL}/f/${IMG_KEY}/m/fit-in/300x300/filters:fill(transparent):format(png)" \
  "image/png"

# ─── 6. Filters ─────────────────────────────────────────────────────────────
echo ""
echo "── Filters ──────────────────────────────────────────────────────────────"

check_status "Quality 80" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:quality(80)"

check_status "Quality 10 (low)" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:quality(10)"

check_status "Blur" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:blur(30)"

check_status "Blur with sigma" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:blur(30,50)"

check_status "Brightness +50" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:brightness(50)"

check_status "Brightness -50 (darken)" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:brightness(-50)"

check_status "Grayscale" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:grayscale()"

check_status "Rotate 90" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:rotate(90)"

check_status "Rotate 180" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:rotate(180)"

check_status "Rotate 270" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:rotate(270)"

check_status "No upscale" \
  "${BASE_URL}/f/${IMG_KEY}/m/800x0/filters:no_upscale()"

check_status "Focal point" \
  "${BASE_URL}/f/${IMG_KEY}/m/200x200/filters:focal(200x150:600x450)"

check_status "Rounded corners (white bg)" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:round_corner(20,255,255,255,0)"

check_status "Rounded corners (transparent PNG)" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:round_corner(20,0,0,0,1)" \
  "image/png"

# ─── 7. Format ──────────────────────────────────────────────────────────────
echo ""
echo "── Format ───────────────────────────────────────────────────────────────"

check_status "Force JPEG" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:format(jpeg)" \
  "image/jpeg"

check_status "Force WebP" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:format(webp)" \
  "image/webp"

check_status "Force PNG" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:format(png)" \
  "image/png"

check_status "Auto WebP (via Accept header)" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200" \
  # curl doesn't send image/webp by default, just check 200

# ─── 8. Chained filters ─────────────────────────────────────────────────────
echo ""
echo "── Chained filters ──────────────────────────────────────────────────────"

check_status "quality + grayscale + blur" \
  "${BASE_URL}/f/${IMG_KEY}/m/400x300/filters:quality(80):grayscale():blur(5)"

check_status "brightness + rotate + format" \
  "${BASE_URL}/f/${IMG_KEY}/m/300x200/filters:brightness(20):rotate(90):format(webp)" \
  "image/webp"

# ─── 9. Cache hit ───────────────────────────────────────────────────────────
echo ""
echo "── Cache ────────────────────────────────────────────────────────────────"
# Second request should be served from Redis
t1=$(curl -s -o /dev/null -w "%{time_total}" "${BASE_URL}/f/${IMG_KEY}/m/200x200/filters:quality(80)")
t2=$(curl -s -o /dev/null -w "%{time_total}" "${BASE_URL}/f/${IMG_KEY}/m/200x200/filters:quality(80)")
echo "  First request:  ${t1}s"
echo "  Second request: ${t2}s (should be faster — cache hit)"
pass "Cache timing comparison printed"

# ─── Done ───────────────────────────────────────────────────────────────────
echo ""
echo "All tests passed!"
