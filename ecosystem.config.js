module.exports = {
  apps: [
    {
      name: "bot",
      script: "deno",
      args: "task bot",
      interpreter: "none",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        DENO_ENV: "production",
        DATABASE_URL: "postgres://postgres:postgres@localhost:5444/adventure",
      },
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
