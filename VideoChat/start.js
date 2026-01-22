#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

// Configuration
const PEERJS_PORT = process.env.PEERJS_PORT || 9000;
const APP_PORT = process.env.PORT || 3000;
const TURN_PORT = 3478;

console.log('Starting WebRTC Video Chat application with integrated PeerJS and TURN servers...');

// Function to start TURN server
function startTurnServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting TURN server...');

    // Check if turnserver config exists
    const turnConfigPath = './turnserver.conf';
    if (!fs.existsSync(turnConfigPath)) {
      console.error('TURN server configuration file not found:', turnConfigPath);
      console.error('Using system-wide TURN server configuration instead...');
      // If config file doesn't exist, try to start system coturn service
      const turnProcess = spawn('sudo', ['systemctl', 'start', 'coturn'], {
        stdio: 'inherit'
      });

      turnProcess.on('close', (code) => {
        if (code === 0) {
          console.log('System TURN server started');
          setTimeout(() => resolve(turnProcess), 2000);
        } else {
          console.warn('Could not start system TURN server, continuing with public TURN servers only');
          resolve(null);
        }
      });
      return;
    }

    // Start the turn server with our configuration
    const turnProcess = spawn('turnserver', ['-c', turnConfigPath, '-v'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    turnProcess.stdout.on('data', (data) => {
      console.log(`TURN: ${data}`);
    });

    turnProcess.stderr.on('data', (data) => {
      console.error(`TURN Error: ${data}`);
    });

    turnProcess.on('close', (code) => {
      console.log(`TURN server exited with code ${code}`);
    });

    // Give it a moment to start up
    setTimeout(() => {
      console.log(`TURN server started on port ${TURN_PORT}`);
      resolve(turnProcess);
    }, 2000);
  });
}

// Function to start the main application server
function startAppServer() {
  console.log('Starting main application server...');

  // Import and start the main server
  const serverModule = require('./server.js');
  const server = serverModule.server;

  server.on('listening', () => {
    console.log(`HTTP server running on port ${APP_PORT}`);
    console.log(`PeerJS server running on same port, path: /myapp`);
    console.log('');
    console.log('Application is ready!');
    console.log(`- Visit: http://localhost:${APP_PORT}`);
    console.log(`- PeerJS endpoint: ws://localhost:${APP_PORT}/myapp`);
    console.log(`- TURN server: turn:localhost:${TURN_PORT}`);
  });
}

// Main startup sequence
async function startup() {
  try {
    // Start TURN server first (optional, as it may not be available in all environments)
    await startTurnServer().catch(err => {
      console.warn('TURN server start failed, continuing with public TURN servers:', err.message);
    });

    // Then start the main application server
    startAppServer();
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

// Start the application
startup();