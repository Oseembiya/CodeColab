const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PeerServer } = require('peer');
require('dotenv').config();

const app = express();
app.use(cors());

const httpServer = createServer(app);

// Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  },
  transports: ['websocket'], // Force WebSocket transport
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

    // Broadcast updated participants list to all clients in the session
    io.to(sessionId).emit('participants-update', {
      participants: Array.from(sessionUsers.entries()).map(([id, user]) => ({
        userId: id,
        ...user
      })),
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

  // Handle disconnection with participant count update
  socket.on('disconnect', () => {
    activeSessions.forEach((users, sessionId) => {
      users.forEach((user, userId) => {
        if (user.socketId === socket.id) {
          users.delete(userId);
          
          // Broadcast updated count and participants list
          io.to(sessionId).emit('participants-update', {
            participants: Array.from(users.entries()).map(([id, user]) => ({
              userId: id,
              ...user
            })),
            count: users.size
          });
          
          console.log(`User left session ${sessionId}. Remaining participants: ${users.size}`);
        }
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
  console.log(`Express server running on port ${PORT}`);
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