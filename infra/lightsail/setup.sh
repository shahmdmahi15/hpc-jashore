#!/usr/bin/env bash
# HPC Jashore — Lightsail first-boot setup (Ubuntu 22.04).
# Run once as root on a fresh instance. Installs: Nginx, Node 22, pnpm, PM2, certbot.
# No Docker in v1. Review variables at the top before running.
set -euo pipefail

DOMAIN="hpc.toufiquzzaman.com"
DEPLOY_DIR="/srv/hpc-jashore"
DEPLOY_USER="ubuntu"

apt-get update
apt-get install -y nginx certbot python3-certbot-nginx ufw curl git sqlite3

# --- firewall: 80/443 open, 22 restricted (edit SSH_IP first) ---
# SSH_IP="YOUR.OFFICE.IP"
# ufw allow from "$SSH_IP" to any port 22
# ufw allow 80,443/tcp
# ufw --force enable

# --- Node 22 LTS + pnpm (corepack) + PM2 ---
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
corepack enable
corepack prepare pnpm@latest --activate
pnpm add --global pm2
sudo -u "$DEPLOY_USER" pm2 startup systemd --hp "/home/$DEPLOY_USER" || true

# --- deploy dir ---
mkdir -p "$DEPLOY_DIR"
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_DIR"

# --- nginx site (copy infra/nginx/hpc.toufiquzzaman.com.conf first) ---
# cp infra/nginx/hpc.toufiquzzaman.com.conf /etc/nginx/sites-available/hpc
# ln -sf /etc/nginx/sites-available/hpc /etc/nginx/sites-enabled/hpc
# rm -f /etc/nginx/sites-enabled/default
# nginx -t && systemctl reload nginx

# --- TLS (run AFTER Cloudflare DNS points at this box, proxy OFF/DNS-only) ---
# certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m you@example.com
# then re-enable Cloudflare proxy (orange cloud) with SSL mode Full (Strict).

echo "Base setup done. Next: copy nginx conf, issue cert, clone repo to $DEPLOY_DIR."
