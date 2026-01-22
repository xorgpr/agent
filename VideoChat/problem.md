# WebRTC Video Chat Application Problem Description

## Project Overview

A minimalist P2P video chat application built with WebRTC and PeerJS that allows two users to connect via WebRTC without requiring registration, accounts, or a database. Users simply open the link and can start talking immediately.

## Technical Stack
- Frontend: HTML/CSS/JavaScript using WebRTC via PeerJS
- Backend: Node.js/Express server to serve static files
- Signaling: PeerJS server mounted at `/myapp` path
- NAT Traversal: STUN/TURN servers for NAT traversal assistance

## Current Issues Encountered

### 1. Video Playback AbortError
**Problem**:
```
Error playing remote video immediately: AbortError - The play() request was interrupted by a new load request. https://goo.gl/LdLk22
```

**Root Cause**:
- Duplicate stream processing where the same remote stream was being processed multiple times
- Race condition where the video element receives a new srcObject while trying to play the previous one
- Multiple event listeners being attached without proper cleanup

**Solution Applied**:
- Added duplicate stream protection using `lastProcessedStreamId` to track and prevent duplicate processing
- Implemented proper resource cleanup by stopping all tracks in streams before clearing srcObject
- Added event listener management with proper removal to prevent accumulation

### 2. Internet Connectivity Issues vs Local Network
**Problem**:
- Application works fine on local network (same LAN)
- Fails when connecting over the internet via tunneling services (like Cloudflare Tunnels)
- TURN server configuration pointing to local hostname when accessed externally

**Root Cause**:
- TURN server configuration hardcoded to `window.location.hostname`
- Local TURN server (port 3478) not accessible via external domain names through tunnels
- Mixed configuration of local and public TURN servers causing connection conflicts

**Solution Applied**:
- Added network detection logic to differentiate between localhost/local network vs public domains
- Conditional TURN server configuration based on network context
- Local TURN servers only used on local networks; public TURN servers prioritized for internet connections

### 3. Connection Disconnection Issues
**Problem**:
- Connections establish successfully but then disconnect (`iceConnectionState changed to disconnected`)
- Temporary disconnections not recovering automatically
- Resource leaks when connections fail

**Solution Applied**:
- Improved ICE connection state handling with better timeout management
- Enhanced resource cleanup when connections are lost/failed/closed
- Better error recovery and state management

## Source Code Examples

### Frontend Service (public/script.js)
```javascript
// Smart TURN server configuration based on network context
const isLocalhost = window.location.hostname === 'localhost' ||
                  window.location.hostname.startsWith('192.168.') ||
                  window.location.hostname.startsWith('10.') ||
                  window.location.hostname.startsWith('172.') ||
                  window.location.hostname === '0.0.0.0';

const iceServers = [
    // STUN servers for initial discovery (always available)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:global.stun.twilio.com:3478' }
];

// Add local TURN server only if on localhost/local network (where it's accessible)
if (isLocalhost) {
    iceServers.unshift(
        // Local TURN servers for local network
        {
            urls: 'turn:' + window.location.hostname + ':3478?transport=udp',
            username: 'videocall',
            credential: 'secret123'
        },
        {
            urls: 'turn:' + window.location.hostname + ':3478?transport=tcp',
            username: 'videocall',
            credential: 'secret123'
        }
    );
}

// Always add reliable public TURN servers for internet connectivity
iceServers.push(
    // Reliable public TURN servers for internet connectivity
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    },
    // ... other public servers
);
```

### Duplicate Stream Protection
```javascript
// Global variable to track last processed stream
let lastProcessedStreamId = null;

function handleRemoteStream(remoteStream, peerId) {
    // Prevent duplicate stream processing
    if (lastProcessedStreamId === remoteStream.id) {
        log(`Duplicate stream received from: ${peerId}, skipping...`);
        return;
    }

    lastProcessedStreamId = remoteStream.id;
    log(`Remote stream received from: ${peerId} (Stream ID: ${remoteStream.id})`);

    // ... rest of stream handling logic
}
```

### Backend Service (server.js)
```javascript
const express = require('express');
const path = require('path');
const { ExpressPeerServer } = require('peer');
const http = require('http');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Create PeerServer that integrates with the Express server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  allow_discovery: true,
  proxied: false,
  ssl: null,
  cleanup: {
    interval: 30000,
    max_connection_age: 300000
  }
});

// Mount the PeerServer BEFORE serving static files
app.use('/myapp', peerServer);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => {
  console.log(`HTTP Server is running on http://localhost:${PORT}`);
  console.log(`PeerJS Server is running on the same port, path: /myapp`);
});
```

## Expected Behavior After Fixes

1. **Local Network**: Uses local TURN server for optimal performance
2. **Internet**: Uses public TURN servers for reliable connectivity
3. **Video Playback**: No more AbortErrors due to duplicate stream processing
4. **Connection Stability**: Better recovery from temporary disconnections
5. **Resource Management**: Proper cleanup of streams and connections

## Reproduction Steps for Original Problems

1. Deploy application behind a reverse proxy or tunnel service (like Cloudflare)
2. Have two users connect from different networks
3. Observe connection establishment followed by disconnection
4. Notice video playback issues and AbortErrors in console
5. See TURN server configuration errors when accessed via external domain

## Testing Environment

The application uses:
- PeerJS for WebRTC simplification
- Multiple STUN/TURN servers for NAT traversal
- Cloudflare Tunnel for exposing local server to internet
- Mobile-compatible interface with manual play button fallback