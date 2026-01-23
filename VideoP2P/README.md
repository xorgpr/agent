# Hybrid Video Chat with P2P and SFU Support

This project sets up a hybrid video chat application supporting both traditional P2P (Peer-to-Peer) and modern SFU (Selective Forwarding Unit) architectures using WebRTC technology, with Pinggy tunneling to make it accessible globally.

## Components

1. **Unified Server**: Single Node.js server serving both frontend and dual signaling systems on port 9000
2. **Dual Signaling**:
   - P2P: Traditional PeerJS signaling for direct 1:1 connections
   - SFU: mediasoup-based SFU for multi-party conferences
3. **Frontend UI**: HTML interface with mode switching capability
4. **Public Tunnel**: Pinggy tunnel exposing the local server to the internet

## How It Works

- **P2P Mode**: The unified server handles traditional PeerJS signaling; video/audio streams flow directly between peers
- **SFU Mode**: The server acts as a selective forwarding unit using mediasoup; all media flows through the server allowing multi-party conferences
- Pinggy creates a public tunnel to your local server for global accessibility
- Frontend allows switching between P2P and SFU modes seamlessly

## Setup & Running

### Quick Start:
```bash
./start-all.sh
```
This script will:
- Install dependencies including mediasoup, socket.io, and client libraries
- Start the hybrid server on port 9000 (handles both P2P and SFU)
- Expose it to the public internet via Pinggy tunnel
- Display the public URLs to share with others

### Manual Start:
1. Install dependencies:
```bash
npm install
```

2. Start the local server:
```bash
npm start
```
This starts the unified server at `http://localhost:9000` (serves both frontend and dual signaling)

3. In a separate terminal, start the Pinggy tunnel:
```bash
./start-tunnel.sh
```
This will output public URLs like:
- `http://xxxxx.a.free.pinggy.link`
- `https://xxxxx.a.free.pinggy.link`

### Access the application:
- Local: `http://localhost:9000`
- Public: Use the URL provided by Pinggy tunnel

## Features

### P2P Mode (Legacy)
- Direct peer-to-peer connections for 1:1 calls
- Lower server load for simple conversations
- Traditional PeerJS implementation

### SFU Mode (Modern)
- Multi-party conference support (3+ participants)
- Better scalability and reliability
- mediasoup-based SFU architecture
- Dynamic video grid for all participants
- Improved NAT traversal with advanced ICE configuration

### Mode Switching
- Seamless switching between P2P and SFU modes
- Preserved connection state when switching
- Dedicated UI for each mode

## Testing Video Chat

### P2P Mode (1:1 only):
1. Run `./start-all.sh` to start everything
2. Note the public URL provided by Pinggy
3. Share the public URL with someone else who wants to join
4. Each person will get a Peer ID displayed in their browser
5. Enter the other person's Peer ID in the "Destination Peer ID" field
6. Click "Connect to Peer" to establish the connection

### SFU Mode (Multi-party):
1. Run `./start-all.sh` to start everything
2. Navigate to the public URL
3. Switch to "SFU Mode" using the mode selector
4. Click "Join Room" and enter a room ID (or use the generated one)
5. Share the room ID with others to join the conference
6. All participants will see each other in the video grid

## Architecture Benefits

### P2P Mode:
- Direct media flow (reduced latency)
- Lower server resource usage
- Simpler implementation

### SFU Mode:
- Supports many participants per room
- Better quality in restricted networks
- Bandwidth adaptation per recipient
- Easier recording/streaming capabilities
- Improved firewall/NAT traversal

## Files

- `server.js`: Hybrid server (frontend + P2P signaling + SFU signaling)
- `index.html`: Frontend UI with dual-mode support
- `package.json`: Dependencies (peer, express, mediasoup, socket.io)
- `start-all.sh`: Complete startup script (recommended)
- `start-tunnel.sh`: Pinggy tunnel script
- `README.md`: This file

## Notes

- The free Pinggy tier expires tunnels after 60 minutes
- UDP traffic is supported for WebRTC connections in both modes
- The frontend connects to the public tunnel to enable global discovery
- In P2P mode, media flows directly between peers after signaling
- In SFU mode, media flows through the server to all participants
- Both frontend and signaling run on the same server/port for simplicity
- SFU mode supports advanced features like simulcast and SVC

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