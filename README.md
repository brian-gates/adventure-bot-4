# Adventure Bot 4

A Discord bot powered by LLM intent inference.

## Prerequisites

- [Deno](https://deno.com/manual/getting_started/installation) (v1.40+
  recommended)
- [Ollama](https://github.com/ollama/ollama) (for LLM intent inference)
- A Discord bot application
  ([create one here](https://discord.com/developers/applications))
- Permissions for your bot: `MESSAGE CONTENT INTENT`, `GUILD MEMBERS INTENT`,
  and appropriate channel/message permissions

## Setup

### 1. Clone the repository

```sh
git clone <your-repo-url>
cd ai-chat
```

### 2. Install Deno

Follow the
[official Deno installation guide](https://deno.com/manual/getting_started/installation).

### 3. Create a Discord bot and invite it to your server

- Go to the
  [Discord Developer Portal](https://discord.com/developers/applications)
- Create a new application
- Add a bot to the application
- Copy the bot token
- Enable the following intents under "Privileged Gateway Intents":
  - SERVER MEMBERS INTENT
  - MESSAGE CONTENT INTENT
- Invite the bot to your server with the appropriate permissions

### 4. Configure environment variables

Copy the example file and fill in your secrets:

```sh
cp example.env .env
```

Then edit `.env` and set your Discord bot token and user ID.

```env
DISCORD_TOKEN=your-bot-token-here
DISCORD_BOT_ID=your-bot-user-id-here
DATABASE_URL=postgres://postgres:postgres@localhost:5444/adventure
```

- `DISCORD_TOKEN`: Your bot's token from the Discord Developer Portal
- `DISCORD_BOT_ID`: Your bot's user ID (right-click your bot in Discord > Copy
  User ID)
- `DATABASE_URL`: (Optional) Your database connection string, if needed

### 5. Run the bot

```sh
deno run -A src/bot/index.ts
```

- The `-A` flag grants all permissions (required for network and env access)

## Project Structure

- `src/bot/index.ts` — Main entry point
- `src/discord/` — Discord bot logic, actions, and helpers
- `src/llm/` — LLM intent inference logic
- `.env` — Environment variables (not committed)

### Ollama Setup

Ollama is required to run the local LLM for intent inference. See the
[Ollama GitHub repo](https://github.com/ollama/ollama) for full installation
instructions.

**Quick install (macOS/Linux):**

```sh
curl -fsSL https://ollama.com/install.sh | sh
```

**Start Ollama:**

```sh
ollama serve
```

Make sure Ollama is running before you start the bot.
