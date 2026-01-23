#!/bin/bash

echo "Establishing Pinggy tunnel for PeerJS server..."
echo "This will expose your local port 9000 to the public internet."
echo ""

# Run the pinggy tunnel command with the correct host and settings
ssh -p 443 -R0:localhost:9000 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null a.pinggy.io

echo ""
echo "Tunnel closed. The public URL was displayed above."
echo "Use that URL to update your frontend configuration."