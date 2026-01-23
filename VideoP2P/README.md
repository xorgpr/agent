# P2P Video Chat with PeerJS and Pinggy Tunnel

This project sets up a P2P video chat application using PeerJS for signaling and WebRTC for direct video/audio streaming, with Pinggy tunneling to make it accessible globally.

## Components

1. **Unified Server**: Single Node.js server serving both frontend and signaling on port 9000
2. **Frontend UI**: HTML interface to test peer connections and video chat
3. **Public Tunnel**: Pinggy tunnel exposing the local server to the internet

## How It Works

- The unified server serves both the frontend UI and handles signaling for WebRTC connections
- Pinggy creates a public tunnel to your local server
- Peers can discover each other through the public signaling server
- Actual video/audio streams flow directly between peers (P2P)

## Setup & Running

### Quick Start:
```bash
./start-all.sh
```
This script will:
- Start the unified server on port 9000
- Expose it to the public internet via Pinggy tunnel
- Display the public URLs to share with others

### Manual Start:
1. Start the local server:
```bash
npm start
```
This starts the unified server at `http://localhost:9000` (serves both frontend and signaling)

2. In a separate terminal, start the Pinggy tunnel:
```bash
./start-tunnel.sh
```
This will output public URLs like:
- `http://xxxxx.a.free.pinggy.link`
- `https://xxxxx.a.free.pinggy.link`

### Access the application:
- Local: `http://localhost:9000`
- Public: Use the URL provided by Pinggy tunnel

## Files

- `server.js`: Unified server (frontend + signaling)
- `index.html`: Frontend UI for testing connections
- `package.json`: Dependencies (peer, express)
- `start-all.sh`: Complete startup script (recommended)
- `start-tunnel.sh`: Pinggy tunnel script
- `README.md`: This file

## Testing Video Chat

1. Run `./start-all.sh` to start everything
2. Note the public URL provided by Pinggy
3. Share the public URL with someone else who wants to join
4. Each person will get a Peer ID displayed in their browser
5. Enter the other person's Peer ID in the "Destination Peer ID" field
6. Click "Connect to Peer" to establish the connection

## Notes

- The free Pinggy tier expires tunnels after 60 minutes
- UDP traffic is supported for WebRTC connections
- The frontend connects to the public tunnel to enable global discovery
- Actual media flows directly between peers after signaling
- Both frontend and signaling run on the same server/port for simplicity

history of bash commands:
1  cd VideoP2P/
    2  ./start-tunnel.sh
    3  npm install -g npm@11.7.0 && npm install -g @qwen-code/qwen-code@latest && qwen
    4  mkdir -p ~/.claude-code-router && sudo npm install -g @anthropic-ai/claude-code && sudo npm install -g @musistudio/claude-code-router && cp configurations/claude-code-router-config-qwen.json ~/.claude-code-router/config.json && export QWEN_API_KEY=$(cat ~/.qwen/oauth_creds.json | grep access_token | awk -F '"' '{print $4}')
    5  mkdir VideoP2P
    6  cd VideoP2P/
    7  ccr code
    8  cd VideoP2P/
    9  pkill -f "node server.js" 2>/dev/null || true
   10  pkill -f "ssh -p 443" 2>/dev/null || true
   11  npm install
   12  node server.js
   13  pkill -f "node server.js" 2>/dev/null || true
   14  pkill -f "ssh -p 443" 2>/dev/null || true
   15  npm install
   16  pkill -f "node server.js" 2>/dev/null || true
   17  pkill -f "ssh -p 443" 2>/dev/null || true
   18  npm install
   19  node server.js
   20  pkill -f "node server.js" 2>/dev/null || true
   21  pkill -f "ssh -p 443" 2>/dev/null || true
   22  npm install
   23  node server.js
   24  history
    1  cd VideoP2P/
    2  ./start-tunnel.sh
    3  npm install -g npm@11.7.0 && npm install -g @qwen-code/qwen-code@latest && qwen
    4  mkdir -p ~/.claude-code-router && sudo npm install -g @anthropic-ai/claude-code && sudo npm install -g @musistudio/claude-code-router && cp configurations/claude-code-router-config-qwen.json ~/.claude-code-router/config.json && export QWEN_API_KEY=$(cat ~/.qwen/oauth_creds.json | grep access_token | awk -F '"' '{print $4}')
    5  mkdir VideoP2P
    6  cd VideoP2P/
    7  ccr code
    8  cd VideoP2P/
    9  ./start-tunnel.sh
   10  history