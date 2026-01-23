# P2P Video Chat - Installation and Setup Instructions

This document provides a comprehensive guide to installing and setting up the P2P Video Chat application with all the commands and procedures used.

## Project Overview

This repository contains a **P2P Video Chat application** built with PeerJS and WebRTC technology. The application enables direct peer-to-peer video and audio communication with a signaling server to coordinate connections, and uses Pinggy tunneling to make it accessible globally.

## Architecture

The project follows a unified server architecture:
- **Server Component** (`server.js`): Combines Express web server and PeerJS signaling server in a single Node.js application running on port 9000
- **Frontend Component** (`index.html`): HTML-based UI that connects to the signaling server to establish peer connections
- **Tunnel Service**: Pinggy SSH tunnel exposes the local server to the public internet for global peer discovery

## Prerequisites

- Node.js and npm (recommended version: npm@11.7.0)
- SSH client for tunneling (pre-installed on most systems)
- Internet connection
- No additional Pinggy installation required (uses SSH tunneling to a.pinggy.io)

## Installation Steps

### Step 1: Update npm (Recommended)

```bash
npm install -g npm@11.7.0
```

### Step 2: Install Project Dependencies

```bash
npm install
```

This installs the required packages defined in `package.json`:
- express: ^4.22.1
- peer: ^0.6.1

### Step 3: Verify Installation

After running `npm install`, you should have the following key files:
- `server.js`: Unified server (frontend + signaling)
- `index.html`: Frontend UI for testing connections
- `package.json`: Dependencies (peer, express)
- `start-all.sh`: Complete startup script (recommended)
- `start-tunnel.sh`: Pinggy tunnel script

## Running the Application

### Option 1: Quick Start (Recommended)

Run the complete startup script that starts both the server and the tunnel:

```bash
./start-all.sh
```

This script will:
- Stop any existing server processes
- Start the unified server on port 9000
- Expose it to the public internet via Pinggy tunnel
- Display the public URLs to share with others

### Option 2: Manual Start

#### Step 1: Start the Local Server

```bash
npm start
```

This starts the unified server at `http://localhost:9000` (serves both frontend and signaling)

#### Step 2: Start the Pinggy Tunnel (in a separate terminal)

```bash
./start-tunnel.sh
```

This will output public URLs like:
- `http://xxxxx.a.free.pinggy.link`
- `https://xxxxx.a.free.pinggy.link`

### Access the Application

- Local: `http://localhost:9000`
- Public: Use the URL provided by Pinggy tunnel

## Complete Command History

Based on the project history, here are all the commands that were used during setup and operation:

1. Navigate to the project directory:
   ```bash
   cd VideoP2P/
   ```

2. Install npm packages:
   ```bash
   npm install
   ```

3. Start the server manually:
   ```bash
   node server.js
   ```

4. Start the tunnel:
   ```bash
   ./start-tunnel.sh
   ```

5. Kill existing server processes when needed:
   ```bash
   pkill -f "node server.js" 2>/dev/null || true
   ```

6. Kill existing tunnel processes when needed:
   ```bash
   pkill -f "ssh -p 443" 2>/dev/null || true
   ```

## Testing Video Chat

1. Run `./start-all.sh` to start everything
2. Note the public URL provided by Pinggy
3. Share the public URL with someone else who wants to join
4. Each person will get a Peer ID displayed in their browser
5. Enter the other person's Peer ID in the "Destination Peer ID" field
6. Click "Connect to Peer" to establish the connection

## Troubleshooting

### Server Won't Start
- Make sure port 9000 is not in use by another process
- Check that all dependencies are installed with `npm install`

### Tunnel Issues
- Verify SSH connectivity to `a.pinggy.io`
- Check firewall settings that might block SSH connections on port 443

### Process Cleanup
If you need to stop all processes:
```bash
pkill -f "node server.js" 2>/dev/null || true
pkill -f "ssh -p 443" 2>/dev/null || true
```

## Pinggy Tunnel Setup

Pinggy is used as a tunneling service to make the local P2P Video Chat application accessible from the public internet. The setup uses SSH tunneling to `a.pinggy.io` and does not require separate installation of Pinggy software.

### How Pinggy Works in This Project

- The application uses SSH reverse tunneling to connect to `a.pinggy.io` on port 443
- Local port 9000 (the unified server) is forwarded to the public internet
- The tunnel provides both HTTP and HTTPS public URLs for access
- No account registration or separate Pinggy client installation is required

### Pinggy Tunnel Commands

The following commands are used to establish the tunnel:

```bash
# Basic tunnel command used by the scripts:
ssh -p 443 -R0:localhost:9000 -o ServerAliveInterval=60 -o StrictHostKeyChecking=no a.pinggy.io

# Alternative command with additional options:
ssh -p 443 -R0:localhost:9000 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null a.pinggy.io
```

### Tunnel Configuration

- Port: 443 (standard SSH over HTTPS)
- Host: a.pinggy.io
- Local forward: localhost:9000
- Remote forward: Public URL generated by Pinggy (e.g., `https://xxxxx.a.free.pinggy.link`)
- Server alive interval: 60 seconds (keeps connection alive)

## Important Notes

- The free Pinggy tier expires tunnels after 60 minutes
- UDP traffic is supported for WebRTC connections
- The frontend connects to the public tunnel to enable global discovery
- Actual media flows directly between peers after signaling
- Both frontend and signaling run on the same server/port for simplicity
- The unified server serves both the frontend UI and handles signaling for WebRTC connections
- Pinggy creates a public tunnel to your local server
- Peers can discover each other through the public signaling server
- Actual video/audio streams flow directly between peers (P2P)
- No separate Pinggy client installation is needed - uses standard SSH client
- The tunnel establishes a secure connection from your local server to the public internet