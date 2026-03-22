#!/bin/bash
# Run this AFTER DNS for sb-x.online propagates to 46.224.90.233
# This sets up Let's Encrypt SSL certificates

set -e

DOMAIN="sb-x.online"
EMAIL="admin@sb-x.online"  # change to your email

echo "=== Setting up SSL for $DOMAIN ==="

# Get certificates for both domains
certbot --nginx \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  -d "api.$DOMAIN" \
  -d "demo.$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --redirect

# Test renewal
certbot renew --dry-run

echo "=== SSL setup complete! ==="
echo "Certificates will auto-renew via systemd timer."
