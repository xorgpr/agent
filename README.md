# AI Coding Tools Setup Guide

This repository provides setup instructions and configurations for various AI-powered development tools, including Claude Code with multiple provider options, Qwen, Gemini, and other AI coding assistants.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Gemini CLI](#gemini-cli)
- [Qwen CLI](#qwen-cli)
- [Devstral VIBE CLI](#devstral-vibe-cli)
- [Claude Code](#claude-code)
- [Claude Code + Qwen3 over OpenRouter](#cc--qwen3-over-openrouter)
- [OpenCode](#opencode)
- [Claude Code + Qwen3 over Qwen OAuth Login](#cc--qwen3-over-qwen-oauth-login)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker for devcontainer support (if using devcontainer)
- Node.js and npm

## Gemini CLI

Google's Gemini CLI for AI-assisted development.

### Setup Instructions
1. Run this repo in your Codespaces (for GitHub) or run it in the devcontainer locally (Docker should be installed on your PC)
2. Import your Gemini API key from https://aistudio.google.com/apikey
    ```bash
    export GEMINI_API_KEY="xxx"
    ```

    Currently works just with this model:
    ```bash
    export GEMINI_MODEL="gemini-2.5-flash"
    ```

3. To run Gemini:
    ```bash
    npx https://github.com/google-gemini/gemini-cli
    ```
    or install it globally:
    ```bash
    npm install -g @google/gemini-cli
    ```

    ```bash
    gemini --model gemini-2.5-flash
    ```

## Qwen CLI

Alibaba's Qwen CLI for AI-assisted development.

### Setup Instructions
1. Install qwen-code:
    ```bash
    npm install -g @qwen-code/qwen-code@latest
    ```
2. Run Qwen:
    ```bash
    qwen
    ```
3. Login to your account with QR code.

## Devstral VIBE CLI

Mistral's VIBE CLI for AI-assisted development.

### Setup Instructions
1. Run the installation command:
    ```bash
    curl -LsSf https://mistral.ai/vibe/install.sh | bash
    ```
2. Follow the instructions from the CLI app.
3. To run:
    ```bash
    vibe
    ```

## Claude Code

Anthropic's Claude Code for AI-assisted development.

### Setup Instructions
1. Run the installation command:
    ```bash
    curl -fsSL https://claude.ai/install.sh | bash
    ```
2. You must have Pro, Max, Team, or Enterprise subscription.

## Claude Code + Qwen3 over OpenRouter

Configure Claude Code to route requests through Qwen3 via OpenRouter.

### Setup Instructions
```bash
mkdir -p ~/.claude-code-router
sudo npm install -g npm@11.8.0 && sudo npm install -g @anthropic-ai/claude-code && sudo npm install -g @musistudio/claude-code-router
cp configurations/claude-code-router-config.json ~/.claude-code-router/config.json
export OPENROUTER_API_KEY="api_key"
ccr code
```

## OpenCode

Open-source AI coding tool.

### Setup Instructions
```bash
curl -fsSL https://opencode.ai/install | bash
```

## OpenCode + Qwen3 over Qwen OAuth Login

Open-source AI coding tool.

### Setup Instructions
```bash
npm install -g npm@11.8.0 && curl -fsSL https://opencode.ai/install | bash && mkdir -p ~/.config/opencode && cat <<EOF > ~/.config/opencode/opencode.json
{
  "\$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-alibaba-qwen3-auth"],
  "model": "alibaba/coder-model"
}
EOF
```
in the other bash terminal: Select "Alibaba" → "Qwen Account (OAuth)"
```bash
opencode auth login
```
run opencode and chouse /models -> Alibaba -> qwen3-coder
```bash
opencode
```

## Claude Code + Qwen3 over Qwen OAuth Login

Configure Claude Code to route requests through Qwen via OAuth authentication.

### Setup Instructions
1. Install Qwen and login with QR-code:
    ```bash
    npm install -g npm@11.8.0 && npm install -g @qwen-code/qwen-code@latest
    qwen
    ```
2. Install Claude Code and copy configuration:
    ```bash
    mkdir -p ~/.claude-code-router && sudo npm install -g @anthropic-ai/claude-code && sudo npm install -g @musistudio/claude-code-router
    cp configurations/claude-code-router-config-qwen.json ~/.claude-code-router/config.json
    ```
3. Update your API key in `~/.claude-code-router/config.json` for Qwen from the `~/.qwen/oauth_creds.json` (refresh_token)

   Or just call:
    ```bash
    export QWEN_API_KEY=$(cat ~/.qwen/oauth_creds.json | grep access_token | awk -F '"' '{print $4}')
    ```
4. Run:
    ```bash
    ccr code
    ```

Alternative combined command:
```bash
npm install -g npm@11.8.0 && npm install -g @qwen-code/qwen-code@latest && qwen
```

Then:
```bash
mkdir -p ~/.claude-code-router && sudo npm install -g @anthropic-ai/claude-code && sudo npm install -g @musistudio/claude-code-router && cp configurations/claude-code-router-config-qwen.json ~/.claude-code-router/config.json && export QWEN_API_KEY=$(cat ~/.qwen/oauth_creds.json | grep access_token | awk -F '"' '{print $4}') && ccr code
```

or: (just use it only inside container!!!)
```bash
ccr code --dangerously-skip-permissions
```

Install skills:
```bash
npm install -g @playwright/cli@latest
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo gpg --dearmor -o /usr/share/keyrings/yarn-archive-keyring.gpg
npx playwright install chrome
mkdir -p .claude/skills/playwright-cli
curl -o .claude/skills/playwright-cli/SKILL.md   https://raw.githubusercontent.com/microsoft/playwright-cli/main/skills/playwright-cli/SKILL.md
```

to test playwright:
```bash
playwright-cli open https://demo.playwright.dev/todomvc/ --headed=false
```

## Troubleshooting

### Dependency Issues
If you see any errors during installation, just update the dependencies that will be specified in the error description (for example, `npm`).
This is normal, as this is a stock image, which gives it a lot of pre-installed software, but it is not updated often.

Most likely the npm should be updated as the first step (for Gemini and Qwen):
```bash
npm install -g npm@11.10.0
```

### instructions for CC + CCR + iflow

execute `cp` command for glm/kimi/qwen llm or adjust in configuration folder.

```bash
export IFLOW_API_KEY="sk-a**************************1"

npm install -g npm@11.10.0 && mkdir -p ~/.claude-code-router && sudo npm install -g @anthropic-ai/claude-code && sudo npm install -g @musistudio/claude-code-router
cp configurations/claude-code-router-config-iflow-glm.json ~/.claude-code-router/config.json
cp configurations/claude-code-router-config-iflow-kimi.json ~/.claude-code-router/config.json
cp configurations/claude-code-router-config-iflow-qwen.json ~/.claude-code-router/config.json
cp configurations/claude-code-router-config-iflow-agent.json ~/.claude-code-router/config.json
ccr code
```