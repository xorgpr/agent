const express = require('express');
const { ExpressPeerServer } = require('peer');
const http = require('http');
const socketIo = require('socket.io');
const mediasoup = require('mediasoup');

// Create Express app
const app = express();

// Serve static files from the current directory
app.use(express.static('.'));

// Create HTTP server
const server = http.createServer(app);

// Initialize mediasoup
let mediaWorkers = [];
let nextMediasoupWorkerIdx = 0;

async function createMediasoupWorkers() {
  const numWorkers = process.env.MEDIASOUP_NUM_WORKERS || 1;

  for (let i = 0; i < numWorkers; ++i) {
    const worker = await mediasoup.createWorker({
      logLevel: 'warn',
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp',
        // 'rtx',
        // 'bwe',
        // 'score',
        // 'simulcast',
        // 'svc'
      ],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    });

    worker.on('died', () => {
      console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
      setTimeout(() => process.exit(1), 2000);
    });

    mediaWorkers.push(worker);
  }

  console.log('mediasoup workers created');
}

async function getMediasoupWorker() {
  const worker = mediaWorkers[nextMediasoupWorkerIdx];

  nextMediasoupWorkerIdx = (nextMediasoupWorkerIdx + 1) % mediaWorkers.length;

  return worker;
}

// Start the PeerServer integrated with the Express app
const peerServer = ExpressPeerServer(server, {
  debug: true,
  proxied: true // Handle headers from proxy/tunnel
});

app.use('/p2p', peerServer);

// Create rooms map for SFU
const rooms = new Map(); // key: roomId, value: { router, producers, consumers, peers }
const peers = new Map(); // key: peerId, value: { socket, transport, peerInfo }

