const { createServer } = require("http");
const { Server } = require("socket.io");
const configureApp = require("./config/app");
const configurePeerServer = require("./config/peer");
const apiRoutes = require("./routes/api");
const initializeSocketHandlers = require("./socket");

// Create Express app
const app = configureApp();

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
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

// Initialize PeerJS server
const peerServer = configurePeerServer();

// Register API routes
app.use("/api", apiRoutes);

// Register error handlers after all routes
app.registerErrorHandlers();

// Initialize socket handlers
initializeSocketHandlers(io);

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`PeerJS server running on port ${process.env.PEER_PORT || 9000}`);
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
