module.exports = {
  apps: [
    {
      name: "bot",
      script: "src/bot/index.ts",
      interpreter: "deno",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      interpreter_args:
        "--allow-env --allow-net --allow-read --allow-write --allow-run --allow-ffi --allow-import=unpkg.com,deno.land",
      env: {
        DENO_ENV: "production",
        DATABASE_URL: "postgres://postgres:postgres@localhost:5444/adventure",
      },
      watch: false,
      exp_backoff_restart_delay: 1000,
    },
    {
      name: "prisma-studio",
      script: "pnpm",
      args: "prisma studio --browser none",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      autorestart: true,
    },
    {
      name: "db",
      script: "docker",
      args: "compose up", 
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      autorestart: true,
    },
  ],
};
