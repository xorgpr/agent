import { io } from 'https://cdn.esm.sh/socket.io-client@4.7.2';
import { Device } from 'https://cdn.esm.sh/mediasoup-client@3.13.0';

class VideoChatClient {
  constructor() {
    this.socket = null;
    this.device = null;
    this.localStream = null;
    this.producerTransport = null;
    this.consumerTransports = new Map();
    this.consumers = new Map();
    this.producers = new Map();
    this.roomId = this.getRoomId();
    this.isConnecting = false;
    
    this.initElements();
    this.initEventListeners();
    this.connect();
  }

  getRoomId() {
    const hash = window.location.hash.slice(1);
    return hash || `room-${Math.random().toString(36).substr(2, 9)}`;
  }

  initElements() {
    this.localVideo = document.getElementById('localVideo');
    this.remoteVideo = document.getElementById('remoteVideo');
    this.status = document.getElementById('status');
    this.copyLinkBtn = document.getElementById('copyLinkBtn');
    this.toggleDebugBtn = document.getElementById('toggleDebugBtn');
    this.debugConsole = document.getElementById('debugConsole');
    this.debugLogs = document.getElementById('debugLogs');
    this.clearDebugBtn = document.getElementById('clearDebugBtn');
  }

  initEventListeners() {
    this.copyLinkBtn.addEventListener('click', () => this.copyLink());
    this.toggleDebugBtn.addEventListener('click', () => this.toggleDebug());
    this.clearDebugBtn.addEventListener('click', () => this.clearDebug());
    
    if (!this.roomId.startsWith('room-')) {
      window.location.hash = `#${this.roomId}`;
    }
  }

  debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = 'debug-log';
    logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
    
    if (data) {
      const dataElement = document.createElement('pre');
      dataElement.className = 'debug-data';
      dataElement.textContent = JSON.stringify(data, null, 2);
      logEntry.appendChild(dataElement);
    }
    
    this.debugLogs.appendChild(logEntry);
    this.debugLogs.scrollTop = this.debugLogs.scrollHeight;
    
