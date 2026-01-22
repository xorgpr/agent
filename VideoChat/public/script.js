// Global variables
let peer = null;
let localStream = null;
let currentCall = null;
let localVideoId = null;
let activeCalls = {}; // Track active calls to prevent duplicates

// DOM elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const copyLinkBtn = document.getElementById('copy-link-btn');
const playVideoBtn = document.getElementById('play-video-btn');
const statusIndicator = document.getElementById('status-indicator');
const consoleLog = document.getElementById('console-log');
const consoleContent = document.getElementById('console-content');

// Add click handler for the play video button
playVideoBtn.addEventListener('click', async () => {
    try {
        await remoteVideo.play();
        playVideoBtn.style.display = 'none';
        log('Remote video played successfully via manual trigger');
    } catch (error) {
        log(`Manual play failed: ${error.message}`);
    }
});

// Show console logs for mobile debugging
function log(message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `${timestamp} - ${message}`;

    if (consoleContent) {
        const logElement = document.createElement('div');
        logElement.textContent = logEntry;
        consoleContent.appendChild(logElement);

        // Keep only last 10 entries
        if (consoleContent.children.length > 10) {
            consoleContent.removeChild(consoleContent.firstChild);
        }

        // Scroll to bottom
        consoleContent.scrollTop = consoleContent.scrollHeight;
    }

    console.log(logEntry);
}

// Toggle console log visibility (for debugging)
function toggleConsole() {
    if (consoleLog.style.display === 'none') {
        consoleLog.style.display = 'block';
    } else {
        consoleLog.style.display = 'none';
    }
}

// Initialize the application
async function init() {
    try {
        // Show console log on mobile devices for debugging
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            consoleLog.style.display = 'block';
        }

        // Request camera and microphone permissions
        statusIndicator.textContent = 'Accessing media...';
        log('Requesting camera and microphone permissions...');

        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        log('Media access granted');
        localVideo.srcObject = localStream;

        // Initialize PeerJS
        initializePeer();
    } catch (error) {
        log(`Error accessing media: ${error.message}`);
        statusIndicator.textContent = 'Error: Camera/Mic access denied';

        // Create a dummy video stream for testing purposes
        createDummyStream();
    }
}

// Create a dummy stream if camera access is denied (for testing)
function createDummyStream() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    // Draw a placeholder image
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Camera Disabled', canvas.width / 2, canvas.height / 2);

    const dummyStream = canvas.captureStream(30); // 30 FPS
    localVideo.srcObject = dummyStream;
}

