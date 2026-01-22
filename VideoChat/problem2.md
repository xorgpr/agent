# WebRTC Video Chat Application - Current Issues Summary

## Date: January 22, 2026

## Current Problems Observed

### 1. TURN Server Configuration Issue
**Problem**: Despite configuring TURN-only servers and setting `iceTransportPolicy: 'relay'`, the connection still generates only host and srflx candidates, not relay candidates.

**Evidence from logs**:
- ICE Servers configured: 3 total (TURN only for relay)
- ICE Server 1: turn:openrelay.metered.ca:80
- ICE Server 2: turn:openrelay.metered.ca:443
- ICE Server 3: turn:openrelay.metered.ca:443?transport=tcp

**But ICE candidates still show**:
- 📡 ICE Candidate [host]: candidate:2822740825 1 udp 2122260223 172.20.160.1 64675 typ host generation 0 u...
- 📡 ICE Candidate [host]: candidate:519893607 1 udp 2121932543 192.168.1.101 64677 typ host generation 0 u...
- 📡 ICE Candidate [host]: candidate:3456364824 1 tcp 1518280447 172.20.160.1 9 typ host tcptype active gen...

**No relay candidates are being generated** - only host candidates (192.168.1.101, 172.20.160.1, etc.)

### 2. Video Playback Issue
**Problem**: Remote streams are received and assigned to the video element but not playing.

**Evidence from logs**:
- Remote stream received from: lcdhjpej88wophd0 (Stream ID: c5a0a2d3-4976-4cd0-9364-edb23764105f)
- Stream assigned to video element, readyState: 0
- Video element remains in readyState: 0 (no data loaded)

### 3. PeerJS Library Limitation
**Root Cause**: PeerJS appears to be ignoring the `iceTransportPolicy: 'relay'` configuration and/or the TURN server configuration is not being properly applied at the RTCPeerConnection level.

### 4. Network Environment
- Application deployed behind Cloudflare tunnel: `https://presentations-negotiation-trembl-threats.trycloudflare.com`
- Users connecting from different networks (one local, one external)
- Local network showing IPs: 192.168.1.101, 172.20.160.1, 172.27.192.1

## Previous Fixes Attempted

1. ✅ Fixed peer ID vs room ID confusion (prevented self-calling)
2. ✅ Added duplicate stream protection
3. ✅ Implemented aggressive video playback logic
4. ✅ Forced TURN-only configuration (removed STUN servers)
5. ✅ Set iceTransportPolicy: 'relay'
6. ✅ Used verified working TURN servers (Metered)

## Current Status
Despite all fixes, the core issue remains: PeerJS is not respecting the TURN configuration and continues to use local host candidates instead of relay candidates. The connection is not going through TURN servers as intended.

## Next Investigation Areas
1. Check if PeerJS is overriding the RTCPeerConnection configuration
2. Verify TURN server accessibility through Cloudflare tunnel
3. Consider using raw RTCPeerConnection instead of PeerJS for more control
4. Test with different TURN server providers
5. Check if Cloudflare tunnel is interfering with TURN traffic