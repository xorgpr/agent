#!/bin/bash

echo "Deploying P2P Video Chat to Cloudflare Pages..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Wrangler is not installed. Installing..."
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
wrangler whoami 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Please login to Cloudflare..."
    wrangler login
fi

echo ""
echo "Creating Cloudflare Pages project and deploying..."
echo ""

# Deploy the current directory as a static site
wrangler pages deploy --project-name=p2p-video-chat .

echo ""
echo "Deployment complete! Your P2P Video Chat is now available at:"
echo "https://p2p-video-chat.[your-username].pages.dev"
echo ""
echo "Share this URL with others to start video chats!"