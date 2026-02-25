# Process Supervision Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add systemd unit files (Bun direct + Docker) and a PM2 ecosystem config to enable automatic process restart on VPS deployments.

**Architecture:** Three config files under `deploy/systemd/` and `apps/api/`, plus a README. No application code changes — pure infrastructure. Verification is done with `systemd-analyze verify` (dry-run, no root needed) rather than unit tests.

**Tech Stack:** systemd, Docker CLI, PM2, Bun

---

### Task 1: systemd unit — Bun direct

**Files:**
- Create: `deploy/systemd/tranzit-api.service`

**Step 1: Create the directory**

```bash
mkdir -p deploy/systemd
```

**Step 2: Write the unit file**

Create `deploy/systemd/tranzit-api.service` with this exact content:

```ini
[Unit]
Description=Tranzit API (Bun)
Documentation=https://github.com/kkzakaria/tranzit
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=tranzit
Group=tranzit
WorkingDirectory=/opt/tranzit/api
EnvironmentFile=/etc/tranzit/api.env
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/tranzit/api

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=tranzit-api

[Install]
WantedBy=multi-user.target
```

**Step 3: Verify syntax with systemd-analyze**

```bash
systemd-analyze verify deploy/systemd/tranzit-api.service 2>&1 || true
```

Expected: no output (or warnings about missing EnvironmentFile/binary — acceptable since those are runtime paths).

**Step 4: Commit**

```bash
git add deploy/systemd/tranzit-api.service
git commit -m "feat: add systemd unit for Bun direct deployment"
```

---

### Task 2: systemd unit — Docker container

**Files:**
- Create: `deploy/systemd/tranzit-api-docker.service`

**Step 1: Write the unit file**

Create `deploy/systemd/tranzit-api-docker.service` with this exact content:

```ini
[Unit]
Description=Tranzit API (Docker)
Documentation=https://github.com/kkzakaria/tranzit
After=docker.service network.target
Requires=docker.service

[Service]
Type=simple
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

ExecStartPre=-/usr/bin/docker stop tranzit-api
ExecStartPre=-/usr/bin/docker rm tranzit-api
ExecStart=/usr/bin/docker run \
  --name tranzit-api \
  --rm \
  --env-file /etc/tranzit/api.env \
  -p 34001:34001 \
  --log-driver=journald \
  --log-opt tag=tranzit-api \
  tranzit-api:latest
ExecStop=/usr/bin/docker stop tranzit-api

StandardOutput=journal
StandardError=journal
SyslogIdentifier=tranzit-api-docker

[Install]
WantedBy=multi-user.target
```

**Step 2: Verify syntax**

```bash
systemd-analyze verify deploy/systemd/tranzit-api-docker.service 2>&1 || true
```

Expected: no critical errors.

**Step 3: Commit**

```bash
git add deploy/systemd/tranzit-api-docker.service
git commit -m "feat: add systemd unit for Docker deployment"
```

---

### Task 3: PM2 ecosystem config

**Files:**
- Create: `apps/api/ecosystem.config.cjs`

**Step 1: Write the config**

Create `apps/api/ecosystem.config.cjs` with this exact content:

```js
/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name:        'tranzit-api',
      script:      'src/index.ts',
      interpreter: '/usr/local/bin/bun',
      cwd:         '/opt/tranzit/api',

      // Environment — override with /etc/tranzit/api.env on server
      env: {
        NODE_ENV: 'production',
      },

      // Restart policy
      restart_delay:   5000,   // ms between restarts
      max_restarts:    10,     // max restarts in exp backoff window
      exp_backoff_restart_delay: 100,
      watch:           false,

      // Logging
      out_file:  '/var/log/tranzit/api-out.log',
      error_file: '/var/log/tranzit/api-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}
```

**Step 2: Verify PM2 can parse the config (if PM2 is installed locally)**

```bash
# Only if pm2 is available — skip otherwise
npx pm2 start apps/api/ecosystem.config.cjs --no-daemon 2>&1 | head -5 || true
```

Expected: config parses without errors (or "pm2 not found" — acceptable).

**Step 3: Commit**

```bash
git add apps/api/ecosystem.config.cjs
git commit -m "feat: add PM2 ecosystem config for Bun"
```

---

### Task 4: Installation README

**Files:**
- Create: `deploy/systemd/README.md`

**Step 1: Write the README**

Create `deploy/systemd/README.md` with this exact content:

````markdown
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
set -a && source /etc/tranzit/api.env && set +a
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
````

**Step 2: Commit**

```bash
git add deploy/systemd/README.md
git commit -m "docs: add process supervision installation guide"
```

---

### Task 5: Push

**Step 1: Push to remote**

```bash
git push
```
