# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains a **P2P Video Chat application** built with PeerJS and WebRTC technology. The application enables direct peer-to-peer video and audio communication with a signaling server to coordinate connections, and uses Pinggy tunneling to make it accessible globally.

## Architecture

The project follows a unified server architecture:
- **Server Component** (`server.js`): Combines Express web server and PeerJS signaling server in a single Node.js application running on port 9000
- **Frontend Component** (`index.html`): HTML-based UI that connects to the signaling server to establish peer connections
- **Tunnel Service**: Pinggy SSH tunnel exposes the local server to the public internet for global peer discovery

## Key Components

1. **Unified Server** (`server.js`): Serves both frontend UI and handles WebRTC signaling through the same Express server
2. **Frontend UI** (`index.html`): Provides interface for connecting to peers with status indicators and peer ID display
3. **Deployment Scripts**: `start-all.sh` for complete startup, `start-tunnel.sh` for tunnel only
4. **Dependencies**: Express and PeerJS libraries for handling web serving and WebRTC signaling

## Development Commands

### Starting the Application
```bash
# Quick start - runs server and tunnel together
./start-all.sh

# Manual start - start server separately
npm start

# Start tunnel separately (after server is running)
./start-tunnel.sh
```

### Access Points
- Local access: `http://localhost:9000`
- Public access: Via Pinggy tunnel URL (displayed when tunnel starts)

### Testing Connections
- Multiple browsers or devices can connect using the public URL
- Each client generates a unique Peer ID
- Enter another participant's Peer ID to establish connection
- Connection status is displayed in the UI

## Important Notes

- The free Pinggy tier expires tunnels after 60 minutes
- Both frontend and signaling run on the same server/port for simplicity
- Actual media flows directly between peers after signaling through the server
- UDP traffic is supported for WebRTC connections