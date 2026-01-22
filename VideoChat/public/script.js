// Global variables
let peer = null;
let localStream = null;
let currentCall = null;
let localVideoId = null;
let activeCalls = {}; // Track active calls to prevent duplicates
let lastProcessedStreamId = null; // Track last processed stream to prevent duplicates

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

        // Network detection for TURN server configuration
        const isLocalhost = window.location.hostname === 'localhost' ||
                          window.location.hostname.startsWith('192.168.') ||
                          window.location.hostname.startsWith('10.') ||
                          window.location.hostname.startsWith('172.') ||
                          window.location.hostname === '0.0.0.0';

        // FORCE RELAY-ONLY CONFIGURATION - Remove STUN to force TURN usage
        let iceServers = [];

        // Add TURN servers ONLY (no STUN) to force relay behavior
        const reliableTurnServers = [
            // Metered TURN servers (free and reliable)
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
            }
        ];

        // Add local TURN server if on localhost
        if (isLocalhost) {
            iceServers = [
                {
                    urls: 'turn:' + window.location.hostname + ':3478?transport=udp',
                    username: 'videocall',
                    credential: 'secret123'
                },
                ...reliableTurnServers
            ];
        } else {
            // For internet usage, use only public TURN servers
            iceServers = [...reliableTurnServers];
        }

        log(`ICE Servers configured: ${iceServers.length} total (TURN only for relay)`);
        iceServers.forEach((server, index) => {
            log(`ICE Server ${index + 1}: ${server.urls}`);
        });

        // Initialize Peer with a custom configuration pointing to our self-hosted server
        peer = new Peer(localVideoId, {
            host: window.location.hostname, // Use the same host as the web page (self-hosted)
            port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80), // Use same port as web page
            path: '/myapp', // Path where our PeerJS server is mounted on the same server
            config: {
                iceServers: iceServers,
                // Additional configuration options for better connectivity
                iceCandidatePoolSize: 10,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require',
                sdpSemantics: 'unified-plan'
            },
            // Additional options for better connectivity
            debug: 3, // Enable logging for debugging
            // Force relay usage to ensure TURN servers are used
            iceTransportPolicy: 'relay'  // Force TURN usage for reliable connections
        });

        peer.on('open', (id) => {
            log(`Peer connected with ID: ${id}`);

            // Check if there's a room ID in the URL hash
            const roomIdFromHash = window.location.hash.substring(1);
            if (roomIdFromHash && roomIdFromHash !== id) {
                // Join existing room - use the hash as the destination peer ID
                statusIndicator.textContent = `Joining room: ${roomIdFromHash}`;

                // Add a slight delay before connecting to ensure Peer is fully ready
                setTimeout(() => {
                    connectToPeer(roomIdFromHash);
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
                                connectToPeer(roomIdFromHash);
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

// Function to handle remote stream consistently
function handleRemoteStream(remoteStream, peerId) {
    // Prevent duplicate stream processing
    if (lastProcessedStreamId === remoteStream.id) {
        log(`Duplicate stream received from: ${peerId}, skipping...`);
        return;
    }

    lastProcessedStreamId = remoteStream.id;
    log(`Remote stream received from: ${peerId} (Stream ID: ${remoteStream.id})`);

    // First, ensure the video element exists and is ready
    if (!remoteVideo) {
        log('Error: remote video element not found');
        return;
    }

    // Properly handle the remote stream
    // First, wait for any existing stream to be released
    if (remoteVideo.srcObject) {
        // Release the current stream to prevent conflicts
        // Stop all tracks to properly release the stream
        const oldStream = remoteVideo.srcObject;
        if (oldStream && oldStream.getTracks) {
            oldStream.getTracks().forEach(track => track.stop());
        }
        remoteVideo.srcObject = null;
    }

    // Ensure video element properties are set correctly BEFORE assigning the stream
    remoteVideo.playsInline = true;
    remoteVideo.autoplay = true;
    remoteVideo.muted = true; // Start with muted to comply with autoplay policies

    // Assign the new stream
    remoteVideo.srcObject = remoteStream;

    log(`Stream assigned to video element, readyState: ${remoteVideo.readyState}`);

    // Verify the stream assignment worked
    if (remoteVideo.srcObject !== remoteStream) {
        log('Warning: Stream assignment to video element may not have worked properly');
    }

    // AGGRESSIVE VIDEO PLAYBACK - Try multiple methods to ensure video plays
    attemptAggressivePlay();
}

// Function to attempt aggressive play
async function attemptAggressivePlay() {
    // Method 1: Immediate play attempt
    try {
        remoteVideo.playsInline = true;
        remoteVideo.autoplay = true;
        remoteVideo.muted = true;

        await remoteVideo.play();
        log('Remote video played successfully (muted) via immediate play');

        // Try to unmute after successful play
        try {
            remoteVideo.muted = false;
            log('Audio unmuted successfully');
        } catch (unmuteError) {
            log(`Could not unmute audio: ${unmuteError.message}`);
        }

        playVideoBtn.style.display = 'none';
        return true;
    } catch (error) {
        log(`Immediate play failed: ${error.name} - ${error.message}`);
    }

    // Method 2: Wait for events before playing
    const waitForEvents = () => {
        return new Promise((resolve) => {
            const events = ['loadeddata', 'canplay', 'canplaythrough'];
            let resolved = false;

            const onPlaySuccess = async () => {
                if (resolved) return;
                resolved = true;

                try {
                    await remoteVideo.play();
                    log('Remote video played successfully via event listener');

                    // Try to unmute after successful play
                    try {
                        remoteVideo.muted = false;
                        log('Audio unmuted after event-based play');
                    } catch (unmuteError) {
                        log(`Could not unmute after event-based play: ${unmuteError.message}`);
                    }

                    playVideoBtn.style.display = 'none';
                    resolve(true);
                } catch (playError) {
                    log(`Event-based play failed: ${playError.message}`);
                    resolve(false);
                }
            };

            events.forEach(event => {
                remoteVideo.addEventListener(event, onPlaySuccess, { once: true });
            });

            // Timeout after 3 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    log('Event-based play timeout');
                    resolve(false);
                }
            }, 3000);
        });
    };

    const eventResult = await waitForEvents();
    if (eventResult) {
        return true;
    }

    // Method 3: Final fallback - setup event-based playback
    log('All play attempts failed, setting up event-based playback');
    setupEventBasedPlayback();
    return false;
}

// Function to attempt immediate play
async function attemptImmediatePlay() {
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
}

// Function to handle event-based playback as fallback
function setupEventBasedPlayback() {
    // Since we received the stream, we know the connection is working
    // So we should show the play button immediately if needed
    setTimeout(() => {
        if (remoteVideo.paused || remoteVideo.readyState < 2) {
            log('Remote stream received but video not playing, showing play button');
            playVideoBtn.style.display = 'block';
        }
    }, 500); // Quick check after stream is set

    // Wait for the video element to be ready before playing
    const handleMetadataLoaded = () => {
        log('Remote video metadata loaded');

        // Remove the event listener to prevent multiple calls
        remoteVideo.removeEventListener('loadedmetadata', handleMetadataLoaded);

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

    // Add the event listener
    remoteVideo.addEventListener('loadedmetadata', handleMetadataLoaded);

    // Wait for the video element to have enough data to play
    const handleDataLoaded = async () => {
        log('Remote video data loaded, attempting to play');

        // Remove the event listener to prevent multiple calls
        remoteVideo.removeEventListener('loadeddata', handleDataLoaded);

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

    // Add the event listener
    remoteVideo.addEventListener('loadeddata', handleDataLoaded);

    // Wait for the video element to be ready to play
    const handleCanPlay = async () => {
        log('Remote video can play, attempting to play');

        // Remove the event listener to prevent multiple calls
        remoteVideo.removeEventListener('canplay', handleCanPlay);

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

    // Add the event listener
    remoteVideo.addEventListener('canplay', handleCanPlay);

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

    // Monitor if the video is actually playing
    setTimeout(() => {
        if (remoteVideo.readyState < 2) { // HAVE_CURRENT_DATA
            log('Video not playing properly, showing play button');
            playVideoBtn.style.display = 'block';
        }
    }, 3000);
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
            handleRemoteStream(remoteStream, call.peer);
            statusIndicator.textContent = `Connected with: ${call.peer}`;
        });

        // CRITICAL: Log all ICE candidates to debug TURN
        if (call.peerConnection) {
            call.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    const c = event.candidate;
                    log(`📡 ICE Candidate [${c.type}]: ${c.candidate.substring(0, 80)}...`);

                    if (c.type === 'relay') {
                        log(`✅ RELAY CANDIDATE FOUND! TURN server working!`);
                    } else if (c.type === 'srflx') {
                        log(`🔄 SRFLX candidate (STUN)`);
                    } else if (c.type === 'host') {
                        log(`🏠 HOST candidate (local)`);
                    }
                } else {
                    log(`✓ ICE gathering complete`);
                }
            };

            // Also monitor ICE connection state changes
            call.peerConnection.oniceconnectionstatechange = () => {
                log(`ICE connection state: ${call.peerConnection.iceConnectionState}`);
            };

            // Monitor ICE gathering state
            call.peerConnection.onicegatheringstatechange = () => {
                log(`ICE gathering state: ${call.peerConnection.iceGatheringState}`);
            };
        }

        call.on('close', () => {
            log(`Call ended with: ${call.peer}`);
            statusIndicator.textContent = 'Call ended';
            remoteVideo.srcObject = null;

            // Stop all tracks in the remote stream to properly release resources
            if (remoteVideo.srcObject) {
                const oldStream = remoteVideo.srcObject;
                if (oldStream && oldStream.getTracks) {
                    oldStream.getTracks().forEach(track => track.stop());
                }
            }

            // Reset the last processed stream ID so new calls can be handled
            lastProcessedStreamId = null;

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
                if (state === 'connected' || state === 'completed') {
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

                            // Update the UI to reflect the actual state
                            statusIndicator.textContent = 'Connection lost, may require manual reconnection';

                            // Show the play button in case video was playing before disconnection
                            playVideoBtn.style.display = 'block';

                            // Clear the remote stream since connection is really lost
                            if (remoteVideo) {
                                remoteVideo.srcObject = null;
                            }
                        }
                    }, 10000); // Reduced timeout to 10 seconds for faster response
                } else if (state === 'failed') {
                    statusIndicator.textContent = 'Connection failed';
                    log('ICE connection failed - possibly due to firewall/NAT issues');

                    // Don't automatically reconnect here to avoid connection loops
                    // Instead, inform the user that manual reconnection is needed

                    // Remove from active calls
                    delete activeCalls[call.peer];

                    // Clear the remote stream since connection failed
                    if (remoteVideo) {
                        remoteVideo.srcObject = null;
                    }
                } else if (state === 'closed') {
                    statusIndicator.textContent = 'Connection closed';

                    // Remove from active calls
                    delete activeCalls[call.peer];

                    // Clear the remote stream since connection closed
                    if (remoteVideo) {
                        remoteVideo.srcObject = null;
                    }
                } else if (state === 'checking') {
                    statusIndicator.textContent = `Connecting to: ${call.peer}`;

                    // Monitor if the connection is taking too long in 'checking' state
                    // which often indicates problems with NAT traversal
                    setTimeout(() => {
                        if (call.iceConnectionState === 'checking') {
                            log('Connection stuck in checking state - possible NAT traversal issue');
                        }
                    }, 30000); // Increased timeout to 30 seconds for internet connections
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
            handleRemoteStream(remoteStream, remoteId);
            statusIndicator.textContent = `Connected with: ${remoteId}`;
        });

        // CRITICAL: Log all ICE candidates to debug TURN
        if (call.peerConnection) {
            call.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    const c = event.candidate;
                    log(`📡 ICE Candidate [${c.type}]: ${c.candidate.substring(0, 80)}...`);

                    if (c.type === 'relay') {
                        log(`✅ RELAY CANDIDATE FOUND! TURN server working!`);
                    } else if (c.type === 'srflx') {
                        log(`🔄 SRFLX candidate (STUN)`);
                    } else if (c.type === 'host') {
                        log(`🏠 HOST candidate (local)`);
                    }
                } else {
                    log(`✓ ICE gathering complete`);
                }
            };

            // Also monitor ICE connection state changes
            call.peerConnection.oniceconnectionstatechange = () => {
                log(`ICE connection state: ${call.peerConnection.iceConnectionState}`);
            };

            // Monitor ICE gathering state
            call.peerConnection.onicegatheringstatechange = () => {
                log(`ICE gathering state: ${call.peerConnection.iceGatheringState}`);
            };
        }

        call.on('close', () => {
            log(`Call ended with: ${remoteId}`);
            statusIndicator.textContent = 'Call ended';
            remoteVideo.srcObject = null;

            // Stop all tracks in the remote stream to properly release resources
            if (remoteVideo.srcObject) {
                const oldStream = remoteVideo.srcObject;
                if (oldStream && oldStream.getTracks) {
                    oldStream.getTracks().forEach(track => track.stop());
                }
            }

            // Reset the last processed stream ID so new calls can be handled
            lastProcessedStreamId = null;

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

                            // Update the UI to reflect the actual state
                            statusIndicator.textContent = 'Connection lost, may require manual reconnection';

                            // Show the play button in case video was playing before disconnection
                            playVideoBtn.style.display = 'block';

                            // Clear the remote stream since connection is really lost
                            if (remoteVideo) {
                                remoteVideo.srcObject = null;
                            }
                        }
                    }, 10000); // Reduced timeout to 10 seconds for faster response
                } else if (state === 'failed') {
                    statusIndicator.textContent = 'Connection failed';
                    log('ICE connection failed - possibly due to firewall/NAT issues');

                    // Don't automatically reconnect here to avoid connection loops
                    // Instead, inform the user that manual reconnection is needed

                    // Remove from active calls
                    delete activeCalls[remoteId];

                    // Clear the remote stream since connection failed
                    if (remoteVideo) {
                        remoteVideo.srcObject = null;
                    }
                } else if (state === 'closed') {
                    statusIndicator.textContent = 'Connection closed';

                    // Remove from active calls
                    delete activeCalls[remoteId];

                    // Clear the remote stream since connection closed
                    if (remoteVideo) {
                        remoteVideo.srcObject = null;
                    }
                } else if (state === 'checking') {
                    statusIndicator.textContent = `Connecting to: ${remoteId}`;

                    // Monitor if the connection is taking too long in 'checking' state
                    // which often indicates problems with NAT traversal
                    setTimeout(() => {
                        if (call.iceConnectionState === 'checking') {
                            log('Connection stuck in checking state - possible NAT traversal issue');
                        }
                    }, 30000); // Increased timeout to 30 seconds for internet connections
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

    // Always use the user's own peer ID for the invite link
    const inviteLink = `${window.location.origin}/#${localVideoId}`;

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
    if (newRoomId && currentCall && newRoomId !== localVideoId) {
        // End current call and connect to new room
        currentCall.close();
        connectToPeer(newRoomId);
    }
});

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', init);

// Expose toggleConsole for debugging
window.toggleConsole = toggleConsole;