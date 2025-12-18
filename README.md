### Steps to running Gemini CLI with devconatiner.
1. Run this repo in your Codespaces (for github) or run it in the devcontainer locally (docker should be installed on your PC)

2. Import your gemini API key from https://aistudio.google.com/apikey

    ```
    export GEMINI_API_KEY="xxx"
    ```

3. To run gemini:
    ```bash
    npx https://github.com/google-gemini/gemini-cli
    ```

If you see any errors during installation, just update the dependencies that will be specified in the error description (for example, `npm`).
This is normal, as this is a stock image, which gives it a lot of pre-installed software, but it is not updated often.

### Steps to running Qwen CLI with devconatiner.

1. Install qwen-code:
    ```bash
    npm install -g @qwen-code/qwen-code@latest
    ```

2. Run qwen:
    ```bash
    qwen
    ```

3. Login to your account with QR code.

### Steps to running Devstral VIBE CLI with devconatiner.

1. Run next command:
    ```bash
    curl -LsSf https://mistral.ai/vibe/install.sh | bash
    ```

2. Just follow instruction from cli app.

### Steps to running Claude Code with devconatiner.

1. Run next command:
    ```bash
    curl -fsSL https://claude.ai/install.sh | bash
    ```

2. You must have Pro, Max, Team, or Enterprise subscription

#### Most likely the npm should be updated as first step (for Gemini and Qwen):

1. Install newest npm
    ```bash
    npm install -g npm@11.7.0
    ```
