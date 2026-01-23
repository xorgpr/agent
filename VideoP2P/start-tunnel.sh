#!/bin/bash

echo "Starting persistent Pinggy tunnel for P2P server..."
echo "This tunnel will expose both your PeerJS server (port 9000) and frontend (port 3000) to the public internet."
echo ""
echo "Current configuration in index.html:"
echo "- Host: (will be updated when tunnel starts)"
echo "- Port: 443"
echo "- Path: /p2p"
echo "- Secure: true"
echo ""

# Start the tunnel with multiple port forwards
echo "Starting tunnel with multiple port forwards... (this will continue running)"
echo "Forwarding local port 9000 (signaling server) and 3000 (frontend) to public URLs"
ssh -p 443 -R0:localhost:9000 -R0:localhost:3000 -o ServerAliveInterval=60 -o StrictHostKeyChecking=no a.pinggy.io