// Initialize PeerJS connection
function initializePeer() {
    try {
        // Generate a random ID if none exists
        localVideoId = localStorage.getItem('peerId') || generateRandomId();
        localStorage.setItem('peerId', localVideoId);

        // Initialize Peer with a custom configuration for better connectivity
        peer = new Peer(localVideoId, {
            host: '0.peerjs.com', // Use PeerJS cloud server
            port: 443,
            path: '/',
            config: {
                iceServers: [
                    // Primary TURN servers - putting these first to prioritize them
                    // Reliable TURN servers for symmetric NAT traversal
                    // These are free public TURN servers that should work for demo purposes
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    // Alternative TURN server
                    {
                        urls: 'turn:numb.viagenie.ca:3478',
                        username: 'webrtc@live.com',
                        credential: 'muazkh'
                    },
                    // Fallback TURN server
                    {
                        urls: 'turn:turn.anyfirewall.com:3478',
                        username: 'anonymous',
                        credential: 'anonymous'
                    },
                    // STUN servers for initial discovery
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun.cloudflare.com:3478' },
                    { urls: 'stun:stun.services.mozilla.com' },
                    { urls: 'stun:stun.schlund.de' },
                    // Fallback STUN server
                    {
                        urls: 'stun:global.stun.twilio.com:3478'
                    }
                ],
                // Additional configuration options for better connectivity
                iceCandidatePoolSize: 25, // Increased pool size for better candidate selection
                sdpSemantics: 'unified-plan',
                // Prioritize relay candidates over host candidates
                rtcpMuxPolicy: 'require' // Require RTP/RTCP multiplexing for better NAT traversal
            },
            // Additional options for better connectivity
            debug: 3, // Enable logging for debugging
            // Enable additional ICE transport policies for better connectivity
            iceTransportPolicy: 'all'  // Allow all types of connections but with prioritized TURN servers
        });

        peer.on('open', (id) => {
            log(`Peer connected with ID: ${id}`);

            // Check if there's a room ID in the URL hash
            const roomId = window.location.hash.substring(1);
            if (roomId) {
                // Join existing room
                statusIndicator.textContent = `Joining room: ${roomId}`;

                // Add a slight delay before connecting to ensure Peer is fully ready
                setTimeout(() => {
                    connectToPeer(roomId);
                }, 500);

                // Set a timeout for connection attempts
                setTimeout(() => {
                    if (currentCall && currentCall.open) {
                        const state = currentCall.iceConnectionState;
                        if (state && state !== 'connected' && state !== 'completed') {
                            log('Connection timeout - attempting to reconnect...');
                            statusIndicator.textContent = 'Connection taking longer than expected...';

                            // Try to refresh the connection
                            if (currentCall) {
                                currentCall.close();
                                connectToPeer(roomId);
                            }
                        }
                    }
                }, 15000); // 15 second timeout
            } else {
                // Set up listener for incoming calls
                setupCallListener();

                // Update status
                statusIndicator.textContent = `Connected. Share this link: ${window.location.origin}/#${id}`;
                log(`Waiting for connection. My ID: ${id}`);

                // Log connection details for debugging
                log(`Connection details - Peer ID: ${id}, Room: ${id}`);
            }
        });

        peer.on('error', (err) => {
            log(`Peer error: ${err.type} - ${err.message}`);

            // Provide specific error messages for common connection issues
            if (err.type === 'browser-incompatible') {
                statusIndicator.textContent = 'Browser not supported - please update your browser';
                log('WebRTC not supported in this browser');
            } else if (err.type === 'network-error') {
                statusIndicator.textContent = 'Network error - check your internet connection';
                log('Possible causes: Firewall blocking, NAT issues, or network restrictions');
            } else if (err.type === 'peer-unavailable') {
                statusIndicator.textContent = 'Peer not found - check the room ID';
                log('Attempted to connect to a non-existent peer');
            } else if (err.type === 'invalid-id') {
                statusIndicator.textContent = 'Invalid peer ID format';
                log('The peer ID format is invalid');
            } else if (err.type === 'invalid-key') {
                statusIndicator.textContent = 'Invalid API key';
                log('The API key used is invalid');
            } else if (err.type === 'server-error') {
                statusIndicator.textContent = 'Server error - try again later';
                log('PeerJS signaling server may be temporarily unavailable');
            } else if (err.type === 'socket-error') {
                statusIndicator.textContent = 'Connection error - check firewall settings';
                log('Socket connection failed - might be due to network restrictions');
            } else {
                statusIndicator.textContent = `Connection error: ${err.type}`;
            }

            // Don't attempt automatic reconnection here as it may cause loops
        });

        peer.on('disconnected', () => {
            log('Peer disconnected');
            statusIndicator.textContent = 'Disconnected';
        });

        peer.on('close', () => {
            log('Peer connection closed');
            statusIndicator.textContent = 'Connection closed';
        });
    } catch (error) {
        log(`Error initializing PeerJS: ${error.message}`);
        statusIndicator.textContent = 'Connection error';
    }
}

