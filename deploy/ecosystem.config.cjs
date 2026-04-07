const fs = require('fs');
const path = require('path');

// Load .env.prod
const envFile = path.join(__dirname, '.env.prod');
const env = {};
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
        }
      }
    });
}

module.exports = {
  apps: [
    {
      name: 'sbx-api',
      cwd: '/opt/sbx/apps/api',
      script: 'node',
      args: 'dist/src/main.js',
      env,
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'sbx-cdn',
      cwd: '/opt/sbx/apps/cdn',
      script: 'node',
      args: 'dist/main.js',
      env: { ...env, PORT: '3002' },
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'sbx-admin',
      cwd: '/opt/sbx/apps/admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3001',
      interpreter: 'node',
      env,
      restart_delay: 3000,
      max_restarts: 10,
    },
    {
      name: 'sbx-demo',
      cwd: '/opt/sbx/apps/demo-nextjs',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3003',
      interpreter: 'node',
      env,
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
