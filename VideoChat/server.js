const express = require('express');
const path = require('path');
const { ExpressPeerServer } = require('peer');
const http = require('http');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Create PeerServer that integrates with the Express server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  // Configure for better NAT traversal
  allow_discovery: true,
  // Add custom configuration for TURN server integration
  proxied: false,  // Set to true if behind proxy/load balancer
  ssl: null,  // Add SSL config if needed later
  // Enable cleanup of inactive connections
  cleanup: {
    interval: 30000,  // 30 seconds
    max_connection_age: 300000  // 5 minutes
  }
});

// Mount the PeerServer BEFORE serving static files
// This ensures the /myapp route is handled by PeerJS, not by the static file handler
app.use('/myapp', peerServer);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle all OTHER routes by serving index.html (for SPA routing)
// This should come AFTER the PeerJS route is defined
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`HTTP Server is running on http://localhost:${PORT}`);
  console.log(`PeerJS Server is running on the same port, path: /myapp`);
});

// Export the server for potential use in other modules
module.exports = { app, server, peerServer };