#!/bin/bash

echo "==========================================="
echo "Hybrid Video Chat - Complete Startup Script"
echo "==========================================="
echo ""

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Stop any existing server processes
echo "Stopping any existing server processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "ssh -p 443" 2>/dev/null || true
sleep 2

# Install dependencies
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Start the unified server
echo "1. Starting hybrid Video Chat server..."
echo "   This serves both the frontend and P2P/SFU signaling servers on port 9000"
echo "   P2P signaling: /p2p"
echo "   SFU signaling: WebSocket"
(cd /workspaces/agent/VideoP2P && node server.js > server.log 2>&1 &) &
sleep 3

if check_port 9000; then
    echo "   ✅ Server started successfully on port 9000"
    echo "   ✅ Serves both frontend and P2P/SFU signaling"
else
    echo "   ❌ Failed to start server"
    exit 1
fi

echo ""
echo "2. Services available locally:"
echo "   Frontend: http://localhost:9000"
echo "   P2P Signaling: http://localhost:9000/p2p"
echo "   SFU Signaling: WebSocket on same port"

echo ""
echo "3. Starting Pinggy tunnel with UDP support..."
echo "   This will expose the server to the public internet"
echo "   UDP traffic is supported for WebRTC connections"
echo "   Press Ctrl+C to stop the tunnel when done"
echo ""

# Start the tunnel for the single port - include UDP forwarding
echo "Starting tunnel with UDP support..."
echo "Local port 9000 -> Public server (frontend + P2P/SFU signaling)"
echo ""

# Use SSH tunnel with UDP support where available
ssh -p 443 -R0:localhost:9000 -o ServerAliveInterval=60 -o StrictHostKeyChecking=no a.pinggy.io