// Create Socket.IO server for SFU signaling
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`New SFU client connected: ${socket.id}`);
  console.log(`SFU WebSocket connection established from: ${socket.handshake.address}`);

  socket.on('join', async ({ roomId, peerInfo }) => {
    // Get or create room
    let room = rooms.get(roomId);
    if (!room) {
      const worker = await getMediasoupWorker();
      const router = await worker.createRouter();

      room = {
        router,
        producers: new Map(),
        consumers: new Map(),
        peers: new Map()
      };
      rooms.set(roomId, room);
    }

    // Store peer
    peers.set(socket.id, {
      socket,
      roomId,
      peerInfo
    });

    // Add peer to room
    room.peers.set(socket.id, {
      id: socket.id,
      peerInfo
    });

    // Notify existing peers about new peer
    socket.to(roomId).emit('peer-joined', {
      peerId: socket.id,
      peerInfo
    });

    // Join room
    socket.join(roomId);

    // Send existing peers to new peer
    const existingPeers = Array.from(room.peers.values()).filter(p => p.id !== socket.id);
    socket.emit('peers-list', existingPeers);

    // Send router RTP capabilities to client
    socket.emit('router-rtp-capabilities', {
      rtpCapabilities: room.router.rtpCapabilities
    });
  });

  socket.on('create-web-rtc-transport', async ({ consumer }) => {
    const peer = peers.get(socket.id);
    if (!peer) return;

    const room = rooms.get(peer.roomId);
    if (!room) return;

    const transport = await room.router.createWebRtcTransport({
      listenIps: [
        { ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP || undefined }
      ],
      enableUdp: true,
      enableTcp: false,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
    });

    // Store transport
    if (!consumer) {
      peers.set(socket.id, { ...peer, producerTransport: transport });
    } else {
      peers.set(socket.id, { ...peer, consumerTransport: transport });
    }

    socket.emit('web-rtc-transport-created', {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  });

  socket.on('produce', async ({ kind, rtpParameters, producerTransportId }) => {
    const peer = peers.get(socket.id);
    if (!peer) return;

    const room = rooms.get(peer.roomId);
    if (!room) return;

    const transport = peer.producerTransport;
    if (!transport) return;

    const producer = await transport.produce({ kind, rtpParameters });

    // Store producer
    room.producers.set(producer.id, {
      producer,
      peerId: socket.id,
      kind
    });

    // Notify all other peers about new producer
    socket.to(peer.roomId).emit('new-producer', {
      peerId: socket.id,
      producerId: producer.id,
      kind: producer.kind
    });

    socket.emit('produced', { id: producer.id });
  });

  socket.on('consume', async ({ producerId }) => {
    const peer = peers.get(socket.id);
    if (!peer) return;

    const room = rooms.get(peer.roomId);
    if (!room) return;

    const consumerTransport = peer.consumerTransport;
    if (!consumerTransport) return;

    const producer = room.producers.get(producerId);
    if (!producer) return;

    const consumer = await consumerTransport.consume({
      producerId: producerId,
      rtpCapabilities: room.router.rtpCapabilities
    });

    // Store consumer
    room.consumers.set(consumer.id, {
      consumer,
      peerId: socket.id,
      producerId
    });

    socket.emit('consumer-created', {
      id: consumer.id,
      producerId: producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused
    });
  });

  socket.on('producer-pause', async ({ producerId }) => {
    const producer = Array.from(rooms.values())
      .flatMap(room => Array.from(room.producers.values()))
      .find(p => p.producer.id === producerId);

    if (producer) {
      await producer.producer.pause();
      // Notify all peers in the room
      const room = Array.from(rooms.entries()).find(([_, r]) =>
        r.producers.has(producerId)
      );
      if (room) {
        io.to(room[0]).emit('producer-paused', { producerId });
      }
    }
  });

  socket.on('producer-resume', async ({ producerId }) => {
    const producer = Array.from(rooms.values())
      .flatMap(room => Array.from(room.producers.values()))
      .find(p => p.producer.id === producerId);

    if (producer) {
      await producer.producer.resume();
      // Notify all peers in the room
      const room = Array.from(rooms.entries()).find(([_, r]) =>
        r.producers.has(producerId)
      );
      if (room) {
        io.to(room[0]).emit('producer-resumed', { producerId });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`SFU client disconnected: ${socket.id}`);

    const peer = peers.get(socket.id);
    if (peer) {
      const room = rooms.get(peer.roomId);
      if (room) {
        // Remove peer from room
        room.peers.delete(socket.id);

        // Remove transports
        if (peer.producerTransport) {
          peer.producerTransport.close();
        }
        if (peer.consumerTransport) {
          peer.consumerTransport.close();
        }

        // Remove all producers from this peer
        for (const [producerId, producer] of room.producers.entries()) {
          if (producer.peerId === socket.id) {
            producer.producer.close();
            room.producers.delete(producerId);
          }
        }

        // Remove all consumers from this peer
        for (const [consumerId, consumer] of room.consumers.entries()) {
          if (consumer.peerId === socket.id) {
            consumer.consumer.close();
            room.consumers.delete(consumerId);
          }
        }

        // Notify other peers about disconnection
        socket.to(peer.roomId).emit('peer-left', { peerId: socket.id });

        // Clean up room if empty
        if (room.peers.size === 0) {
          rooms.delete(peer.roomId);
        }
      }
      peers.delete(socket.id);
    }
  });
});

// Listen on a single port
const PORT = 9000;
server.listen(PORT, async () => {
  console.log(`Hybrid Video Chat server listening on port ${PORT}`);
  console.log('P2P Signaling path: /p2p');
  console.log('SFU Signaling path: WebSocket');
  console.log('Frontend available at: /');
  console.log('Proxied: true');

  // Initialize mediasoup workers
  await createMediasoupWorkers();
});

peerServer.on('connection', (client) => {
  console.log(`P2P client connected: ${client.getId()}`);
});

peerServer.on('disconnect', (client) => {
  console.log(`P2P client disconnected: ${client.getId()}`);
});

peerServer.on('error', (err) => {
  console.error('PeerServer error:', err);
});