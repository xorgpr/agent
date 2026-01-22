# P2P Video Chat

A minimalist peer-to-peer video chat application that works without registration or a database. Users simply open a link and can start talking.

## Features

- ✅ One-on-one video calls
- ✅ No registration required
- ✅ No database needed
- ✅ Mobile-friendly interface
- ✅ Automatic camera/microphone access
- ✅ Copy-and-share invitation links
- ✅ Peer-to-peer WebRTC connections

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **WebRTC**: PeerJS (via CDN)
- **Backend**: Node.js/Express server

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone or download this repository
2. Navigate to the project directory:

```bash
cd VideoChat
```

3. Install dependencies:

```bash
npm install
```

## Running Locally

Start the server:

```bash
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Making It Public with Cloudflare Tunnel

To make your video chat accessible publicly, you can use Cloudflare Tunnel.

### Installing Cloudflare Tunnel

1. **Download and install cloudflared:**

   **On macOS:**
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

   **On Ubuntu/Debian:**
   ```bash
   curl -L --remote-name https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

   **On Windows (PowerShell):**
   ```powershell
   Invoke-WebRequest -Uri https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile cloudflared.exe
   ```

   **More options:** Visit [Cloudflare Tunnel downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

2. **Authenticate cloudflared:**

   ```bash
   cloudflared tunnel login
   ```

   This will open a browser window to authenticate with your Cloudflare account.

3. **Create and run a tunnel:**

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

   This will create a public URL that forwards traffic to your local server.

### Alternative: Using Named Tunnels

For more control, you can create a named tunnel:

1. Create a tunnel:
   ```bash
   cloudflared tunnel create videochat
   ```

2. Configure the tunnel to point to your local server:
   ```bash
   cloudflared tunnel route dns videochat your-subdomain.your-domain.com
   ```

3. Run the tunnel:
   ```bash
   cloudflared tunnel run videochat
   ```

## How to Use

1. Start the application locally (`npm start`)
2. If you want to make it public, set up Cloudflare Tunnel
3. On the first device, you'll get a unique ID and a "Copy Invite Link" button
4. Share the link with someone you want to call
5. On the second device, open the shared link to join the call
6. Both devices will automatically connect and start video chatting

## Privacy Notice

This application does not store any data. All video communication happens directly between peers using WebRTC technology.

## Troubleshooting

- **Camera/Microphone not working**: Make sure you've allowed camera and microphone permissions in your browser
- **Connection issues**: The application uses multiple STUN/TURN servers to help with NAT traversal, but some restrictive networks may still cause issues
- **Black screen or no audio**: These are often caused by firewall/NAT issues preventing direct peer-to-peer connections. The app uses TURN servers as fallback, but in some cases additional configuration may be needed
- **STUN/TURN URL errors**: If you see errors like "is not a valid stun or turn URL", ensure the server addresses are properly formatted without invalid query parameters
- **Mobile Safari**: If video doesn't play automatically, tap on the video element to start playback
- **Connection timeouts**: If connections are taking too long, make sure both parties have good internet connections and aren't behind extremely restrictive firewalls

## Security Considerations

- This is a minimal implementation meant for personal use
- There's no encryption beyond WebRTC's built-in encryption
- Anyone with the link can join the call
- For sensitive conversations, consider additional security measures

## License

MIT