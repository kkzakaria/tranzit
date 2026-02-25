/** @type {{ apps: import('pm2').StartOptions[] }} */
module.exports = {
  apps: [
    {
      name:        'tranzit-api',
      script:      'src/index.ts',
      interpreter: '/usr/local/bin/bun',
      cwd:         '/opt/tranzit/api',

      // Environment — PM2 does not support env_file natively.
      // Source /etc/tranzit/api.env before running `pm2 start` (see README).
      // PM2 saves the env snapshot in ~/.pm2/dump.pm2 on `pm2 save`,
      // so reboots restore the correct values without re-sourcing.
      env: {
        NODE_ENV: 'production',
        PORT:     '34001',
      },

      // Process model
      instances:    1,
      exec_mode:    'fork',
      autorestart:  true,

      // Restart policy
      restart_delay:             5000,   // ms between restarts
      max_restarts:              10,     // hard ceiling — PM2 stops restarting after this count
      exp_backoff_restart_delay: 100,
      kill_timeout:              5000,   // ms before SIGKILL; PM2 sends SIGINT first (override: PM2_KILL_SIGNAL=SIGTERM)
      max_memory_restart:        '512M',
      watch:                     false,

      // Logging
      out_file:        '/var/log/tranzit/api-out.log',
      error_file:      '/var/log/tranzit/api-error.log',
      merge_logs:      true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}