// Set up listener for incoming calls
function setupCallListener() {
    peer.on('call', (call) => {
        // Check if this is a self-call (same peer ID)
        if (call.peer === localVideoId) {
            log(`Rejecting self-call from ${call.peer}`);

            // Reject the self-call
            call.close();
            return;
        }

        // Check if we already have an active call with this peer
        if (activeCalls[call.peer]) {
            log(`Duplicate call from ${call.peer}, rejecting...`);

            // Reject the duplicate call
            call.close();
            return;
        }

        // Mark this call as active
        activeCalls[call.peer] = call;
        log(`Incoming call from: ${call.peer}`);
        statusIndicator.textContent = `Receiving call from: ${call.peer}`;

        // Answer the call automatically with the local stream
        call.answer(localStream);

        call.on('stream', (remoteStream) => {
            log(`Remote stream received from: ${call.peer}`);

            // First, ensure the video element exists and is ready
            if (!remoteVideo) {
                log('Error: remote video element not found');
                return;
            }

            // Properly handle the remote stream
            // First, wait for any existing stream to be released
            if (remoteVideo.srcObject) {
                // Release the current stream to prevent conflicts
                remoteVideo.srcObject = null;
            }

            // Ensure video element properties are set correctly BEFORE assigning the stream
            remoteVideo.playsInline = true;
            remoteVideo.autoplay = true;
            remoteVideo.muted = true; // Start with muted to comply with autoplay policies

            // Assign the new stream
            remoteVideo.srcObject = remoteStream;

            // Verify the stream assignment worked
            if (remoteVideo.srcObject !== remoteStream) {
                log('Warning: Stream assignment to video element may not have worked properly');
            }

            // IMMEDIATELY try to play the video after assigning the stream
            // This is the most critical change - try to play right away
            const attemptImmediatePlay = async () => {
                try {
                    // Ensure the video element has the right attributes for autoplay
                    remoteVideo.playsInline = true;
                    remoteVideo.autoplay = true;
                    remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                    // Try to play the video immediately after stream assignment
                    await remoteVideo.play();
                    log('Remote video played successfully (muted) after immediate attempt');

                    // Try to unmute if playback succeeded
                    try {
                        remoteVideo.muted = false;
                        log('Audio unmuted successfully after immediate play');
                    } catch (unmuteError) {
                        log(`Could not unmute audio after immediate play: ${unmuteError.message}`);
                        // Keep it muted but continue with video
                    }

                    // Hide the play button if it was shown
                    playVideoBtn.style.display = 'none';

                    return true; // Success
                } catch (error) {
                    log(`Error playing remote video immediately: ${error.name} - ${error.message}`);
                    return false; // Failed
                }
            };

            // Try immediate play right away
            attemptImmediatePlay().then(success => {
                if (!success) {
                    // If immediate play failed, continue with event-based approach
                    setupEventBasedPlayback();
                }
            });

            // Function to handle event-based playback as fallback
            const setupEventBasedPlayback = () => {
                // Since we received the stream, we know the connection is working
                // So we should show the play button immediately if needed
                setTimeout(() => {
                    if (remoteVideo.paused || remoteVideo.readyState < 2) {
                        log('Remote stream received but video not playing, showing play button');
                        playVideoBtn.style.display = 'block';
                    }
                }, 500); // Quick check after stream is set

                // Wait for the video element to be ready before playing
                remoteVideo.onloadedmetadata = () => {
                    log('Remote video metadata loaded');

                    // Check if the video is actually playing after metadata loads
                    setTimeout(async () => {
                        if (remoteVideo.paused) {
                            log('Video is paused after metadata load, attempting to play');

                            try {
                                // Ensure the video element has the right attributes for autoplay
                                remoteVideo.playsInline = true;
                                remoteVideo.autoplay = true;
                                remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                                await remoteVideo.play();
                                log('Remote video played successfully after metadata load (muted)');

                                // Try to unmute if playback succeeded
                                try {
                                    remoteVideo.muted = false;
                                    log('Audio unmuted successfully after metadata load');
                                } catch (unmuteError) {
                                    log(`Could not unmute audio after metadata load: ${unmuteError.message}`);
                                    // Keep it muted but continue with video
                                }

                                // Hide the play button if it was shown
                                playVideoBtn.style.display = 'none';
                            } catch (error) {
                                log(`Error playing remote video after metadata load: ${error.name} - ${error.message}`);
                                playVideoBtn.style.display = 'block'; // Show play button as fallback
                            }
                        }
                    }, 100);
                };

                // Wait for the video element to have enough data to play
                remoteVideo.onloadeddata = async () => {
                    log('Remote video data loaded, attempting to play');
                    try {
                        // Ensure the video element has the right attributes for autoplay
                        remoteVideo.playsInline = true;
                        remoteVideo.autoplay = true;
                        remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                        // Try to play the video after data has loaded
                        await remoteVideo.play();
                        log('Remote video played successfully (muted) after data load');

                        // Try to unmute if playback succeeded
                        try {
                            remoteVideo.muted = false;
                            log('Audio unmuted successfully after data load');
                        } catch (unmuteError) {
                            log(`Could not unmute audio after data load: ${unmuteError.message}`);
                            // Keep it muted but continue with video
                        }

                        // Hide the play button if it was shown
                        playVideoBtn.style.display = 'none';
                    } catch (error) {
                        log(`Error playing remote video after loadeddata: ${error.name} - ${error.message}`);
                        // Show the manual play button when automatic playback fails
                        playVideoBtn.style.display = 'block';
                    }
                };

                // Wait for the video element to be ready to play
                remoteVideo.oncanplay = async () => {
                    log('Remote video can play, attempting to play');
                    try {
                        // Ensure the video element has the right attributes for autoplay
                        remoteVideo.playsInline = true;
                        remoteVideo.autoplay = true;
                        remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                        // Try to play the video
                        await remoteVideo.play();
                        log('Remote video played successfully (muted) in oncanplay');

                        // Try to unmute if playback succeeded
                        try {
                            remoteVideo.muted = false;
                            log('Audio unmuted successfully in oncanplay');
                        } catch (unmuteError) {
                            log(`Could not unmute audio in oncanplay: ${unmuteError.message}`);
                            // Keep it muted but continue with video
                        }

                        // Hide the play button if it was shown
                        playVideoBtn.style.display = 'none';
                    } catch (error) {
                        log(`Error playing remote video in oncanplay: ${error.name} - ${error.message}`);
                        // Don't try to play again immediately, let the loadeddata event handle it
                    }
                };
            };

            // Additional fallback: try to play after a delay if events don't fire properly
            setTimeout(async () => {
                // Only try to play if we haven't already played successfully
                if (remoteVideo.paused && remoteVideo.readyState < 2) {
                    try {
                        // Ensure the video element has the right attributes for autoplay
                        remoteVideo.playsInline = true;
                        remoteVideo.autoplay = true;
                        remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                        // Try to play the video after delay
                        await remoteVideo.play();
                        log('Remote video played successfully after delay (muted)');

                        // Try to unmute if playback succeeded
                        try {
                            remoteVideo.muted = false;
                            log('Audio unmuted successfully after delay');
                        } catch (unmuteError) {
                            log(`Could not unmute audio after delay: ${unmuteError.message}`);
                            // Keep it muted but continue with video
                        }

                        // Hide the play button if it was shown
                        playVideoBtn.style.display = 'none';
                    } catch (error) {
                        log(`Error playing remote video after delay: ${error.name} - ${error.message}`);

                        // Show the manual play button when automatic playback fails
                        playVideoBtn.style.display = 'block';

                        // Set up user interaction handlers as ultimate fallback
                        const setupUserInteractionHandlers = () => {
                            // Add event listener to multiple possible user interaction events
                            ['click', 'touchstart', 'touchend'].forEach(eventType => {
                                document.body.addEventListener(eventType, async () => {
                                    try {
                                        // Try to play with muted first
                                        remoteVideo.muted = true;
                                        await remoteVideo.play();

                                        // Try to unmute after successful play
                                        try {
                                            remoteVideo.muted = false;
                                            log('Audio unmuted after user interaction');
                                        } catch (unmuteAfterError) {
                                            log(`Could not unmute after user interaction: ${unmuteAfterError.message}`);
                                        }

                                        playVideoBtn.style.display = 'none';
                                        log('Remote video played after user interaction');
                                    } catch (interactionError) {
                                        log(`Play after interaction failed: ${interactionError.message}`);
                                    }
                                }, { once: true });
                            });
                        };

                        // Try muted playback as fallback
                        try {
                            remoteVideo.muted = true;
                            await remoteVideo.play();
                            log('Remote video played successfully with muted audio');
                            playVideoBtn.style.display = 'none';
                        } catch (mutedError) {
                            log(`Muted playback also failed: ${mutedError.message}`);

                            // On mobile devices, we might need to wait for user interaction
                            // Set up a click handler as fallback
                            if (mutedError.name === 'NotAllowedError' || mutedError.name === 'AbortError') {
                                setupUserInteractionHandlers();
                            }
                        }
                    }
                }
            }, 100); // Shorter delay to try sooner

            statusIndicator.textContent = `Connected with: ${call.peer}`;

            // Monitor if the video is actually playing
            setTimeout(() => {
                if (remoteVideo.readyState < 2) { // HAVE_CURRENT_DATA
                    log('Video not playing properly, showing play button');
                    playVideoBtn.style.display = 'block';
                }
            }, 3000);
        });

        call.on('close', () => {
            log(`Call ended with: ${call.peer}`);
            statusIndicator.textContent = 'Call ended';
            remoteVideo.srcObject = null;

            // Remove from active calls
            delete activeCalls[call.peer];
        });

        call.on('error', (err) => {
            log(`Call error: ${err.message}`);
            statusIndicator.textContent = `Call error: ${err.message}`;

            // Remove from active calls
            delete activeCalls[call.peer];
        });

        // Handle connection state changes
        call.on('connection', () => {
            log(`Call connection established with: ${call.peer}`);
        });

        // Monitor connection state
        call.on('iceConnectionStateChange', () => {
            const state = call.iceConnectionState;
            if (state) {
                log(`ICE state changed: ${state}`);
                if (state === 'connected') {
                    statusIndicator.textContent = `Connected with: ${call.peer}`;

                    // Check if video is playing properly after connection
                    setTimeout(() => {
                        if (remoteVideo && remoteVideo.paused) {
                            playVideoBtn.style.display = 'block';
                            log('Video not playing after connection, showing play button');
                        }
                    }, 2000);
                } else if (state === 'disconnected') {
                    statusIndicator.textContent = 'Connection lost, attempting to maintain session...';
                    log('ICE connection disconnected - may recover automatically');

                    // Sometimes browsers recover from temporary disconnections
                    // Don't close the call immediately, give it time to reconnect
                    setTimeout(() => {
                        if (call.iceConnectionState === 'disconnected') {
                            log('Connection did not recover within timeout');
                            // Don't automatically reconnect here as this may cause loops
                            // Let the users manually reconnect if needed

                            // However, log a more detailed message about the disconnection
                            log('Persistent disconnection detected - connection may require manual reconnection');
                        }
                    }, 30000); // Give more time for recovery (30 seconds)
                } else if (state === 'failed') {
                    statusIndicator.textContent = 'Connection failed';
                    log('ICE connection failed - possibly due to firewall/NAT issues');

                    // Don't automatically reconnect here to avoid connection loops
                    // Instead, inform the user that manual reconnection is needed

                    // Remove from active calls
                    delete activeCalls[call.peer];
                } else if (state === 'closed') {
                    statusIndicator.textContent = 'Connection closed';

                    // Remove from active calls
                    delete activeCalls[call.peer];
                } else if (state === 'checking') {
                    statusIndicator.textContent = `Connecting to: ${call.peer}`;

                    // Monitor if the connection is taking too long in 'checking' state
                    // which often indicates problems with NAT traversal
                    setTimeout(() => {
                        if (call.iceConnectionState === 'checking') {
                            log('Connection stuck in checking state - possible NAT traversal issue');
                        }
                    }, 15000); // Increase timeout to 15 seconds
                } else if (state === 'completed') {
                    statusIndicator.textContent = `Connected with: ${call.peer}`;

                    // Check if video is playing properly after connection completes
                    setTimeout(() => {
                        if (remoteVideo && remoteVideo.paused) {
                            playVideoBtn.style.display = 'block';
                            log('Video not playing after connection completed, showing play button');
                        }
                    }, 2000);
                }
            } else {
                log('ICE state changed: (state unavailable)');

                // If state is unavailable, try to recover by showing the play button
                setTimeout(() => {
                    if (remoteVideo && remoteVideo.paused) {
                        playVideoBtn.style.display = 'block';
                        log('Showing play button due to unavailable ICE state');
                    }
                }, 2000);
            }
        });

        currentCall = call;
    });
}

