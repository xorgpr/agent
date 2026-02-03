# P2P Video Chat

A peer-to-peer video chat application using WebRTC technology with external TURN server for reliable connections.

## Features

- Direct peer-to-peer video and audio communication
- External TURN server configuration for improved connectivity
- Room-based chat system with auto-discovery
- Automatic connection when users join via shared link
- Opponent video shown first (larger), personal preview on right (smaller)
- Copy button for easy link sharing

## Updated Configuration

The application now uses Metered TURN server for improved NAT traversal:

```javascript
iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:standard.relay.metered.ca:80",
      username: "b56568bd5432ebd0c568e5d3",
      credential: "DO+w23q9f8zB8vZm",
    },
    {
      urls: "turn:standard.relay.metered.ca:80?transport=tcp",
      username: "b56568bd5432ebd0c568e5d3",
      credential: "DO+w23q9f8zB8vZm",
    },
    {
      urls: "turn:standard.relay.metered.ca:443",
      username: "b56568bd5432ebd0c568e5d3",
      credential: "DO+w23q9f8zB8vZm",
    },
    {
      urls: "turns:standard.relay.metered.ca:443?transport=tcp",
      username: "b56568bd5432ebd0c568e5d3",
      credential: "DO+w23q9f8zB8vZm",
    },
]
```

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the application at `http://localhost:9000`

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
- **Frontend Component**: HTML-based UI with WebRTC integration
- **TURN Server**: External Metered TURN server for reliable NAT traversal
- **Room System**: Automatic room assignment via URL parameters with peer ID included

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