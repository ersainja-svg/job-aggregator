module.exports = {
  apps: [
    {
      name: "workflow-jobs",
      script: "server.js",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      // Auto restart at 4 AM daily to prevent memory leaks
      cron_restart: "0 4 * * *",
      // Restart delays
      restart_delay: 3000,
      max_restarts: 50,
      // Logs
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