// Connect to a remote peer
function connectToPeer(remoteId) {
    try {
        // Check if we already have an active call with this peer
        if (activeCalls[remoteId]) {
            log(`Already have an active call with ${remoteId}, rejecting new connection...`);
            return;
        }

        const call = peer.call(remoteId, localStream);

        // Mark this call as active
        activeCalls[remoteId] = call;

        call.on('stream', (remoteStream) => {
            log(`Remote stream received from: ${remoteId}`);

            // First, ensure the video element exists and is ready
            if (!remoteVideo) {
                log('Error: remote video element not found');
                return;
            }

            // Properly handle the remote stream
            // First, wait for any existing stream to be released
            if (remoteVideo.srcObject) {
                // Release the current stream to prevent conflicts
                remoteVideo.srcObject = null;
            }

            // Ensure video element properties are set correctly BEFORE assigning the stream
            remoteVideo.playsInline = true;
            remoteVideo.autoplay = true;
            remoteVideo.muted = true; // Start with muted to comply with autoplay policies

            // Assign the new stream
            remoteVideo.srcObject = remoteStream;

            // Verify the stream assignment worked
            if (remoteVideo.srcObject !== remoteStream) {
                log('Warning: Stream assignment to video element may not have worked properly');
            }

            // IMMEDIATELY try to play the video after assigning the stream
            // This is the most critical change - try to play right away
            const attemptImmediatePlay = async () => {
                try {
                    // Ensure the video element has the right attributes for autoplay
                    remoteVideo.playsInline = true;
                    remoteVideo.autoplay = true;
                    remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                    // Try to play the video immediately after stream assignment
                    await remoteVideo.play();
                    log('Remote video played successfully (muted) after immediate attempt');

                    // Try to unmute if playback succeeded
                    try {
                        remoteVideo.muted = false;
                        log('Audio unmuted successfully after immediate play');
                    } catch (unmuteError) {
                        log(`Could not unmute audio after immediate play: ${unmuteError.message}`);
                        // Keep it muted but continue with video
                    }

                    // Hide the play button if it was shown
                    playVideoBtn.style.display = 'none';

                    return true; // Success
                } catch (error) {
                    log(`Error playing remote video immediately: ${error.name} - ${error.message}`);
                    return false; // Failed
                }
            };

            // Try immediate play right away
            attemptImmediatePlay().then(success => {
                if (!success) {
                    // If immediate play failed, continue with event-based approach
                    setupEventBasedPlayback();
                }
            });

            // Function to handle event-based playback as fallback
            const setupEventBasedPlayback = () => {
                // Since we received the stream, we know the connection is working
                // So we should show the play button immediately if needed
                setTimeout(() => {
                    if (remoteVideo.paused || remoteVideo.readyState < 2) {
                        log('Remote stream received but video not playing, showing play button');
                        playVideoBtn.style.display = 'block';
                    }
                }, 500); // Quick check after stream is set

                // Wait for the video element to be ready before playing
                remoteVideo.onloadedmetadata = () => {
                    log('Remote video metadata loaded');

                    // Check if the video is actually playing after metadata loads
                    setTimeout(async () => {
                        if (remoteVideo.paused) {
                            log('Video is paused after metadata load, attempting to play');

                            try {
                                // Ensure the video element has the right attributes for autoplay
                                remoteVideo.playsInline = true;
                                remoteVideo.autoplay = true;
                                remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                                await remoteVideo.play();
                                log('Remote video played successfully after metadata load (muted)');

                                // Try to unmute if playback succeeded
                                try {
                                    remoteVideo.muted = false;
                                    log('Audio unmuted successfully after metadata load');
                                } catch (unmuteError) {
                                    log(`Could not unmute audio after metadata load: ${unmuteError.message}`);
                                    // Keep it muted but continue with video
                                }

                                // Hide the play button if it was shown
                                playVideoBtn.style.display = 'none';
                            } catch (error) {
                                log(`Error playing remote video after metadata load: ${error.name} - ${error.message}`);
                                playVideoBtn.style.display = 'block'; // Show play button as fallback
                            }
                        }
                    }, 100);
                };

                // Wait for the video element to have enough data to play
                remoteVideo.onloadeddata = async () => {
                    log('Remote video data loaded, attempting to play');
                    try {
                        // Ensure the video element has the right attributes for autoplay
                        remoteVideo.playsInline = true;
                        remoteVideo.autoplay = true;
                        remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                        // Try to play the video after data has loaded
                        await remoteVideo.play();
                        log('Remote video played successfully (muted) after data load');

                        // Try to unmute if playback succeeded
                        try {
                            remoteVideo.muted = false;
                            log('Audio unmuted successfully after data load');
                        } catch (unmuteError) {
                            log(`Could not unmute audio after data load: ${unmuteError.message}`);
                            // Keep it muted but continue with video
                        }

                        // Hide the play button if it was shown
                        playVideoBtn.style.display = 'none';
                    } catch (error) {
                        log(`Error playing remote video after loadeddata: ${error.name} - ${error.message}`);
                        // Show the manual play button when automatic playback fails
                        playVideoBtn.style.display = 'block';
                    }
                };

                // Wait for the video element to be ready to play
                remoteVideo.oncanplay = async () => {
                    log('Remote video can play, attempting to play');
                    try {
                        // Ensure the video element has the right attributes for autoplay
                        remoteVideo.playsInline = true;
                        remoteVideo.autoplay = true;
                        remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                        // Try to play the video
                        await remoteVideo.play();
                        log('Remote video played successfully (muted) in oncanplay');

                        // Try to unmute if playback succeeded
                        try {
                            remoteVideo.muted = false;
                            log('Audio unmuted successfully in oncanplay');
                        } catch (unmuteError) {
                            log(`Could not unmute audio in oncanplay: ${unmuteError.message}`);
                            // Keep it muted but continue with video
                        }

                        // Hide the play button if it was shown
                        playVideoBtn.style.display = 'none';
                    } catch (error) {
                        log(`Error playing remote video in oncanplay: ${error.name} - ${error.message}`);
                        // Don't try to play again immediately, let the loadeddata event handle it
                    }
                };
            };

            // Additional fallback: try to play after a delay if events don't fire properly
            setTimeout(async () => {
                // Only try to play if we haven't already played successfully
                if (remoteVideo.paused && remoteVideo.readyState < 2) {
                    try {
                        // Ensure the video element has the right attributes for autoplay
                        remoteVideo.playsInline = true;
                        remoteVideo.autoplay = true;
                        remoteVideo.muted = true; // Start with muted to comply with autoplay policies

                        // Try to play the video after delay
                        await remoteVideo.play();
                        log('Remote video played successfully after delay (muted)');

                        // Try to unmute if playback succeeded
                        try {
                            remoteVideo.muted = false;
                            log('Audio unmuted successfully after delay');
                        } catch (unmuteError) {
                            log(`Could not unmute audio after delay: ${unmuteError.message}`);
                            // Keep it muted but continue with video
                        }

                        // Hide the play button if it was shown
                        playVideoBtn.style.display = 'none';
                    } catch (error) {
                        log(`Error playing remote video after delay: ${error.name} - ${error.message}`);

                        // Show the manual play button when automatic playback fails
                        playVideoBtn.style.display = 'block';

                        // Set up user interaction handlers as ultimate fallback
                        const setupUserInteractionHandlers = () => {
                            // Add event listener to multiple possible user interaction events
                            ['click', 'touchstart', 'touchend'].forEach(eventType => {
                                document.body.addEventListener(eventType, async () => {
                                    try {
                                        // Try to play with muted first
                                        remoteVideo.muted = true;
                                        await remoteVideo.play();

                                        // Try to unmute after successful play
                                        try {
                                            remoteVideo.muted = false;
                                            log('Audio unmuted after user interaction');
                                        } catch (unmuteAfterError) {
                                            log(`Could not unmute after user interaction: ${unmuteAfterError.message}`);
                                        }

                                        playVideoBtn.style.display = 'none';
                                        log('Remote video played after user interaction');
                                    } catch (interactionError) {
                                        log(`Play after interaction failed: ${interactionError.message}`);
                                    }
                                }, { once: true });
                            });
                        };

                        // Try muted playback as fallback
                        try {
                            remoteVideo.muted = true;
                            await remoteVideo.play();
                            log('Remote video played successfully with muted audio');
                            playVideoBtn.style.display = 'none';
                        } catch (mutedError) {
                            log(`Muted playback also failed: ${mutedError.message}`);

                            // On mobile devices, we might need to wait for user interaction
                            // Set up a click handler as fallback
                            if (mutedError.name === 'NotAllowedError' || mutedError.name === 'AbortError') {
                                setupUserInteractionHandlers();
                            }
                        }
                    }
                }
            }, 100); // Shorter delay to try sooner

            statusIndicator.textContent = `Connected with: ${remoteId}`;

            // Monitor if the video is actually playing
            setTimeout(() => {
                if (remoteVideo.readyState < 2) { // HAVE_CURRENT_DATA
                    log('Video not playing properly, showing play button');
                    playVideoBtn.style.display = 'block';
                }
            }, 3000);
        });

        call.on('close', () => {
            log(`Call ended with: ${remoteId}`);
            statusIndicator.textContent = 'Call ended';
            remoteVideo.srcObject = null;

            // Remove from active calls
            delete activeCalls[remoteId];
        });

        call.on('error', (err) => {
            log(`Call error with ${remoteId}: ${err.message}`);
            statusIndicator.textContent = `Call error: ${err.message}`;

            // Remove from active calls
            delete activeCalls[remoteId];
        });

        // Handle connection state changes
        call.on('connection', () => {
            log(`Call connection established with: ${remoteId}`);
        });

        // Monitor connection state
        call.on('iceConnectionStateChange', () => {
            const state = call.iceConnectionState;
            if (state) {
                log(`ICE state changed: ${state}`);
                if (state === 'connected' || state === 'completed') {
                    statusIndicator.textContent = `Connected with: ${remoteId}`;

                    // Check if video is playing properly after connection
                    setTimeout(() => {
                        if (remoteVideo && remoteVideo.paused) {
                            playVideoBtn.style.display = 'block';
                            log('Video not playing after connection, showing play button');
                        }
                    }, 2000);
                } else if (state === 'disconnected') {
                    statusIndicator.textContent = 'Connection lost, attempting to maintain session...';
                    log('ICE connection disconnected - may recover automatically');

                    // Sometimes browsers recover from temporary disconnections
                    // Don't close the call immediately, give it time to reconnect
                    setTimeout(() => {
                        if (call.iceConnectionState === 'disconnected') {
                            log('Connection did not recover within timeout');
                            // Don't automatically reconnect here as this may cause loops
                            // Let the users manually reconnect if needed

                            // However, log a more detailed message about the disconnection
                            log('Persistent disconnection detected - connection may require manual reconnection');
                        }
                    }, 30000); // Give more time for recovery (30 seconds)
                } else if (state === 'failed') {
                    statusIndicator.textContent = 'Connection failed';
                    log('ICE connection failed - possibly due to firewall/NAT issues');

                    // Don't automatically reconnect here to avoid connection loops
                    // Instead, inform the user that manual reconnection is needed

                    // Remove from active calls
                    delete activeCalls[remoteId];
                } else if (state === 'closed') {
                    statusIndicator.textContent = 'Connection closed';

                    // Remove from active calls
                    delete activeCalls[remoteId];
                } else if (state === 'checking') {
                    statusIndicator.textContent = `Connecting to: ${remoteId}`;

                    // Monitor if the connection is taking too long in 'checking' state
                    // which often indicates problems with NAT traversal
                    setTimeout(() => {
                        if (call.iceConnectionState === 'checking') {
                            log('Connection stuck in checking state - possible NAT traversal issue');
                        }
                    }, 15000); // Increase timeout to 15 seconds
                } else if (state === 'completed') {
                    statusIndicator.textContent = `Connected with: ${remoteId}`;

                    // Check if video is playing properly after connection completes
                    setTimeout(() => {
                        if (remoteVideo && remoteVideo.paused) {
                            playVideoBtn.style.display = 'block';
                            log('Video not playing after connection completed, showing play button');
                        }
                    }, 2000);
                }
            } else {
                log('ICE state changed: (state unavailable)');

                // If state is unavailable, try to recover by showing the play button
                setTimeout(() => {
                    if (remoteVideo && remoteVideo.paused) {
                        playVideoBtn.style.display = 'block';
                        log('Showing play button due to unavailable ICE state');
                    }
                }, 2000);
            }
        });

        currentCall = call;
    } catch (error) {
        log(`Error connecting to peer ${remoteId}: ${error.message}`);
        statusIndicator.textContent = `Connection error: ${error.message}`;
    }
}

