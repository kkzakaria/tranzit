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
      out_file:   '/var/log/tranzit/api-out.log',
      error_file: '/var/log/tranzit/api-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
}
