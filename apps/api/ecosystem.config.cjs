/** @type {{ apps: import('pm2').StartOptions[] }} */
module.exports = {
  apps: [
    {
      name:        'tranzit-api',
      script:      'src/index.ts',
      interpreter: '/usr/local/bin/bun',
      interpreter_args: '',  // e.g. '--smol' on memory-constrained hosts
      cwd:         '/opt/tranzit/api',

      // Environment — loaded from file, then merged with inline env
      env_file: '/etc/tranzit/api.env',
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
      max_restarts:              10,     // max restarts in exp backoff window
      exp_backoff_restart_delay: 100,
      kill_timeout:              5000,   // ms before SIGKILL after SIGINT
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
