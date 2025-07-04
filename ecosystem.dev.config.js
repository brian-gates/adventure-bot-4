module.exports = {
  apps: [
    {
      name: "bot",
      script: "src/bot/index.ts",
      interpreter: "deno",
      interpreter_args:
        "--allow-env --allow-net --allow-read --allow-write --allow-run --allow-ffi --allow-import=unpkg.com,deno.land",
      args: "",
      cwd: "/Users/briangates/code/ai-chat",
      env: {
        DENO_ENV: "development",
        DATABASE_URL: "postgres://postgres:postgres@localhost:5444/adventure",
      },
      watch: true,
    },
    {
      name: "prisma-studio",
      script: "npx",
      args: "prisma studio --browser none",
      autorestart: true,
    },
    {
      name: "db",
      script: "docker",
      args: "compose up",
      autorestart: true,
    },
  ],
};
