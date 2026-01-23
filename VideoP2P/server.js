const express = require('express');
const { ExpressPeerServer } = require('peer');

// Create Express app
const app = express();

// Serve static files from the current directory
app.use(express.static('.'));

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