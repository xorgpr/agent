# P2P Video Chat

A peer-to-peer video chat application using WebRTC technology with external TURN server for reliable connections.

## Features

- Direct peer-to-peer video and audio communication
- External TURN server configuration for improved connectivity
- Room-based chat system with auto-discovery
- Cloudflare-ready for easy deployment

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

## Deploying to Cloudflare

### Option 1: Using the deployment script
```bash
./deploy-cloudflare.sh
```

### Option 2: Manual deployment
1. Install Wrangler:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Deploy the application:
```bash
wrangler pages deploy --project-name=p2p-video-chat .
```

### Option 3: Using ngrok for temporary access
```bash
ngrok http 9000
```

## How to Use

1. Open the application in your browser
2. Share the generated link with the person you want to call
3. Both users will join the same room automatically
4. After both peers join, either one can click "Start Video Call" to begin the video session
5. If automatic connection doesn't work, use the manual connection section to connect using peer IDs

## Architecture

- **Server Component**: Express server with PeerJS signaling server (runs on port 9000)
- **Frontend Component**: HTML-based UI with WebRTC integration
- **TURN Server**: External Metered TURN server for reliable NAT traversal
- **Room System**: Automatic room assignment via URL parameters

## Note

The application no longer requires Pinggy.io as it uses external TURN server for connectivity. This makes peer connections more reliable over the internet.