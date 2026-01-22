# CLAUDE.md

## Demo: Minimalist P2P Video Chat

This is a demonstration project showcasing a minimalist 1-on-1 video chat application built with WebRTC and PeerJS.

### Project Overview

This repository contains a simple, single-page video chat application that allows two users to connect via WebRTC without requiring registration, accounts, or a database. Users simply open the link and can start talking immediately.

### Architecture

The project consists of:
- A minimal Node.js/Express server to serve static files
- HTML/CSS/JavaScript frontend implementing WebRTC via PeerJS
- Client-side logic for peer-to-peer video calling

### Key Features

- **No Registration Required**: Users can start chatting immediately
- **Peer-to-Peer**: Direct video connection between users
- **Mobile Compatible**: Works on both desktop and mobile devices
- **Simple Interface**: Clean, modern UI with essential controls only

### Setup and Running

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Access the application**:
   - Open `http://localhost:3000` in a browser
   - Share the URL with another person to initiate a call
   - Or append a room ID like `http://localhost:3000/#room123` to join a specific room

### Demo Instructions

This project is designed as a demo to showcase:
- WebRTC implementation with PeerJS
- Minimal viable video chat functionality
- Mobile-first responsive design
- Client-side peer connection management