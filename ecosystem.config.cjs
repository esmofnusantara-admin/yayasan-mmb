module.exports = {
  apps: [
    {
      name: 'yayasan-mmb',
      script: 'dist/server.cjs',
      interpreter: 'node',

      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Auto-restart settings
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,

      // Logging
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Memory limit — restart jika melebihi 512MB
      max_memory_restart: '512M',
    },
  ],
};
