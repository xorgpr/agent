# VideoChat with Mediasoup SFU

A real-time video chat application built with WebRTC and Mediasoup SFU (Selective Forwarding Unit) for scalable peer-to-peer communication.

## 🚨 **Current Status: EXPERIMENTAL**

**⚠️ VIDEO/AUDIO STREAMING IS NOT WORKING**

- ✅ **Camera Preview:** Local camera works in bottom-right corner
- ✅ **SFU Connection:** Clients connect to server and create producers successfully  
- ✅ **WebRTC Transports:** Send/receive transports are established
- ❌ **Peer Video/Audio:** Remote media is not displaying despite successful consumption
- ✅ **Debug Console:** Comprehensive logging shows complete connection flow

**Console shows successful media routing, but no actual video/audio between peers. Issue appears to be in WebRTC media track handling or stream attachment.**

## 🛠️ **Technology Stack**

### Frontend
- **WebRTC API:** Browser-native real-time media communication
- **Socket.io Client:** WebSocket signaling for peer discovery and room management
- **Mediasoup Client:** WebRTC transport and media consumption
- **Vanilla JavaScript:** No framework dependencies
- **CSS Grid/Flexbox:** Responsive layout

### Backend
- **Node.js:** JavaScript runtime
- **Express.js:** Web server and static file serving
- **Socket.io Server:** Real-time bidirectional communication
- **Mediasoup SFU:** WebRTC media routing and stream management
- **HTTP Server:** Port 3000 by default

### Media Architecture
- **SFU (Selective Forwarding Unit):** Efficient media routing through server
- **Producers:** Send media streams to SFU
- **Consumers:** Receive media streams from SFU  
- **Transports:** WebRTC connections for send/receive
- **STUN Servers:** NAT traversal (stun.l.google.com)

## 📁 **Project Structure**

```
VideoChat/
├── public/
│   ├── index.html          # Main HTML page
│   ├── style.css           # Styling and responsive design
│   └── client.js           # Frontend WebRTC client
├── server.js              # Node.js Mediasoup server
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🔧 **Installation & Setup**

### Prerequisites
- **Node.js:** >= 18.0.0
- **npm:** Package manager
- **HTTPS/WSS:** Required for camera access in production
- **Browser:** Modern browser with WebRTC support

### Local Development

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd VideoChat
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Access Application**
   - Open: `http://localhost:3000`
   - Grant camera/microphone permissions when prompted
   - Check debug console for connection status

### Production Deployment with Tunneling

1. **Start Server**
   ```bash
   npm start
   ```

2. **Create Tunnel (Pinggy)**
   ```bash
   # Using SSH tunnel
   ssh -p 443 -R 0:localhost:3000 qr@a.pinggy.io

   # Or using ngrok (alternative)
   ngrok http 3000
   ```

3. **Access Public URL**
   - Use the provided HTTPS URL from tunnel service
   - **Required:** HTTPS for camera access in browsers
   - Share URL with other users for testing

## 🌐 **Network Architecture**

### Connection Flow
```
Browser A → Socket.io → Mediasoup Server ← Socket.io ← Browser B
    ↓              ↓                    ↑              ↓
WebRTC A → Producer → SFU Server → Consumer ← WebRTC B
    ↓              ↓                    ↑              ↓
Camera/Mic → Media Stream → Media Routing → Remote Display
```

### Room Management
- **Room Creation:** Automatic based on URL hash or random ID
- **Peer Limit:** 2 users per room (configurable)
- **Room Cleanup:** Automatic when all peers disconnect

### Media Routing
- **Producer:** Sends local camera/mic to SFU
- **Consumer:** Receives remote media from SFU
- **Transport:** WebRTC connection for bidirectional media
- **SFU Benefits:** Reduced bandwidth, scalability, reliability

## 🐛 **Known Issues & Troubleshooting**

