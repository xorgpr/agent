require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { ExpressPeerServer } = require('peer');
const fetch = require('node-fetch'); // Add node-fetch for making API calls

// Create Express app
const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from the current directory
app.use(express.static('.'));

// Endpoint to get TURN server credentials
app.get('/api/turn-credentials', async (req, res) => {
  try {
    // Get API key from environment variable for security
    const apiKey = process.env.METERED_API_KEY || '30a98119e4e3093ff63698c0a1a2a3700ae7'; // Fallback to default for development

    // According to Metered documentation, use GET method to get temporary credentials
    // The API returns an iceServers array directly with account-level temporary credentials
    // These are the same for the same account but are time-limited by the service
    const response = await fetch(`https://turnservermax.metered.live/api/v1/turn/credentials?apiKey=${apiKey}&cache-bust=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const iceServers = await response.json();

    // Add additional security headers to limit caching and potential misuse
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.json({
      iceServers: iceServers,
    });
  } catch (error) {
    console.error('Error fetching TURN credentials:', error);
    res.status(500).json({ error: "Failed to generate dynamic credentials" });
  }
});


// Create HTTP server
const http = require('http');
const server = http.createServer(app);

// Start the PeerServer integrated with the Express app
const peerServer = ExpressPeerServer(server, {
  debug: true,
  proxied: true // Handle headers from proxy/tunnel
});

app.use('/p2p', peerServer);

// Listen on a single port
const PORT = 9000;
server.listen(PORT, () => {
  console.log(`P2P Video Chat server listening on port ${PORT}`);
  console.log('Signaling path: /p2p');
  console.log('Frontend available at: /');
  console.log('Proxied: true');
});

peerServer.on('connection', (client) => {
  console.log(`New client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`Client disconnected: ${client.getId()}`);
});

peerServer.on('error', (err) => {
  console.error('PeerServer error:', err);
});