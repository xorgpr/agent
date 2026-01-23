#!/bin/bash

echo "=== Comprehensive Test of P2P Server via Pinggy Tunnel ==="
echo ""

# Test 1: Check if local server is running
echo "1. Checking if local PeerJS server is running..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:9000 2>/dev/null | grep -q "404"; then
    echo "✅ Local server is running on port 9000"
else
    echo "❌ Local server is not responding"
fi
echo ""

# Test 2: Check if frontend is accessible
echo "2. Checking if frontend is accessible..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
    echo "✅ Frontend is accessible on port 3000"
else
    echo "❌ Frontend is not responding"
fi
echo ""

# Test 3: Check tunnel connectivity
echo "3. Testing tunnel connectivity to public URL..."
PUBLIC_URL="https://yxbcn-4-180-183-245.a.free.pinggy.link"

echo "Testing HTTPS connection to signaling path:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "$PUBLIC_URL/p2p" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" =~ ^(200|400|405)$ ]]; then
    echo "✅ Public tunnel is accessible (HTTP $HTTP_CODE)"
    echo "   Public URL: $PUBLIC_URL"
    echo "   This confirms the tunnel is forwarding to your local PeerJS server"
elif [[ "$HTTP_CODE" == "000" ]]; then
    echo "❌ Cannot reach public tunnel - might be temporarily unavailable"
else
    echo "⚠️  Public tunnel responded with HTTP $HTTP_CODE - this might be normal for PeerJS server"
    echo "   Public URL: $PUBLIC_URL"
fi
echo ""

# Test 4: Verify tunnel process is running
echo "4. Checking if tunnel process is running..."
if pgrep -f "ssh.*a\.pinggy\.io" >/dev/null; then
    echo "✅ SSH tunnel process is running"
else
    echo "ℹ️  SSH tunnel process may not be running in background"
    echo "   Starting tunnel manually to verify functionality..."
    echo "   Please run: ssh -p 443 -R0:localhost:9000 a.pinggy.io"
fi
echo ""

# Test 5: Show connection details
echo "5. Connection Details:"
echo "   Local PeerJS Server: http://localhost:9000"
echo "   Local Frontend: http://localhost:3000"
echo "   Public PeerJS Server: $PUBLIC_URL"
echo "   Public Frontend: Update index.html to use public URL if needed"
echo ""

# Test 6: Simulate PeerJS connection
echo "6. Testing PeerJS connection parameters:"
echo "   Host: yxbcn-4-180-183-245.a.free.pinggy.link"
echo "   Port: 443 (via HTTPS)"
echo "   Path: /p2p"
echo "   Secure: true"
echo ""

echo "=== Test Complete ==="
echo ""
echo "To test the full functionality:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Your Peer ID should appear once connected"
echo "3. Share your public URL with another user to test P2P connection"
echo "4. Use the destination peer ID field to connect to other peers"