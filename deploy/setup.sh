#!/bin/bash
# One-time server setup script
# Run as root on a fresh Ubuntu 24.04 server

set -e

echo "=== SBX Server Setup ==="

# Update system
apt-get update -qq
apt-get upgrade -y -qq

# Install basics
apt-get install -y -qq curl wget git unzip nginx certbot python3-certbot-nginx ufw

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
apt-get install -y -qq docker-compose-plugin

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Install pnpm
corepack enable
corepack prepare pnpm@latest --activate

# Install PM2
npm install -g pm2
pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Create app directory
mkdir -p /opt/sbx

echo ""
echo "=== Setup complete! ==="
echo "Node: $(node --version)"
echo "pnpm: $(pnpm --version)"
echo "Docker: $(docker --version)"
echo "PM2: $(pm2 --version)"
