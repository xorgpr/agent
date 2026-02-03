# P2P Video Chat

A peer-to-peer video chat application using WebRTC technology with secure TURN server credential management.

## Security Features

This application implements secure TURN server credential management to protect API keys:

1. **Server-Side Credential Generation**: API keys are stored server-side and never exposed to clients
2. **Direct Credential Fetching**: Credentials are fetched from the TURN provider on-demand via `/api/turn-credentials` endpoint
3. **Environment Variable Protection**: API keys are loaded from environment variables
4. **Temporary Credentials**: The TURN service provides time-limited credentials
5. **Security Headers**: Response headers prevent caching of sensitive credentials

## Features

- Direct peer-to-peer video and audio communication
- Secure external TURN server configuration for improved connectivity
- Room-based chat system with auto-discovery
- Automatic connection when users join via shared link
- Opponent video shown first (larger), personal preview on right (smaller)
- Copy button for easy link sharing

## Updated Configuration

The application now securely manages TURN server credentials through a direct server-side API call:

- Server fetches temporary credentials from Metered service via `/api/turn-credentials` endpoint
- Credentials are returned to client as temporary, time-limited credentials
- API key remains secure on server and is never exposed to client
- Simplified single-step process instead of the previous token-based approach
- Example credentials returned by server:
```javascript
iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:standard.relay.metered.ca:80",
      username: "temporary_username_from_service",
      credential: "temporary_password_from_service",
    },
    {
      urls: "turn:standard.relay.metered.ca:80?transport=tcp",
      username: "temporary_username_from_service",
      credential: "temporary_password_from_service",
    },
    {
      urls: "turn:standard.relay.metered.ca:443",
      username: "temporary_username_from_service",
      credential: "temporary_password_from_service",
    },
    {
      urls: "turns:standard.relay.metered.ca:443?transport=tcp",
      username: "temporary_username_from_service",
      credential: "temporary_password_from_service",
    },
]
```

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy the `.env.example` file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit the `.env` file and add your Metered API key:
     ```
     METERED_API_KEY=your_actual_metered_api_key_here
     ```
   - The `.env` file is automatically excluded from Git via `.gitignore`

3. Start the server:
```bash
npm start
```

4. Access the application at `http://localhost:9000`

## Deploying for Public Access

### Using Cloudflare Tunnel (Recommended)
```bash
cloudflared tunnel --url http://localhost:9000
```

### Using the deployment script
```bash
./deploy-cloudflare.sh
```

## How to Use

1. Open the application in your browser
2. Copy the generated link using the "Copy Link" button
3. Share this link with the person you want to call
4. When the other person opens the link, they will automatically connect to you
5. The opponent's video appears large on the left
6. Your camera preview appears smaller on the right
7. Video call starts automatically after connection

## Architecture

- **Server Component**: Express server with PeerJS signaling server (runs on port 9000)
- **Frontend Component**: HTML-based UI with WebRTC implementation
- **Secure TURN Management**: Server-side API endpoint (`/api/turn-credentials`) fetches temporary credentials from Metered service
- **TURN Server**: External Metered TURN server for reliable NAT traversal with temporary credentials
- **Room System**: Automatic room assignment via URL parameters with peer ID included

## API Endpoints

- `/api/turn-credentials` - Direct endpoint for TURN server credentials
- `/p2p` - PeerJS signaling server path
- `/` - Frontend application

## Files Included

### Essential Files
- `server.js` - Main application server
- `index.html` - Frontend UI with WebRTC implementation
- `package.json` - Dependencies and scripts
- `deploy-cloudflare.sh` - Cloudflare deployment script
- `start-all.sh` - Server startup script

### Documentation
- `README.md` - This file
- `INSTALLATION.md` - Complete installation guide

## Safe to Remove Files

The following files can be safely removed without affecting core functionality:
- Log files: `server.log`, `server_output.log`
- Test scripts: `comprehensive-test.sh`, `final-test.sh`, `test-connection.sh`
- Obsolete scripts: `pinggy`, `setup-tunnel.sh`, `start-tunnel.sh`
- Development artifacts: `.claude` directory, `instruction.md`, `tunnel-output.log`

## Note

The application no longer requires Pinggy.io as it uses external TURN server for connectivity. This makes peer connections more reliable over the internet.