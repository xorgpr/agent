# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains setup instructions and configurations for running various AI coding tools including Claude Code, Qwen, Gemini, and other AI-powered development tools. It provides configurations for routing Claude Code requests through different AI providers.

## Architecture

The project is structured around:
- Configuration files in the `configurations/` directory that define how Claude Code routes requests to different AI providers
- Devcontainer setup for consistent development environments
- Integration with multiple AI providers including Qwen, OpenRouter, and others

## Setup and Development Commands

### Prerequisites
- Docker for devcontainer support
- Node.js and npm (recommended version: npm@11.7.0)

### Installation

1. **Update npm** (recommended as first step):
   ```bash
   npm install -g npm@11.7.0
   ```

2. **Install Claude Code and Router**:
   ```bash
   sudo npm install -g @anthropic-ai/claude-code
   sudo npm install -g @musistudio/claude-code-router
   ```

### Claude Code with Different Providers

#### With Qwen3 via OpenRouter:
```bash
mkdir -p ~/.claude-code-router
sudo npm install -g npm@11.7.0 && sudo npm install -g @anthropic-ai/claude-code && sudo npm install -g @musistudio/claude-code-router
cp configurations/claude-code-router-config.json ~/.claude-code-router/config.json
export OPENROUTER_API_KEY="your_api_key"
ccr code
```

#### With Qwen3 via Qwen OAuth:
1. Install Qwen and login:
   ```bash
   npm install -g npm@11.7.0 && npm install -g @qwen-code/qwen-code@latest
   qwen  # Follow QR code login process
   ```

2. Install CC and configure:
   ```bash
   mkdir -p ~/.claude-code-router && sudo npm install -g @anthropic-ai/claude-code && sudo npm install -g @musistudio/claude-code-router
   cp configurations/claude-code-router-config-qwen.json ~/.claude-code-router/config.json
   export QWEN_API_KEY=$(cat ~/.qwen/oauth_creds.json | grep access_token | awk -F '"' '{print $4}')
   ccr code
   ```

### Other Supported Tools

- **Gemini CLI**: Install with `npm install -g @google/gemini-cli` and use with `gemini --model gemini-2.5-flash`
- **Qwen CLI**: Install with `npm install -g @qwen-code/qwen-code@latest` and run with `qwen`
- **VIBE CLI**: Install with the provided curl script and run with `vibe`
- **OpenCode**: Install with `curl -fsSL https://opencode.ai/install | bash`

### Configuration Files

- `configurations/claude-code-router-config.json`: Configuration for routing through Qwen3 via OpenRouter
- `configurations/claude-code-router-config-qwen.json`: Configuration for routing through Qwen via OAuth
- `.devcontainer/devcontainer.json`: Devcontainer configuration for consistent development environment