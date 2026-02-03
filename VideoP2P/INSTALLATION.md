# P2P Video Chat - Complete Installation Guide

## Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Installation Steps](#installation-steps)
4. [Running the Application](#running-the-application)
5. [Configuration Details](#configuration-details)
6. [Troubleshooting](#troubleshooting)
7. [Files Description](#files-description)
8. [Safe to Remove Files](#safe-to-remove-files)

## Overview

This P2P Video Chat application enables direct peer-to-peer video and audio communication using WebRTC technology. It features an external TURN server for reliable connections over the internet and can be deployed using Cloudflare for global accessibility.

## System Requirements

- Node.js (v14 or higher)
- npm (v6 or higher)
- Cloudflare's `cloudflared` tunnel client (for public access)
- Modern web browser supporting WebRTC (Chrome, Firefox, Safari, Edge)

## Installation Steps

### Step 1: Clone or Download the Repository
```bash
git clone <repository-url>
cd VideoP2P
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- `express` - Web server framework
- `peer` - PeerJS server for WebRTC signaling

### Step 3: Verify Installation
```bash
npm start
```

The server should start on port 9000.

## Running the Application

### Option 1: Local Development
```bash
npm start
```
Access the application at: `http://localhost:9000`

### Option 2: Public Access via Cloudflare Tunnel
```bash
# Start the application server
npm start

# In another terminal, start the Cloudflare tunnel
cloudflared tunnel --url http://localhost:9000
```

Access the application using the public URL provided by Cloudflare.

### Option 3: Using the Cloudflare Deployment Script
```bash
./deploy-cloudflare.sh
```

## Configuration Details

### STUN/TURN Server Configuration
The application uses Metered TURN servers for reliable NAT traversal:

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

### Room-Based Connection System
- Each session generates a unique 4-digit room ID
- Users in the same room are automatically connected
- Share the generated link to invite others to the same room

### Automatic Connection Flow
1. First user visits the application
2. Application generates a unique room and shareable link
3. Share link with another user (includes both room ID and sender's peer ID)
4. Second user clicks the link and automatically connects to the first user
5. Video call starts automatically after connection

## Troubleshooting

### Common Issues

#### Server won't start
- Ensure Node.js and npm are installed
- Run `npm install` to reinstall dependencies
- Check if port 9000 is available

#### Connection problems
- Ensure both users are using the same room link
- Check browser permissions for camera/microphone access
- Some corporate firewalls may block WebRTC connections

#### Cloudflare tunnel not working
- Ensure `cloudflared` is installed and in PATH
- Check if the local server is running on port 9000
- Verify network connectivity

### Browser Compatibility
- Chrome, Firefox, Safari, and Edge are supported
- Mobile browsers may have limited WebRTC support
- Incognito/private browsing may block camera access

## Files Description

### Essential Files
- `server.js` - Main application server (Express + PeerJS signaling server)
- `index.html` - Frontend UI with WebRTC implementation
- `package.json` - Dependencies and scripts
- `package-lock.json` - Dependency lock file

### Utility Scripts
- `deploy-cloudflare.sh` - Script to deploy to Cloudflare Pages
- `start-all.sh` - Starts the local server

### Documentation Files
- `README.md` - Main documentation
- `INSTALLATION.md` - This file
- `CLAUDE.md` - Project instructions for Claude Code

## Safe to Remove Files

The following files can be safely removed without affecting the core functionality:

### Log Files
- `server.log` - Server logs
- `server_output.log` - Server output logs
- Various temporary log files

### Test Scripts (Development Only)
- `comprehensive-test.sh` - Comprehensive testing script
- `final-test.sh` - Final testing script
- `test-connection.sh` - Connection testing script
- `instruction.md` - Instruction file (not essential)

### Obsolete/Unused Scripts
- `pinggy` - Old Pinggy script (replaced by Cloudflare)
- `setup-tunnel.sh` - Old tunnel setup script
- `start-tunnel.sh` - Old tunnel script (replaced by Cloudflare tunnel)
- `tunnel-output.log` - Old tunnel output log
- `.gitignore` - Git ignore file (not needed for execution)

### Development Artifacts
- `.claude` directory - Claude Code artifacts
- `node_modules` - Can be regenerated with `npm install`

### Safe Removal Command
```bash
rm -f server.log server_output.log comprehensive-test.sh final-test.sh test-connection.sh instruction.md pinggy setup-tunnel.sh start-tunnel.sh tunnel-output.log .gitignore
rm -rf .claude
```

Note: Only remove these files if you're sure you don't need them for development or logging purposes.

## Security Considerations

- The application uses secure TURN servers for NAT traversal
- Peer connections are encrypted via WebRTC
- No user data is stored on the server
- Camera/microphone access requires explicit user permission

## Performance Tips

- Use the same WiFi network for best performance
- Ensure good internet connection for high-quality video
- Close other bandwidth-intensive applications
- Use wired connection when possible for stability

## Support

If you encounter issues:
1. Verify all dependencies are installed
2. Check browser console for JavaScript errors
3. Ensure firewall allows WebRTC connections
4. Confirm both users are using the same room link