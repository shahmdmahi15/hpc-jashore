#!/usr/bin/env bash
# HPC Jashore — Lightsail Automated Server Provisioning Script
# Ubuntu 22.04 / 24.04 LTS
# Run this script directly on your AWS Lightsail instance:
#   bash deploy/scripts/setup-lightsail.sh
set -euo pipefail

DEPLOY_DIR="/var/www/hpc-jashore"
DEPLOY_USER="ubuntu"
DOMAIN="hpc.toufiquzzaman.com"

echo "=========================================================="
echo "🏥 HPC Jashore — Lightsail Automated Server Setup"
echo "=========================================================="

# 1. System Package Updates & Prerequisites
echo "📦 [1/8] Updating apt packages and installing system utilities..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y nginx certbot python3-certbot-nginx curl git sqlite3 build-essential ufw

# 2. Swap Memory Allocation (2GB swap prevents OOM during Turbopack builds)
echo "💾 [2/8] Checking swap space..."
if [ $(free -m | awk '/^Swap:/{print $2}') -eq 0 ]; then
  echo "Allocating 2GB swapfile..."
  if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
  fi
  sudo swapon /swapfile || true
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi
  echo "✅ Swap enabled."
else
  echo "✅ Swap already allocated."
fi

# 3. Node.js 22 LTS, pnpm 12, PM2
echo "⚡ [3/8] Installing Node.js 22 LTS, pnpm 12, and PM2..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

sudo corepack enable
sudo corepack prepare pnpm@12.14.0 --activate

sudo npm install -g pm2
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" || true

# 4. Directory Permissions & Repository Setup
echo "📂 [4/8] Preparing directory structure in $DEPLOY_DIR..."
sudo mkdir -p "$DEPLOY_DIR"
sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"

if [ ! -d "$DEPLOY_DIR/.git" ]; then
  echo "Cloning repository..."
  git clone https://github.com/shahmdmahi15/hpc-jashore.git "$DEPLOY_DIR"
fi

cd "$DEPLOY_DIR"
git fetch origin main
git checkout main
git pull origin main

mkdir -p data logs data/backups

# 5. Environment File Configuration
echo "⚙️ [5/8] Verifying backend environment..."
if [ ! -f "$DEPLOY_DIR/apps/api/.env" ]; then
  echo "Creating default production $DEPLOY_DIR/apps/api/.env..."
  JWT_ACCESS=$(openssl rand -hex 32)
  JWT_REFRESH=$(openssl rand -hex 32)
  GRANT_KEY=$(openssl rand -hex 32)
  WEBHOOK_SEC=$(openssl rand -hex 32)

  cat <<EOF > "$DEPLOY_DIR/apps/api/.env"
NODE_ENV=production
PORT=4000
APP_VERSION=0.1.0
DATABASE_PATH=$DEPLOY_DIR/data/hpc.db

JWT_ACCESS_SECRET=$JWT_ACCESS
JWT_REFRESH_SECRET=$JWT_REFRESH
GRANT_SECRET=$GRANT_KEY
UPDATE_WEBHOOK_SECRET=$WEBHOOK_SEC

CORS_ORIGINS=https://hpc.toufiquzzaman.com,http://hpc.toufiquzzaman.com,http://localhost:3000
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=
SMTP_FROM="HPC Jashore <no-reply@hpc.toufiquzzaman.com>"
EOF
  echo "Generated secure production JWT and Webhook secrets in apps/api/.env."
  echo "⚠️ Note your UPDATE_WEBHOOK_SECRET: $WEBHOOK_SEC"
fi

# 6. Install Dependencies & Build Application
echo "📦 [6/8] Installing dependencies and building production apps..."
export PATH="$HOME/.local/share/pnpm:/usr/local/bin:/usr/bin:/bin:$PATH"
pnpm install --frozen-lockfile || pnpm install
pnpm rebuild better-sqlite3

echo "Seeding initial clinic master database..."
if [ ! -f "$DEPLOY_DIR/data/hpc.db" ]; then
  pnpm --filter @hpc/api seed || true
fi

echo "Building API..."
NODE_OPTIONS="--max-old-space-size=2048" pnpm --filter @hpc/api build

echo "Building Web with Next.js Turbopack..."
NODE_OPTIONS="--max-old-space-size=2048" pnpm --filter @hpc/web build

# 7. Configure Nginx Reverse Proxy
echo "🌐 [7/8] Configuring Nginx reverse proxy..."
if [ -f "$DEPLOY_DIR/infra/nginx/hpc.toufiquzzaman.com.conf" ]; then
  sudo cp "$DEPLOY_DIR/infra/nginx/hpc.toufiquzzaman.com.conf" /etc/nginx/sites-available/hpc.toufiquzzaman.com
  sudo ln -sf /etc/nginx/sites-available/hpc.toufiquzzaman.com /etc/nginx/sites-enabled/
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
fi

# 8. Start PM2 Services
echo "🚀 [8/8] Starting PM2 services..."
pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "=========================================================="
echo "🎉 Setup Completed Successfully!"
echo "=========================================================="
echo "API Health:  curl http://127.0.0.1:4000/api/healthz"
echo "Web Health:  curl -I http://127.0.0.1:3000/"
echo "PM2 Status:  pm2 status"
echo ""
echo "Next step: If you haven't issued SSL certificate yet, run:"
echo "sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m hpc@toufiquzzaman.com"
