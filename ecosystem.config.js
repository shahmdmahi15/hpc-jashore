// PM2 process file — production on Lightsail (no Docker in v1).
// Deploy flow: pnpm install → pnpm -r build → pm2 reload ecosystem.config.js --update-env
module.exports = {
  apps: [
    {
      name: 'hpc-api',
      cwd: './apps/api',
      script: './dist/main.js',
      instances: 1, // single writer: keeps SQLite + sequence numbering safe
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
    {
      name: 'hpc-web',
      cwd: './apps/web',
      script: './node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
