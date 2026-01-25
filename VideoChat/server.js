import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import mediasoup from 'mediasoup';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const workers = [];
const rooms = new Map();

const mediasoupOptions = {
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 20000,
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
  },
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
      },
      {
        kind: 'video',
        mimeType: 'video/H264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '42e01f',
          'level-asymmetry-allowed': 1,
        },
      },
    ],
  },
  webRtcTransport: {
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP || null, // Let WebRTC auto-detect for tunneling
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
    enableSrtp: false,
  },
};

async function startWorkers() {
  const numWorkers = 1;
  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: mediasoupOptions.worker.logLevel,
      logTags: mediasoupOptions.worker.logTags,
      rtcMinPort: mediasoupOptions.worker.rtcMinPort,
      rtcMaxPort: mediasoupOptions.worker.rtcMaxPort,
    });
    
    worker.on('died', () => {
      console.error('mediasoup worker died, exiting..');
      process.exit(1);
    });
    
    workers.push(worker);
  }
}

async function getOrCreateRoom(roomId) {
  if (rooms.has(roomId)) {
    return rooms.get(roomId);
  }

  const worker = workers[0];
  const router = await worker.createRouter({
    mediaCodecs: mediasoupOptions.router.mediaCodecs,
  });

  const room = {
    id: roomId,
    router,
    peers: new Map(),
  };

  rooms.set(roomId, room);
  return room;
}

async function createWebRtcTransport(router) {
  const transport = await router.createWebRtcTransport(mediasoupOptions.webRtcTransport);

  transport.on('dtlsstatechange', (dtlsState) => {
    if (dtlsState === 'closed') {
      transport.close();
    }
  });

  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', async ({ roomId }, callback) => {
    try {
      const room = await getOrCreateRoom(roomId);
      
      if (room.peers.size >= 2) {
        callback({ error: 'Room is full' });
        return;
      }

      const { transport, params } = await createWebRtcTransport(room.router);
      
      const peer = {
        id: socket.id,
        transport,
        producers: new Map(),
        consumers: new Map(),
      };

      room.peers.set(socket.id, peer);
      socket.join(roomId);

      console.log(`Peer ${socket.id} joined room ${roomId}`);

      // Add proper STUN/TURN servers for tunneling
      params.iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ];

      callback({
        routerRtpCapabilities: room.router.rtpCapabilities,
        transportParams: params,
      });

      socket.to(roomId).emit('peer-joined', { peerId: socket.id });

      const existingPeers = Array.from(room.peers.keys()).filter(id => id !== socket.id);
      if (existingPeers.length > 0) {
        socket.emit('existing-peers', { peerIds: existingPeers });
      }

    } catch (error) {
      console.error('Error joining room:', error);
      callback({ error: 'Failed to join room' });
    }
  });

  socket.on('transport-connect', async ({ dtlsParameters }, callback) => {
    try {
      console.log(`Transport connect request from ${socket.id}`);
      const room = Array.from(rooms.values()).find(r => r.peers.has(socket.id));
      if (!room) throw new Error('Room not found');

      const peer = room.peers.get(socket.id);
      await peer.transport.connect({ dtlsParameters });
      console.log(`Transport connected for ${socket.id}`);
      
      callback({ success: true });
    } catch (error) {
      console.error('Transport connect error:', error);
      callback({ error: 'Transport connection failed' });
    }
  });

  socket.on('produce', async ({ kind, rtpParameters, appData }, callback) => {
    try {
      console.log(`Producer request from ${socket.id} for ${kind}`);
      const room = Array.from(rooms.values()).find(r => r.peers.has(socket.id));
      if (!room) throw new Error('Room not found');

      const peer = room.peers.get(socket.id);
      const producer = await peer.transport.produce({
        kind,
        rtpParameters,
        appData,
      });

      peer.producers.set(producer.id, producer);

      console.log(`✅ Producer created: ${producer.id} (${kind}) by ${socket.id}`);
      console.log(`📡 Media stream now being sent to SFU server from ${socket.id}`);

      socket.to(room.id).emit('new-producer', {
        producerId: producer.id,
        peerId: socket.id,
        kind,
      });

      callback({ id: producer.id });

    } catch (error) {
      console.error('❌ Produce error:', error);
      callback({ error: 'Failed to produce' });
    }
  });

  socket.on('get-producers', async ({ peerId }, callback) => {
    try {
      console.log(`Getting all producers for peer: ${peerId}`);
      const room = Array.from(rooms.values()).find(r => r.peers.has(peerId));
      if (!room) throw new Error('Room not found');

      const peer = room.peers.get(peerId);
      if (!peer) throw new Error('Peer not found');

      // Emit all existing producers from this peer
      peer.producers.forEach((producer, producerId) => {
        socket.emit('new-producer', {
          producerId: producerId,
          peerId: peerId,
          kind: producer.kind,
        });
      });

      console.log(`Emitted ${peer.producers.size} producers from peer ${peerId}`);

    } catch (error) {
      console.error('Get producers error:', error);
    }
  });

  socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
    try {
      const room = Array.from(rooms.values()).find(r => r.peers.has(socket.id));
      if (!room) throw new Error('Room not found');

      const peer = room.peers.get(socket.id);
      const producer = Array.from(room.peers.values())
        .flatMap(p => Array.from(p.producers.values()))
        .find(p => p.id === producerId);

      if (!producer) {
        callback({ error: 'Producer not found' });
        return;
      }

      const { transport, params } = await createWebRtcTransport(room.router);
      
      if (!room.router.canConsume({
        producerId: producer.id,
        rtpCapabilities,
      })) {
        callback({ error: 'Cannot consume' });
        return;
      }

      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: true,
      });

      peer.consumers.set(consumer.id, { transport, consumer });
      
      await consumer.resume();

      console.log(`Consumer created: ${consumer.id} for producer ${producerId} by ${socket.id}`);

      // Find the peer who owns this producer
      const producerPeer = Array.from(room.peers.entries())
        .find(([peerId, peer]) => peer.producers.has(producerId));
      
      callback({
        id: consumer.id,
        producerId,
        peerId: producerPeer ? producerPeer[0] : null,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        transportParams: params,
      });

    } catch (error) {
      console.error('Consume error:', error);
      callback({ error: 'Failed to consume' });
    }
  });

  socket.on('transport-connect-consume', async ({ transportId, dtlsParameters }, callback) => {
    try {
      const room = Array.from(rooms.values()).find(r => r.peers.has(socket.id));
      if (!room) throw new Error('Room not found');

      const peer = room.peers.get(socket.id);
      const consumerData = Array.from(peer.consumers.values())
        .find(c => c.transport.id === transportId);

      if (!consumerData) {
        callback({ error: 'Consumer transport not found' });
        return;
      }

      await consumerData.transport.connect({ dtlsParameters });
      callback({ success: true });

    } catch (error) {
      console.error('Transport connect consume error:', error);
      callback({ error: 'Failed to connect consumer transport' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    for (const [roomId, room] of rooms.entries()) {
      if (room.peers.has(socket.id)) {
        const peer = room.peers.get(socket.id);
        
        peer.producers.forEach(producer => producer.close());
        peer.consumers.forEach(({ transport, consumer }) => {
          consumer.close();
          transport.close();
        });
        peer.transport.close();
        
        room.peers.delete(socket.id);
        
        socket.to(roomId).emit('peer-left', { peerId: socket.id });
        
        if (room.peers.size === 0) {
          room.router.close();
          rooms.delete(roomId);
        }
        
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
startWorkers().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Announced IP: ${process.env.ANNOUNCED_IP || '127.0.0.1'}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});