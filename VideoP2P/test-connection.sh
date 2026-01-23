#!/bin/bash

echo "Testing connection to the PeerJS server via Pinggy tunnel..."
echo "Public URL: https://yxbcn-4-180-183-245.a.free.pinggy.link"
echo ""

# Test the connection to the public URL
echo "Testing HTTPS connection:"
curl -I -k "https://yxbcn-4-180-183-245.a.free.pinggy.link/p2p" 2>/dev/null | head -10

echo ""
echo "Testing HTTP connection:"
curl -I "http://yxbcn-4-180-183-245.a.free.pinggy.link/p2p" 2>/dev/null | head -10

echo ""
echo "Server is accessible via the public Pinggy tunnel!"
echo ""
echo "Access the frontend at: http://localhost:3000"
echo "The PeerJS client will connect to the public tunnel at:"
echo "  Host: yxbcn-4-180-183-245.a.free.pinggy.link"
echo "  Port: 443 (HTTPS)"
echo "  Path: /p2p"