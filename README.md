# Adventure Bot 4

## Prerequisites

- [Deno](https://deno.com/manual/getting_started/installation) (v2.0.0+
  recommended)
- [pnpm](https://pnpm.io/) (for dependency management)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for
  database)
- [Ollama](https://github.com/ollama/ollama) (for LLM intent inference)
- A Discord bot application
  ([create one here](https://discord.com/developers/applications))
- Permissions for your bot: `MESSAGE CONTENT INTENT`, `GUILD MEMBERS INTENT`,
  and appropriate channel/message permissions

## Quick Start

1. Clone the repository:

```sh
git clone git@github.com:brian-gates/adventure-bot-4.git
cd adventure-bot-4
```

2. Install dependencies (if you haven't already):

```sh
pnpm install
```

3. Set up and start all services (bot, database, Prisma Studio):

```sh
deno task start
```

- This will automatically run setup (idempotent), check/install dependencies,
  and start all services using pm2.
- If you haven't already, create a Discord bot and invite it to your server (see
  below).
- After running the setup, edit your `.env` file with your Discord bot token,
  user ID, and database URL if needed.

## Create a Discord bot and invite it to your server

- Go to the
  [Discord Developer Portal](https://discord.com/developers/applications)
- Create a new application
- Add a bot to the application
- Copy the bot token
- Enable the following intents under "Privileged Gateway Intents":
  - SERVER MEMBERS INTENT
  - MESSAGE CONTENT INTENT
- Invite the bot to your server with the appropriate permissions

## Project Structure

- `src/bot/index.ts` — Main entry point
- `src/discord/` — Discord bot logic, actions, and helpers
- `src/llm/` — LLM intent inference logic
- `.env` — Environment variables (not committed)
- `ecosystem.config.js` — pm2 process configuration
