module.exports = {
  apps: [
    {
      name: "homepage",            // ← 여기 이름도 짧게!
      cwd: "/home/server/homepage",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      watch: true,
      ignore_watch: ["public/uploads", "node_modules", ".git"],
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
