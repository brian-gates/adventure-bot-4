#!/bin/sh
set -e

# Colors for output
green='\033[0;32m'
red='\033[0;31m'
reset='\033[0m'

# Detect OS
OS="$(uname -s)"

# Helper to print status
echo_success() { echo "${green}$1${reset}"; }
echo_error() { echo "${red}$1${reset}"; }

# 1. Homebrew (macOS only)
if [ "$OS" = "Darwin" ]; then
  if ! command -v brew >/dev/null 2>&1; then
    echo_error "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo_success "Homebrew installed."
  else
    echo_success "Homebrew already installed."
  fi
fi

# 2. Deno
if ! command -v deno >/dev/null 2>&1; then
  echo_error "Deno not found. Installing Deno..."
  if [ "$OS" = "Darwin" ]; then
    brew install deno
  else
    curl -fsSL https://deno.land/install.sh | sh
    export DENO_INSTALL="$HOME/.deno"
    export PATH="$DENO_INSTALL/bin:$PATH"
  fi
  echo_success "Deno installed."
else
  echo_success "Deno already installed."
fi

# 3. librsvg (rsvg-convert)
if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo_error "librsvg (rsvg-convert) not found. Installing..."
  if [ "$OS" = "Darwin" ]; then
    brew install librsvg
  elif [ "$OS" = "Linux" ]; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y librsvg2-bin
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y librsvg2-tools
    else
      echo_error "Please install librsvg manually for your Linux distribution."
    fi
  fi
  echo_success "librsvg installed."
else
  echo_success "librsvg (rsvg-convert) already installed."
fi

# 4. Docker
if ! command -v docker >/dev/null 2>&1; then
  echo_error "Docker not found. Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
else
  echo_success "Docker is installed."
  # Check if Docker daemon is running
  if ! docker info >/dev/null 2>&1; then
    echo_error "Docker is installed but not running. Please start Docker Desktop."
  else
    echo_success "Docker is running."
  fi
fi

# 5. .env file
if [ ! -f .env ]; then
  if [ -f example.env ]; then
    cp example.env .env
    echo_success ".env file created from example.env. Please edit it with your secrets."
  else
    echo_error ".env file not found and example.env missing. Please create a .env file."
  fi
else
  echo_success ".env file exists."
fi

# Prompt for Discord bot token and bot ID if missing
if [ -f .env ]; then
  # Read current values (if any)
  DISCORD_TOKEN=$(grep '^DISCORD_TOKEN=' .env | cut -d '=' -f2-)
  DISCORD_BOT_ID=$(grep '^DISCORD_BOT_ID=' .env | cut -d '=' -f2-)

  if [ -z "$DISCORD_TOKEN" ] || [ -z "$DISCORD_BOT_ID" ]; then
    echo "To create or manage your Discord bot, visit: https://discord.com/developers/applications"
  fi

  if [ -z "$DISCORD_TOKEN" ]; then
    printf "Enter your Discord bot token: "
    read -s TOKEN_INPUT
    echo
    # Remove any existing line and append
    sed -i.bak '/^DISCORD_TOKEN=/d' .env && rm .env.bak
    echo "DISCORD_TOKEN=$TOKEN_INPUT" >> .env
    echo_success "DISCORD_TOKEN set in .env."
  fi

  if [ -z "$DISCORD_BOT_ID" ]; then
    printf "Enter your Discord bot user ID: "
    read -s ID_INPUT
    echo
    sed -i.bak '/^DISCORD_BOT_ID=/d' .env && rm .env.bak
    echo "DISCORD_BOT_ID=$ID_INPUT" >> .env
    echo_success "DISCORD_BOT_ID set in .env."
  fi

fi

# 6. Ollama
if ! command -v ollama >/dev/null 2>&1; then
  echo_error "Ollama not found. Please install it from https://ollama.com/download and run 'ollama serve' before starting the bot."
else
  if pgrep -x "ollama" >/dev/null 2>&1; then
    echo_success "Ollama is running."
  else
    echo_error "Ollama is installed but not running. Please run: ollama serve"
  fi
fi

echo
cat <<EOF
${green}Setup script complete!${reset}

Next steps:
- Edit your .env file with your Discord bot token, user ID, and database URL if needed.
- Start Docker Desktop if it is not running.
- Start Ollama with: ollama serve
- If you haven't already, install pm2: npm install -g pm2
- To start all services (bot, database, Prisma Studio): deno task start
EOF 