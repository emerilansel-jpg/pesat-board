module.exports = {
  apps: [
    {
      name: 'pesat-board-server',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3400,
      },
    },
  ],
};
