// ecosystem.config.cjs
// PM2 Configuration for HPC Jashore (hpc.toufiquzzaman.com)
// STRICT REQUIREMENT: Single-writer SQLite (WAL mode).
// instances MUST BE 1 with exec_mode: 'fork' to prevent database file locks.

module.exports = {
  apps: [
    {
      name: 'hpc-api',
      cwd: '/var/www/hpc-jashore/apps/api',
      script: 'dist/main.js',
      instances: 1, // Single-writer invariant: NEVER change to 'max' or >1
      exec_mode: 'fork', // NEVER use 'cluster' with better-sqlite3 WAL
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        DATABASE_PATH: '/var/www/hpc-jashore/data/hpc.db',
      },
      error_file: '/var/www/hpc-jashore/logs/pm2-api-error.log',
      out_file: '/var/www/hpc-jashore/logs/pm2-api-out.log',
      time: true,
      autorestart: true,
      restart_delay: 2000,
      wait_ready: true, // PM2 waits for process.send('ready') before considering app online
      listen_timeout: 10000, // Timeout to wait for ready signal
      kill_timeout: 5000, // Graceful shutdown window for SIGINT
    },
    {
      name: 'hpc-web',
      cwd: '/var/www/hpc-jashore/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      instances: 2, // 2 cluster workers enable seamless zero-downtime rolling reloads
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      kill_timeout: 5000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_PUBLIC_API_URL: 'https://hpc.toufiquzzaman.com/api',
      },
      error_file: '/var/www/hpc-jashore/logs/pm2-web-error.log',
      out_file: '/var/www/hpc-jashore/logs/pm2-web-out.log',
      time: true,
      autorestart: true,
      restart_delay: 2000,
    },
  ],
};
