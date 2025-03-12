const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PeerServer } = require('peer');
require('dotenv').config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true
}));

const httpServer = createServer(app);

// Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  allowEIO3: true, // Allow Engine.IO version 3
  transports: ['websocket', 'polling'], // Allow both WebSocket and polling
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1 MB
  compression: true
});

// PeerJS server
const peerServer = PeerServer({
  port: 9000,
  path: '/myapp',
  proxied: true,
  allow_discovery: true,
  cleanup_out_msgs: 1000,
  alive_timeout: 60000,
  key: 'peerjs',
  ssl: false,
  concurrent_limit: 5000,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track active sessions and users
const activeSessions = new Map();

// Implement rate limiting for code updates
const updateRateLimiter = new Map();
const RATE_LIMIT_WINDOW = 100; // ms

// Add at the top with other declarations
const videoParticipants = new Map(); // Track video participants per session

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join session room
  socket.on('join-session', ({ sessionId, userId, username, photoURL }) => {
    socket.join(sessionId);
    
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Map());
    }
    
    const sessionUsers = activeSessions.get(sessionId);
    sessionUsers.set(userId, {
      socketId: socket.id,
      username: username || 'Anonymous',
      photoURL: photoURL || '/default-avatar.png',
      joinedAt: new Date().toISOString()
    });

    // Immediately emit updated participants list
    const participantsList = Array.from(sessionUsers.entries()).map(([id, user]) => ({
      userId: id,
      ...user
    }));

    // Emit to all clients in the session, including the sender
    io.in(sessionId).emit('participants-update', {
      participants: participantsList,
      count: sessionUsers.size
    });

    // Emit updates to both participants and observers
    io.to(sessionId).to(`observe:${sessionId}`).emit('participants-update', {
      participants: participantsList,
      count: sessionUsers.size
    });

    console.log(`User ${username} joined session ${sessionId}. Total participants: ${sessionUsers.size}`);
  });

  // Handle code changes
  socket.on('code-change', ({ sessionId, content, userId }) => {
    const now = Date.now();
    const lastUpdate = updateRateLimiter.get(userId) || 0;
    
    if (now - lastUpdate >= RATE_LIMIT_WINDOW) {
      socket.to(sessionId).emit('code-update', { content, userId });
      updateRateLimiter.set(userId, now);
    }
  });

  // Handle cursor movement
  socket.on('cursor-move', ({ sessionId, cursor, userId }) => {
    const sessionUsers = activeSessions.get(sessionId);
    if (sessionUsers?.has(userId)) {
      sessionUsers.get(userId).cursor = cursor;
      socket.to(sessionId).emit('cursor-update', { userId, cursor });
    }
  });

  // Handle session observation
  socket.on('observe-session', ({ sessionId }) => {
    socket.join(`observe:${sessionId}`);
    
    // Send initial participant count
    const sessionUsers = activeSessions.get(sessionId);
    if (sessionUsers) {
      socket.emit('participants-update', {
        count: sessionUsers.size,
        participants: Array.from(sessionUsers.entries()).map(([id, user]) => ({
          userId: id,
          ...user
        }))
      });
    }
  });

  // Handle disconnection with participant count update
  socket.on('disconnect', () => {
    activeSessions.forEach((users, sessionId) => {
      users.forEach((user, userId) => {
        if (user.socketId === socket.id) {
          users.delete(userId);
          
          const participantsList = Array.from(users.entries()).map(([id, user]) => ({
            userId: id,
            ...user
          }));

          io.to(sessionId).to(`observe:${sessionId}`).emit('participants-update', {
            participants: participantsList,
            count: users.size
          });
          
          console.log(`User left session ${sessionId}. Remaining participants: ${users.size}`);
        }
      });
    });
  });

  // Handle video chat participants
  socket.on('join-video', ({ sessionId, userId, peerId }) => {
    console.log(`User ${userId} joined video chat in session ${sessionId} with peer ID ${peerId}`);
    
    // Join the video room
    socket.join(`video-${sessionId}`);
    
    // Notify others in the session about the new participant
    socket.to(`video-${sessionId}`).emit('user-joined', {
      userId,
      peerId
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${userId} left video chat`);
      io.to(`video-${sessionId}`).emit('user-left', {
        userId,
        peerId
      });
    });
  });
});

// PeerJS server events
peerServer.on('connection', (client) => {
  console.log('PeerJS client connected:', client.getId());
});

peerServer.on('disconnect', (client) => {
  console.log('PeerJS client disconnected:', client.getId());
});

// Error handling
peerServer.on('error', (error) => {
  console.error('PeerJS server error:', error);
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`PeerJS server running on port 9000`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  
  httpServer.close(() => {
    console.log('Express server closed');
  });
  
  peerServer.close(() => {
    console.log('PeerJS server closed');
  });
  
  process.exit(0);
});

// Add this near the top of your server.js
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
}); 