    console.log('[VideoChat]', message, data);
  }

  toggleDebug() {
    this.debugConsole.classList.toggle('hidden');
  }

  clearDebug() {
    this.debugLogs.innerHTML = '';
  }

  updateStatus(message) {
    this.status.textContent = message;
    this.debugLog('Status:', message);
  }

  copyLink() {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      this.updateStatus('Link copied to clipboard!');
      setTimeout(() => this.updateStatus(''), 2000);
    }).catch(err => {
      this.debugLog('Failed to copy link:', err);
    });
  }

  async connect() {
    try {
      this.updateStatus('Connecting to server...');
      this.debugLog('Connecting to server...');
      
      this.socket = io({
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });
      
      this.socket.on('connect', () => {
        this.debugLog('Connected to server');
        this.joinRoom();
      });

      this.socket.on('disconnect', () => {
        this.debugLog('Disconnected from server');
        this.updateStatus('Disconnected');
      });

      this.socket.on('existing-peers', ({ peerIds }) => {
        this.debugLog('🔎 Found existing peers:', peerIds);
        peerIds.forEach(peerId => {
          this.debugLog(`🎯 Will consume from peer: ${peerId}`);
          // Trigger consumption for all existing peer producers AFTER device is ready
          setTimeout(() => {
            if (this.device && this.device.loaded) {
              this.requestAllPeerProducers(peerId);
            } else {
              this.debugLog(`⏳ Device not ready yet for peer ${peerId}, will retry...`);
              setTimeout(() => this.requestAllPeerProducers(peerId), 2000);
            }
          }, 1000);
        });
      });

      this.socket.on('peer-joined', ({ peerId }) => {
        this.debugLog('Peer joined:', peerId);
        this.updateStatus('Peer joined');
      });

      this.socket.on('peer-left', ({ peerId }) => {
        this.debugLog('Peer left:', peerId);
        this.updateStatus('Peer left');
        this.cleanupPeer(peerId);
      });

      this.socket.on('new-producer', ({ producerId, peerId, kind }) => {
        this.debugLog('📢 New producer available:', { producerId, peerId, kind });
        this.consumeProducer(producerId, peerId);
      });

    } catch (error) {
      this.debugLog('Connection error:', error);
      this.updateStatus('Connection failed');
    }
  }

  cleanupPeer(peerId) {
    this.debugLog(`🧹 Cleaning up peer: ${peerId}`);
    
    // Clean up consumers for this peer
    for (const [consumerId, consumerData] of this.consumers) {
      if (consumerData.peerId === peerId) {
        this.debugLog(`🗑️ Removing consumer ${consumerId} from peer ${peerId}`);
        
        // Remove track from stream before closing consumer
        const stream = this.remoteVideo.srcObject;
        if (stream && consumerData.consumer.track) {
          const tracks = stream.getTracks();
          const trackToRemove = tracks.find(t => t.id === consumerData.consumer.track.id);
          if (trackToRemove) {
            stream.removeTrack(trackToRemove);
            this.debugLog(`🔇 Removed ${consumerData.consumer.track.kind} track from stream`);
          }
        }
        
        consumerData.consumer.close();
        const transport = this.consumerTransports.get(consumerData.transportId);
        if (transport) {
          transport.close();
          this.consumerTransports.delete(consumerData.transportId);
        }
        this.consumers.delete(consumerId);
      }
    }
    
    // Only clear video element if no more consumers
    if (this.consumers.size === 0 && this.remoteVideo.srcObject) {
      this.debugLog('🎥 No more consumers, clearing remote video');
      const tracks = this.remoteVideo.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.remoteVideo.srcObject = null;
    }
  }

  async joinRoom() {
    try {
      this.updateStatus('Joining room...');
      this.debugLog(`Joining room: ${this.roomId}`);
      
      const response = await new Promise((resolve) => {
        this.socket.emit('join-room', { roomId: this.roomId }, resolve);
      });

      if (response.error) {
        throw new Error(response.error);
      }

      this.debugLog('Room joined successfully');
      
      // Get user media FIRST before device init
      await this.getUserMedia();
      
      // Then initialize device and start sending
      await this.initDevice(response.routerRtpCapabilities);
      await this.createSendTransport(response.transportParams);
      await this.startSending();

    } catch (error) {
      this.debugLog('Join room error:', error);
      this.updateStatus(error.message || 'Failed to join room');
    }
  }

  async initDevice(routerRtpCapabilities) {
    this.debugLog('Initializing Mediasoup device...');
    
    try {
      this.device = new Device();
      await this.device.load({ routerRtpCapabilities });
      this.debugLog('✅ Device loaded with capabilities:', this.device.rtpCapabilities);
    } catch (error) {
      this.debugLog('❌ Device initialization error:', error);
      throw error;
    }
  }

  async createSendTransport(transportParams) {
    this.debugLog('Creating send transport...', transportParams);
    
    try {
      // Add STUN servers for NAT traversal
      if (!transportParams.iceServers) {
        transportParams.iceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ];
      }
      
      this.producerTransport = this.device.createSendTransport(transportParams);
      this.debugLog('✅ Send transport created');

      // Set up event listeners with proper error handling
      this.producerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        this.debugLog('🔗 Send transport connecting to SFU...');
        this.socket.emit('transport-connect', { dtlsParameters }, (response) => {
          if (response.error) {
            this.debugLog('❌ Send transport connection failed:', response.error);
            errback(new Error(response.error));
          } else {
            this.debugLog('✅ Send transport connected to SFU');
            callback();
          }
        });
      });

      this.producerTransport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        this.debugLog(`🎤 Producing ${kind} track to SFU...`);
        this.socket.emit('produce', { kind, rtpParameters, appData }, (response) => {
          if (response.error) {
            this.debugLog('❌ Producer creation failed:', response.error);
            errback(new Error(response.error));
          } else {
            this.debugLog(`✅ ${kind} producer created - Media sent to SFU:`, response.id);
            callback({ id: response.id });
          }
        });
      });

      this.producerTransport.on('connectionstatechange', (state) => {
        this.debugLog('Send transport connection state:', state);
        if (state === 'failed') {
          this.debugLog('❌ Send transport failed');
          this.producerTransport.close();
        }
      });

    } catch (error) {
      this.debugLog('❌ Error creating send transport:', error);
      throw error;
    }
  }

  async getUserMedia() {
    this.debugLog('📹 Getting camera and microphone...');
    
    try {
      // Request camera and microphone
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      
      // Set local video source
      this.localVideo.srcObject = this.localStream;
      
      // Make sure of video plays
      this.localVideo.muted = true; // Mute local video to avoid echo
      
      // Wait for video to be ready and play it
      await new Promise((resolve, reject) => {
        this.localVideo.onloadedmetadata = () => {
          this.localVideo.play()
            .then(() => {
              this.debugLog('✅ Local video playing - Camera preview working');
              resolve();
            })
            .catch(err => {
              this.debugLog('❌ Error playing local video:', err);
              reject(err);
            });
        };
        
        this.localVideo.onerror = () => {
          reject(new Error('Local video error'));
        };
      });
      
      this.debugLog('✅ Camera and microphone access successful');
      
    } catch (error) {
      this.debugLog('❌ Camera/microphone access error:', error);
      this.updateStatus('Camera/microphone access denied');
      throw error;
    }
  }

  async startSending() {
    this.debugLog('🚀 Starting to send media to SFU...');
    
    if (!this.localStream) {
      this.debugLog('❌ No local stream available');
      return;
    }
    
    if (!this.producerTransport) {
      this.debugLog('❌ No producer transport available');
      return;
    }

    const tracks = this.localStream.getTracks();
    this.debugLog(`📹 Found ${tracks.length} tracks to send:`, tracks.map(t => `${t.kind} (${t.readyState})`));
    
    for (const track of tracks) {
      try {
        this.debugLog(`🎥 Creating producer for ${track.kind} track...`);
        const producer = await this.producerTransport.produce({
          track,
          appData: { mediaTag: track.kind },
        });
        
        this.producers.set(producer.id, producer);
        this.debugLog(`✅ ${track.kind} producer created successfully - Track sent to SFU:`, producer.id);
        
        // Verify producer is active
        this.debugLog(`📊 Producer ${producer.id} state:`, {
          paused: producer.paused,
          closed: producer.closed,
          kind: producer.kind
        });
        
      } catch (error) {
        this.debugLog(`❌ Error producing ${track.kind}:`, error);
      }
    }

    if (this.producers.size > 0) {
      this.updateStatus(`📡 Streaming to SFU (${this.producers.size} tracks) - Waiting for peer`);
    } else {
      this.updateStatus('❌ No media streams sent to SFU');
    }
  }

  async requestAllPeerProducers(peerId) {
    if (!this.device || !this.device.loaded) {
      this.debugLog(`⏳ Device not ready for peer ${peerId}`);
      return;
    }
    
    this.debugLog(`🔄 Requesting all producers from peer: ${peerId}`);
    // The server will emit 'new-producer' for each existing producer
    this.socket.emit('get-producers', { peerId });
  }

  async consumeProducer(producerId, peerId) {
    try {
      if (!this.device || !this.device.loaded) {
        this.debugLog(`⏳ Cannot consume ${producerId}: Device not ready`);
        return;
      }
      
      this.debugLog('📥 Starting to consume producer:', { producerId, peerId });
      
      const response = await new Promise((resolve) => {
        this.debugLog('📤 Sending consume request to server...');
        this.socket.emit('consume', {
          producerId,
          rtpCapabilities: this.device.rtpCapabilities,
        }, (data) => {
          this.debugLog('📨 Consumer response from server:', data);
          resolve(data);
        });
      });

      if (response.error) {
        this.debugLog('❌ Consumer response error:', response.error);
        throw new Error(response.error);
      }

      this.debugLog('✅ Consumer response received - Creating transport...');
      
      // Add STUN servers for consumer transport
      if (!response.transportParams.iceServers) {
        response.transportParams.iceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ];
      }

      const consumerTransport = this.device.createRecvTransport(response.transportParams);
      this.consumerTransports.set(consumerTransport.id, consumerTransport);

      consumerTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        this.debugLog('🔗 Consumer transport connecting to receive media from SFU...');
        this.socket.emit('transport-connect-consume', {
          transportId: consumerTransport.id,
          dtlsParameters,
        }, (response) => {
          if (response.error) {
            this.debugLog('❌ Consumer transport connection failed:', response.error);
            errback(new Error(response.error));
          } else {
            this.debugLog('✅ Consumer transport connected - Ready to receive media from SFU');
            callback();
          }
        });
      });

      consumerTransport.on('connectionstatechange', (state) => {
        this.debugLog('Consumer transport connection state:', state);
        if (state === 'failed') {
          this.debugLog('❌ Consumer transport failed, cleaning up...');
          consumerTransport.close();
          this.consumerTransports.delete(consumerTransport.id);
        }
      });

      this.debugLog(`📥 Consuming ${response.kind} from SFU producer ${response.producerId}...`);
      
      const consumer = await consumerTransport.consume({
        producerId: response.producerId,
        id: response.id,
        kind: response.kind,
        rtpParameters: response.rtpParameters,
      });

      this.consumers.set(consumer.id, {
        consumer,
        transportId: consumerTransport.id,
        producerId: response.producerId,
        peerId: peerId,
      });

      this.debugLog(`✅ Consumer created for ${response.kind} - Receiving media from SFU:`, consumer.id);

      // Handle the received track from SFU
      if (consumer.kind === 'video') {
        this.debugLog('📹 Setting up remote video from SFU...');
        this.debugLog('📹 Consumer track state:', {
          enabled: consumer.track.enabled,
          muted: consumer.track.muted,
          readyState: consumer.track.readyState,
          kind: consumer.track.kind
        });
        
        // Check if we already have a stream to avoid play interruption
        let currentStream = this.remoteVideo.srcObject;
        
        if (!currentStream) {
          // Create new stream if none exists
          currentStream = new MediaStream();
          this.remoteVideo.srcObject = currentStream;
          this.remoteVideo.muted = false;
          
          // Set up video play with proper error handling
          this.remoteVideo.play().catch(err => {
            this.debugLog('❌ Initial video play error:', err);
          });
        }
        
        // Add new track to existing stream instead of replacing
        currentStream.addTrack(consumer.track);
        
        this.debugLog('📹 Added track to remote stream, total tracks:', currentStream.getTracks().length);
        
        // Unmute remote video for audio
        this.remoteVideo.muted = false;
        
        this.remoteVideo.play().catch(err => {
          this.debugLog('❌ Error playing remote video:', err);
        }).then(() => {
          this.debugLog('✅ Remote video playing - Received from SFU via peer');
        });
        this.updateStatus('🎥 Video call active - Media routed through SFU');
      } else if (consumer.kind === 'audio') {
        this.debugLog('🔊 Setting up remote audio from SFU...');
        let stream = this.remoteVideo.srcObject;
        
        if (!stream) {
          stream = new MediaStream();
          this.remoteVideo.srcObject = stream;
          this.remoteVideo.muted = false;
          this.remoteVideo.play().catch(err => {
            this.debugLog('❌ Initial audio play error:', err);
          });
        }
        
        // Add audio track to existing stream
        stream.addTrack(consumer.track);
        this.debugLog('✅ Remote audio added - Total tracks:', stream.getTracks().length);
      }

    } catch (error) {
      this.debugLog('❌ Consume producer error:', error);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VideoChatClient();
});