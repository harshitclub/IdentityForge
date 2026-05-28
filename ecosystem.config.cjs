module.exports = {
  apps: [
    {
      name: "identityforge",
      script: "dist/server.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      autorestart: true,
      env: {
        NODE_ENV: "development",
      },
    },
  ],
};
