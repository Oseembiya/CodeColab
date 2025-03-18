const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { PeerServer } = require("peer");
require("dotenv").config();

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const httpServer = createServer(app);

// Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  allowEIO3: true, // Allow Engine.IO version 3
  transports: ["websocket", "polling"], // Allow both WebSocket and polling
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1 MB
  compression: true,
});

// PeerJS server
const peerServer = PeerServer({
  port: 9000,
  path: "/myapp",
  proxied: true,
  allow_discovery: true,
  cleanup_out_msgs: 1000,
  alive_timeout: 60000,
  key: "peerjs",
  ssl: false,
  concurrent_limit: 5000,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Track active sessions and users
const activeSessions = new Map();

// Add at the top with other declarations
const videoParticipants = new Map(); // Track video participants per session

// Track session code state
const sessionStates = new Map();

const connectedSessions = new Map();

// Add at the top with other declarations
const connectedClients = new Map();

// Add at the top with other declarations
const sessionObservers = new Map();

io.on("connection", (socket) => {
  const clientId = socket.handshake.auth.clientId;

  if (clientId) {
    // Check if this client was already connected
    const existingSocket = connectedClients.get(clientId);
    if (existingSocket) {
      // Remove the old socket connection
      existingSocket.disconnect();
      console.log(`Disconnected previous session for client: ${clientId}`);
    }

    // Store the new socket connection
    connectedClients.set(clientId, socket);
    console.log(`Client connected/reconnected: ${clientId}`);

    // Update the socket's data
    socket.clientId = clientId;
  }

  socket.on("disconnect", () => {
    if (socket.clientId) {
      // Only remove the client if this is the current socket for that client
      if (connectedClients.get(socket.clientId) === socket) {
        connectedClients.delete(socket.clientId);
        console.log(`Client disconnected: ${socket.clientId}`);
      }
    }
  });

  socket.on("join-session", ({ sessionId, userId, username, photoURL }) => {
    socket.join(sessionId);

    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Map());
    }

    const sessionUsers = activeSessions.get(sessionId);

    // Check if user is already in session
    const existingUser = Array.from(sessionUsers.values()).find(
      (user) => user.clientId === clientId
    );
    if (existingUser) {
      // Update existing user's socket ID
      existingUser.socketId = socket.id;
    } else {
      // Add new user
      sessionUsers.set(socket.clientId, {
        socketId: socket.id,
        clientId: socket.clientId,
        username: username || "Anonymous",
        photoURL: photoURL || "/default-avatar.png",
        joinedAt: new Date().toISOString(),
      });
    }

    // Immediately emit updated participants list
    const participantsList = Array.from(sessionUsers.entries()).map(
      ([id, user]) => ({
        userId: id,
        ...user,
      })
    );

    // Emit to both participants and observers
    io.to(sessionId).to(`observe:${sessionId}`).emit("participants-update", {
      sessionId,
      participants: participantsList,
      count: sessionUsers.size,
    });

    console.log(
      `User ${username} joined session ${sessionId}. Total participants: ${sessionUsers.size}`
    );
  });

  // Handle session observation
  socket.on("observe-session", ({ sessionId, observerRoom }) => {
    // Leave any previous observation rooms
    if (socket.observing) {
      socket.leave(`observe:${socket.observing}`);

      const observers = sessionObservers.get(socket.observing) || new Set();
      observers.delete(socket.id);

      if (observers.size === 0) {
        sessionObservers.delete(socket.observing);
      } else {
        sessionObservers.set(socket.observing, observers);
      }
    }

    // Join new observation room
    socket.join(`observe:${sessionId}`);
    socket.observing = sessionId;

    // Track observer
    const observers = sessionObservers.get(sessionId) || new Set();
    observers.add(socket.id);
    sessionObservers.set(sessionId, observers);

    // Send initial participant count
    const sessionUsers = activeSessions.get(sessionId);
    socket.emit("participants-update", {
      sessionId,
      count: sessionUsers ? sessionUsers.size : 0,
    });

    console.log(`Observer ${socket.id} watching session ${sessionId}`);
  });

  // Handle observer leaving
  socket.on("leave-observer", ({ sessionId, observerRoom }) => {
    socket.leave(`observe:${sessionId}`);

    const observers = sessionObservers.get(sessionId);
    if (observers) {
      observers.delete(socket.id);
      if (observers.size === 0) {
        sessionObservers.delete(sessionId);
      }
    }

    socket.observing = null;
    console.log(`Observer ${socket.id} stopped watching session ${sessionId}`);
  });

  // Handle request for initial code
  socket.on("request-code", ({ sessionId }) => {
    const sessionState = sessionStates.get(sessionId);
    if (sessionState) {
      socket.emit("session-code", {
        content: sessionState.content,
        language: sessionState.language,
      });
    }
  });

  // Optimize code change handling
  socket.on("code-change", ({ sessionId, content, userId }) => {
    // Update session state
    if (sessionStates.has(sessionId)) {
      const currentState = sessionStates.get(sessionId);
      if (currentState.content !== content) {
        sessionStates.set(sessionId, {
          ...currentState,
          content,
          lastEditBy: userId,
          lastEditAt: Date.now(),
        });

        // Broadcast to others in the session
        socket.to(sessionId).emit("code-update", {
          content,
          senderId: userId,
        });
      }
    } else {
      sessionStates.set(sessionId, {
        content,
        lastEditBy: userId,
        lastEditAt: Date.now(),
      });
    }
  });

  // Handle language changes
  socket.on("language-change", ({ sessionId, newLanguage, userId }) => {
    // Update session state
    sessionStates.set(sessionId, {
      ...sessionStates.get(sessionId),
      language: newLanguage,
    });

    // Broadcast to all clients in the session
    socket.to(sessionId).emit("language-change", {
      newLanguage,
      userId,
    });
  });

  // Handle typing indicators
  socket.on("typing-start", ({ sessionId, userId }) => {
    socket.to(sessionId).emit("user-typing", { userId });
  });

  socket.on("typing-end", ({ sessionId, userId }) => {
    socket.to(sessionId).emit("user-stopped-typing", { userId });
  });

  socket.on("disconnect", () => {
    // Clean up observer tracking
    if (socket.observing) {
      const observers = sessionObservers.get(socket.observing);
      if (observers) {
        observers.delete(socket.id);
        if (observers.size === 0) {
          sessionObservers.delete(socket.observing);
        }
      }
    }

    console.log("User disconnected:", socket.id);
    connectedSessions.delete(socket.id);

    // Update for each session this socket was in
    activeSessions.forEach((users, sessionId) => {
      let userRemoved = false;
      users.forEach((user, userId) => {
        if (user.socketId === socket.id) {
          // Only remove if this was the user's last connection
          const hasOtherConnections = Array.from(users.values()).some(
            (u) => u.clientId === user.clientId && u.socketId !== socket.id
          );

          if (!hasOtherConnections) {
            users.delete(userId);
            userRemoved = true;
          }
        }
      });

      // Only emit update if a user was actually removed
      if (userRemoved) {
        const participantsList = Array.from(users.entries()).map(
          ([id, user]) => ({
            userId: id,
            ...user,
          })
        );

        io.to(sessionId)
          .to(`observe:${sessionId}`)
          .emit("participants-update", {
            participants: participantsList,
            count: users.size,
          });

        console.log(
          `User left session ${sessionId}. Remaining participants: ${users.size}`
        );
      }
    });

    // Clean up empty sessions
    activeSessions.forEach((users, sessionId) => {
      if (users.size === 0) {
        activeSessions.delete(sessionId);
        sessionStates.delete(sessionId);
      }
    });
  });

  // Handle video chat participants
  socket.on("join-video", ({ sessionId, userId, peerId }) => {
    console.log(
      `User ${userId} joined video chat in session ${sessionId} with peer ID ${peerId}`
    );

    // Join the video room
    socket.join(`video-${sessionId}`);

    // Notify others in the session about the new participant
    socket.to(`video-${sessionId}`).emit("user-joined", {
      userId,
      peerId,
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User ${userId} left video chat`);
      io.to(`video-${sessionId}`).emit("user-left", {
        userId,
        peerId,
      });
    });
  });
});

// PeerJS server events
peerServer.on("connection", (client) => {
  console.log("PeerJS client connected:", client.getId());
});

peerServer.on("disconnect", (client) => {
  console.log("PeerJS client disconnected:", client.getId());
});

// Error handling
peerServer.on("error", (error) => {
  console.error("PeerJS server error:", error);
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`PeerJS server running on port 9000`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down servers...");

  httpServer.close(() => {
    console.log("Express server closed");
  });

  peerServer.close(() => {
    console.log("PeerJS server closed");
  });

  process.exit(0);
});

// Add this near the top of your server.js
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});
