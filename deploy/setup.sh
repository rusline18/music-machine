#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 VPS. Run as root from a copy of
# this folder:
#   sudo bash setup.sh example.ru "ssh-ed25519 AAAA... github-deploy"
# The second argument is the public half of the key GitHub Actions deploys
# with (docs/deploy.md). Safe to run again: existing settings are kept.
set -euo pipefail

DOMAIN=${1:?usage: setup.sh <domain> "<deploy public key>"}
DEPLOY_KEY=${2:?usage: setup.sh <domain> "<deploy public key>"}
HERE=$(cd "$(dirname "$0")" && pwd)
APP=/srv/music-machine
USER_NAME=musicmachine
ENV_FILE=/etc/music-machine.env

[[ $EUID -eq 0 ]] || { echo "run as root (sudo)" >&2; exit 1; }
[[ $DOMAIN =~ ^[a-z0-9.-]+\.[a-z]{2,}$ ]] || { echo "bad domain: $DOMAIN" >&2; exit 1; }
[[ $DEPLOY_KEY == ssh-* ]] || { echo "the key should start with ssh-" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive

echo "== System packages"
apt-get update
apt-get -y upgrade
apt-get install -y curl ca-certificates gnupg ufw unattended-upgrades \
  debian-keyring debian-archive-keyring apt-transport-https
# Security updates install themselves.
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT


echo "== Node.js 22"
if ! command -v node >/dev/null || [[ $(node -v) != v22.* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "== Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

echo "== Swap (building isn't done here, but 1 GB RAM is tight)"
if ! swapon --show | grep -q .; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== App user and folders"
id "$USER_NAME" >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /bin/bash "$USER_NAME"
# No password, but not "locked": sshd refuses even keys for locked accounts
# on some setups.
usermod -p '*' "$USER_NAME"
mkdir -p "$APP"/{releases,incoming,.data} "$APP/.ssh"
grep -qxF "$DEPLOY_KEY" "$APP/.ssh/authorized_keys" 2>/dev/null || echo "$DEPLOY_KEY" >> "$APP/.ssh/authorized_keys"
chmod 700 "$APP/.ssh"
chmod 600 "$APP/.ssh/authorized_keys"
chown -R "$USER_NAME:$USER_NAME" "$APP"

# The deploy may restart the app, and nothing else as root.
echo "$USER_NAME ALL=(root) NOPASSWD: /usr/bin/systemctl restart music-machine" > /etc/sudoers.d/music-machine
chmod 440 /etc/sudoers.d/music-machine
visudo -cf /etc/sudoers.d/music-machine

echo "== Settings ($ENV_FILE)"
if [[ ! -f $ENV_FILE ]]; then
  sed "s|https://example.ru|https://$DOMAIN|" "$HERE/music-machine.env.example" > "$ENV_FILE"
fi
chown root:"$USER_NAME" "$ENV_FILE"
chmod 640 "$ENV_FILE"

echo "== Service"
install -m 644 "$HERE/music-machine.service" /etc/systemd/system/music-machine.service
systemctl daemon-reload
# Starts with the first release (release.sh restarts it).
systemctl enable music-machine

echo "== Caddy site"
sed "s/example\.ru/$DOMAIN/g" "$HERE/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl reload caddy || systemctl restart caddy

echo "== Daily feedback backup (/var/backups/music-machine, 14 days)"
cat > /etc/cron.daily/music-machine-backup <<'CRON'
#!/bin/sh
set -e
mkdir -p /var/backups/music-machine
tar -czf "/var/backups/music-machine/data-$(date +%F).tar.gz" -C /srv/music-machine .data
find /var/backups/music-machine -name 'data-*.tar.gz' -mtime +14 -delete
CRON
chmod 755 /etc/cron.daily/music-machine-backup

echo "== Firewall: SSH, HTTP, HTTPS"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo
echo "Done. Next: point $DOMAIN (and www) at this server, then run the"
echo "Deploy workflow on GitHub. Settings: $ENV_FILE"
