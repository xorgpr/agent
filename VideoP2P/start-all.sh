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
echo "3. Server is now running locally!"
echo "   To make it publicly accessible via Cloudflare, follow these steps:"
echo "   - Install Cloudflare Wrangler: npm install -g wrangler"
echo "   - Run: wrangler pages deploy --project-name=p2p-video-chat ."
echo "   - Or use ngrok: ngrok http 9000"
echo ""
echo "   The P2P connections will work via the external TURN server configuration."
echo "   No more need for Pinggy.io as we use external TURN server."
echo ""
echo "   Press Ctrl+C to stop the server when done"
echo ""