// Generate a random ID for the peer
function generateRandomId() {
    return Math.random().toString(36).substring(2, 10) +
           Math.random().toString(36).substring(2, 10);
}

// Copy invite link to clipboard
copyLinkBtn.addEventListener('click', () => {
    if (!localVideoId) {
        statusIndicator.textContent = 'Not connected yet';
        return;
    }

    const roomId = window.location.hash.substring(1) || localVideoId;
    const inviteLink = `${window.location.origin}/#${roomId}`;

    navigator.clipboard.writeText(inviteLink)
        .then(() => {
            log(`Invite link copied: ${inviteLink}`);
            statusIndicator.textContent = 'Link copied to clipboard!';

            // Reset status after 2 seconds
            setTimeout(() => {
                if (currentCall) {
                    statusIndicator.textContent = `Connected with: ${currentCall.peer}`;
                } else {
                    statusIndicator.textContent = 'Connected';
                }
            }, 2000);
        })
        .catch(err => {
            log(`Failed to copy link: ${err}`);
            statusIndicator.textContent = 'Failed to copy link';
        });
});

// Handle browser back/forward buttons
window.addEventListener('hashchange', () => {
    const newRoomId = window.location.hash.substring(1);
    if (newRoomId && currentCall) {
        // End current call and connect to new room
        currentCall.close();
        connectToPeer(newRoomId);
    }
});

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', init);

// Expose toggleConsole for debugging
window.toggleConsole = toggleConsole;