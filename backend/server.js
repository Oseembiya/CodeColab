const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Your frontend URL
    methods: ["GET", "POST"]
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
  });

  // Handle code changes
  socket.on('code-change', ({ sessionId, change, userId }) => {
    socket.to(sessionId).emit('code-update', { change, userId });
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

httpServer.listen(3000); 