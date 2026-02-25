# Process Supervision Design

**Goal:** Provide automatic restart and process supervision for the `apps/api` Bun/Hono backend across two deployment targets: Bun directly on a VPS and Docker on a VPS.

**Architecture:** Approach A — systemd as the primary supervisor (native on Ubuntu/Debian, no extra dependencies), with PM2 as an alternative for developers who prefer its dashboard and log aggregation.

**Tech Stack:** systemd, Docker, PM2 (optional), Bun

---

## Files

```
deploy/
  systemd/
    tranzit-api.service         # Supervises Bun process directly
    tranzit-api-docker.service  # Supervises Docker container
    README.md                   # Installation instructions
apps/api/
  ecosystem.config.cjs          # PM2 alternative config
```

## systemd — Bun direct (`tranzit-api.service`)

- `Type=simple`, `Restart=always`, `RestartSec=5`
- `User=tranzit` — dedicated non-root user
- `WorkingDirectory=/opt/tranzit/api`
- `ExecStart=/usr/local/bin/bun run src/index.ts`
- `EnvironmentFile=/etc/tranzit/api.env` — secrets file (chmod 600, owned root)
- Logs via `journalctl -u tranzit-api`

## systemd — Docker (`tranzit-api-docker.service`)

- `Type=simple`, `Restart=always`, `RestartSec=5`
- `After=docker.service`
- `ExecStartPre` stops any existing container with the same name
- `ExecStart` runs `docker run --rm --env-file /etc/tranzit/api.env -p 34001:34001 tranzit-api:latest`
- `ExecStop` calls `docker stop tranzit-api`

## PM2 (`ecosystem.config.cjs`)

- `interpreter: 'bun'`, `script: 'src/index.ts'`
- `env_file: '/etc/tranzit/api.env'`
- `restart_delay: 5000`, `max_restarts: 10`, `watch: false`

## README (`deploy/systemd/README.md`)

Concise instructions for: copying the unit file, reloading systemd, enabling and starting the service, following logs.
