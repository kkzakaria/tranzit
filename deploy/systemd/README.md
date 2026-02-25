# Tranzit API — Process Supervision

Two unit files are provided. Use **one** depending on your setup:

| File | When to use |
|------|-------------|
| `tranzit-api.service` | Bun installed directly on the server |
| `tranzit-api-docker.service` | Running the Docker image on the server |

---

## Prerequisites

### Create the `tranzit` system user (Bun direct only)

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin tranzit
```

### Create the environment file

```bash
sudo mkdir -p /etc/tranzit
sudo cp apps/api/.env.example /etc/tranzit/api.env
sudo chmod 600 /etc/tranzit/api.env
sudo chown root:root /etc/tranzit/api.env
# Edit the file and fill in production values
sudo nano /etc/tranzit/api.env
```

### Deploy the application (Bun direct only)

```bash
sudo mkdir -p /opt/tranzit/api
sudo cp -r apps/api/. /opt/tranzit/api/
sudo chown -R tranzit:tranzit /opt/tranzit/api
cd /opt/tranzit/api && bun install --production
```

### Build the Docker image (Docker only)

```bash
# From the repo root
docker build -f apps/api/Dockerfile -t tranzit-api:latest .
```

---

## Install & Start

```bash
# Copy the unit file
sudo cp deploy/systemd/tranzit-api.service /etc/systemd/system/
# — or for Docker:
sudo cp deploy/systemd/tranzit-api-docker.service /etc/systemd/system/

# Reload systemd, enable on boot, and start
sudo systemctl daemon-reload
sudo systemctl enable --now tranzit-api
# — or:
sudo systemctl enable --now tranzit-api-docker
```

## Useful commands

```bash
# Status
sudo systemctl status tranzit-api

# Live logs
sudo journalctl -u tranzit-api -f

# Restart / stop
sudo systemctl restart tranzit-api
sudo systemctl stop tranzit-api
```

---

## PM2 (alternative to systemd)

```bash
cd /opt/tranzit/api

# Load env vars from file, then start
pm2 start ecosystem.config.cjs

# Save PM2 process list and enable startup hook
pm2 save
pm2 startup   # follow the printed command
```

```bash
# Useful PM2 commands
pm2 status
pm2 logs tranzit-api
pm2 restart tranzit-api
```
