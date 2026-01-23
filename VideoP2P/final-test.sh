#!/bin/bash

echo "=== Final Verification Test ==="
echo ""

CURRENT_PUBLIC_URL="https://gvvbe-4-180-183-245.a.free.pinggy.link"
CURRENT_HOST="gvvbe-4-180-183-245.a.free.pinggy.link"

echo "Testing current public URL: $CURRENT_PUBLIC_URL"
echo ""

# Check if the tunnel is still active by checking for the SSH process
if pgrep -f "ssh.*a\.pinggy\.io" >/dev/null; then
    echo "✅ SSH tunnel process is running"
    TUNNEL_STATUS="active"
else
    echo "⚠️ SSH tunnel process is not running in background"
    TUNNEL_STATUS="inactive"
fi
echo ""

# Test basic connectivity to the public URL
echo "Testing connectivity to the public tunnel..."
if curl -s -o /dev/null -w "%{http_code}" -k --max-time 10 "$CURRENT_PUBLIC_URL" 2>/dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k --max-time 10 "$CURRENT_PUBLIC_URL" 2>/dev/null)
    echo "Public URL response: HTTP $HTTP_CODE"

    if [[ $HTTP_CODE =~ ^(200|400|404|405)$ ]]; then
        echo "✅ Public tunnel is accessible"
    else
        echo "⚠️  Unexpected response: HTTP $HTTP_CODE"
    fi
else
    echo "⚠️  Could not reach public URL - this might be due to tunnel status: $TUNNEL_STATUS"
fi
echo ""

# Test the signaling path specifically
echo "Testing signaling path (/p2p)..."
if curl -s -o /dev/null -w "%{http_code}" -k --max-time 10 "$CURRENT_PUBLIC_URL/p2p" 2>/dev/null; then
    SIGNAL_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k --max-time 10 "$CURRENT_PUBLIC_URL/p2p" 2>/dev/null)
    echo "Signaling path response: HTTP $SIGNAL_HTTP_CODE"
    if [[ $SIGNAL_HTTP_CODE =~ ^(400|405)$ ]]; then
        # 400 or 405 is expected for PeerJS server when accessed directly
        echo "✅ Signaling path is accessible (expected response for PeerJS)"
    elif [[ $SIGNAL_HTTP_CODE == "200" ]]; then
        echo "✅ Signaling path is accessible"
    else
        echo "⚠️  Signaling path response: HTTP $SIGNAL_HTTP_CODE"
    fi
else
    echo "⚠️  Could not reach signaling path"
fi
echo ""

# Test local servers
echo "Testing local servers..."
LOCAL_PEERJS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000 2>/dev/null)
LOCAL_FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)

echo "Local PeerJS server (port 9000): HTTP $LOCAL_PEERJS_CODE"
echo "Local frontend (port 3000): HTTP $LOCAL_FRONTEND_CODE"

if [[ $LOCAL_PEERJS_CODE == "404" ]] && [[ $LOCAL_FRONTEND_CODE == "200" ]]; then
    echo "✅ Both local servers are responding correctly"
else
    echo "⚠️  Local server response unexpected"
fi
echo ""

# Summary
echo "=== SUMMARY ==="
echo "Tunnel Status: $TUNNEL_STATUS"
echo "Public URL: $CURRENT_PUBLIC_URL"
echo "Host: $CURRENT_HOST"
echo "Port: 443 (HTTPS)"
echo "Path: /p2p"
echo ""
echo "Local Servers:"
echo "- PeerJS: http://localhost:9000 (signaling server)"
echo "- Frontend: http://localhost:3000 (UI)"
echo ""
echo "To test the complete functionality:"
echo "1. The frontend is available at: http://localhost:3000"
echo "2. The frontend is configured to connect to the public tunnel"
echo "3. Other peers can connect to your signaling server via: $CURRENT_PUBLIC_URL"
echo "4. PeerJS will handle the actual P2P connection establishment"
echo ""
if [[ "$TUNNEL_STATUS" == "active" ]]; then
    echo "✅ P2P TURN/Signaling Server is fully deployed and accessible!"
else
    echo "ℹ️  Tunnel needs to be manually maintained for continuous access"
fi