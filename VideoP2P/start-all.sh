#!/bin/bash

echo "==========================================="
echo "P2P Video Chat - Complete Startup Script"
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
sleep 2

# Start the unified server
echo "1. Starting unified P2P Video Chat server..."
echo "   This serves both the frontend and signaling server on port 9000"
(cd /workspaces/agent/VideoP2P && node server.js > server.log 2>&1 &) &
sleep 3

if check_port 9000; then
    echo "   ✅ Server started successfully on port 9000"
    echo "   ✅ Serves both frontend and signaling at /p2p"
else
    echo "   ❌ Failed to start server"
    exit 1
fi

echo ""
echo "2. Services available locally:"
echo "   Frontend: http://localhost:9000"
echo "   Signaling: http://localhost:9000/p2p"

echo ""
echo "3. Starting Pinggy tunnel..."
echo "   This will expose the server to the public internet"
echo "   Press Ctrl+C to stop the tunnel when done"
echo ""

# Start the tunnel for the single port
echo "Starting tunnel..."
echo "Local port 9000 -> Public server (frontend + signaling)"
echo ""

ssh -p 443 -R0:localhost:9000 -o ServerAliveInterval=60 -o StrictHostKeyChecking=no a.pinggy.io