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

- `Type=simple`, `Restart=on-failure`, `RestartSec=5`, `TimeoutStopSec=10`
- `User=tranzit` — dedicated non-root user
- `WorkingDirectory=/opt/tranzit/api`
- `ExecStart=/usr/local/bin/bun run src/index.ts`
- `EnvironmentFile=/etc/tranzit/api.env` — secrets file (chmod 600, owned root)
- Hardening: `ProtectSystem=strict`, `NoNewPrivileges=true`, `PrivateTmp=true`
- Logs via `journalctl -u tranzit-api`

## systemd — Docker (`tranzit-api-docker.service`)

- `Type=simple`, `Restart=on-failure`, `KillMode=none` (intentional — lets ExecStop own lifecycle)
- `After=docker.service`, `SuccessExitStatus=143 137`
- `ExecStartPre` stops and removes any existing container with the same name
- `ExecStart` runs `docker run --name tranzit-api --env-file ... --log-driver=journald`
- `ExecStop` calls `docker stop -t 10 tranzit-api`; `ExecStopPost` removes the container
- No `--rm` on `docker run` — cleanup is owned by ExecStartPre/ExecStopPost
- Logs via `journalctl CONTAINER_NAME=tranzit-api`

## PM2 (`ecosystem.config.cjs`)

- `interpreter: '/usr/local/bin/bun'`, `script: 'src/index.ts'`
- PM2 does not support `env_file` natively — source `/etc/tranzit/api.env` before `pm2 start`
- `restart_delay: 5000`, `max_restarts: 10` (hard ceiling), `max_memory_restart: 512M`, `watch: false`

## README (`deploy/systemd/README.md`)

Concise instructions for: copying the unit file, reloading systemd, enabling and starting the service, following logs.