### Current Issues
1. **Video/Audio Not Displaying:** 
   - ✅ Producers created successfully
   - ✅ Consumers created successfully  
   - ✅ Transport states: "connected"
   - ❌ Remote video remains blank/no audio

2. **Debug Console Shows:**
   ```
   ✅ Consumer created for video - Receiving media from SFU: [id]
   ✅ Consumer track state: {enabled: true, muted: false, readyState: 'live'}
   📹 Added track to remote stream, total tracks: 2
   🎥 Video call active - Media routed through SFU
   ```

### Common Troubleshooting Steps

1. **Camera Access Issues:**
   - Use HTTPS (required for camera access)
   - Check browser permissions
   - Try different browser (Chrome/Edge recommended)

2. **Connection Issues:**
   - Check if both users are in same room (URL hash)
   - Verify server is running: `npm start`
   - Check firewall/blocking settings

3. **Media Not Displaying:**
   - Current investigation ongoing
   - Issue appears in WebRTC track handling
   - Check browser developer console for errors

4. **Tunneling Issues:**
   - Ensure tunnel is active: check pinggy dashboard
   - Verify HTTPS URL is used
   - Try alternative: ngrok, localtunnel

## 📊 **Technical Specifications**

### Codecs Support
- **Video:** VP8, H.264
- **Audio:** Opus (48kHz, stereo)
- **Extensions:** RTCP, RTP header extensions

### Performance
- **Port Range:** 10000-20000 (WebRTC media)
- **Max Users:** 2 per room (configurable)
- **Resource Usage:** Low CPU/memory for small groups

### Browser Compatibility
- ✅ **Chrome/Chromium:** Full support
- ✅ **Firefox:** Full support  
- ✅ **Edge:** Full support
- ⚠️ **Safari:** May require HTTPS
- ❌ **IE:** No support

## 🔍 **Debug Information**

### Console Logs
The application includes comprehensive debug logging:
- **Connection Status:** Server, room, peer states
- **Media Flow:** Producer/consumer creation
- **Transport States:** WebRTC connection monitoring
- **Track Info:** Live state, muting, readiness

### Access Debug Console
1. Click **"Debug"** button in bottom controls
2. Monitor real-time connection events
3. Share logs when reporting issues

## 📝 **Configuration Options**

### Server Configuration (server.js)
```javascript
// Worker settings
rtcMinPort: 10000,
rtcMaxPort: 20000,

// Room limits  
maxUsersPerRoom: 2,

// Media codecs
mediaCodecs: [
  { kind: 'audio', mimeType: 'audio/opus' },
  { kind: 'video', mimeType: 'video/VP8' },
  { kind: 'video', mimeType: 'video/H264' }
]
```

### Client Configuration (client.js)
```javascript
// Video quality
video: {
  width: { ideal: 1280 },
  height: { ideal: 720 }
},

// STUN servers
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' }
]
```

## 🚀 **Development Roadmap**

### Current Priority
1. **🔧 Fix Media Display:** Resolve video/audio not showing between peers
2. **🧪 Test Peer-to-Peer:** Verify 2+ user scenarios
3. **📱 Mobile Testing:** Ensure mobile compatibility

### Future Features
- **🎥 Video Filters:** Real-time effects
- **📊 Quality Control:** Adaptive bitrate
- **💾 Recording:** Save conversations
- **👥 Multi-Room:** Support multiple rooms
- **🔐 Authentication:** User login system

## 📞 **Support & Contributing**

### Getting Help
- **Check:** Debug console for detailed error information
- **Verify:** HTTPS is being used (required for camera)
- **Test:** Multiple browsers for compatibility issues

### Contributing
1. **Fork** the repository
2. **Create** feature branch
3. **Implement** changes with proper logging
4. **Test** thoroughly with peer connections
5. **Submit** pull request with description

---

**⚠️ Note:** This is experimental software. Video/audio streaming issues are currently being investigated. Connection and signaling work correctly, but media routing between peers needs debugging.

---

*Last Updated: January 2026*
*Status: Experimental - Media streaming under investigation*