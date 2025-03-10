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
  }
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
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track active sessions and users
const activeSessions = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join session room
  socket.on('join-session', ({ sessionId, userId, username }) => {
    socket.join(sessionId);
    
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Map());
    }
    
    const sessionUsers = activeSessions.get(sessionId);
    sessionUsers.set(userId, {
      socketId: socket.id,
      username,
      cursor: { line: 0, column: 0 }
    });

    // Broadcast user joined
    io.to(sessionId).emit('user-joined', {
      userId,
      username,
      users: Array.from(sessionUsers.values())
    });

    console.log(`User ${username} joined session ${sessionId}`);
  });

  // Handle code changes
  socket.on('code-change', ({ sessionId, content, userId }) => {
    socket.to(sessionId).emit('code-update', { content, userId });
  });

  // Handle cursor movement
  socket.on('cursor-move', ({ sessionId, cursor, userId }) => {
    const sessionUsers = activeSessions.get(sessionId);
    if (sessionUsers?.has(userId)) {
      sessionUsers.get(userId).cursor = cursor;
      socket.to(sessionId).emit('cursor-update', { userId, cursor });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    activeSessions.forEach((users, sessionId) => {
      users.forEach((user, userId) => {
        if (user.socketId === socket.id) {
          users.delete(userId);
          io.to(sessionId).emit('user-left', { userId });
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