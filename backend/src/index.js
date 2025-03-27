const { createServer } = require("http");
const { Server } = require("socket.io");
const configureApp = require("./config/app");
const configurePeerServer = require("./config/peer");
const apiRoutes = require("./routes/api");
const socketModule = require("./socket");
const logger = require("./utils/logger");

// Create Express app
const app = configureApp();

// Create HTTP server
const httpServer = createServer(app);

// Get socket.io config from environment variables
const socketConfig = {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  allowEIO3: true, // Allow Engine.IO version 3
  transports: ["websocket", "polling"], // Allow both WebSocket and polling
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || "60000"),
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || "25000"),
  maxHttpBufferSize: 1e6, // 1 MB
  connectTimeout: 45000, // 45 seconds connection timeout
  compression: true,
};

// Initialize Socket.IO
const io = new Server(httpServer, socketConfig);

// Initialize PeerJS server
const peerServer = configurePeerServer();

// Register API routes
app.use("/api", apiRoutes);

// Register error handlers after all routes
app.registerErrorHandlers();

// Initialize socket handlers
socketModule.initializeSocketHandlers(io);

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`PeerJS server running on port ${process.env.PEER_PORT || 9000}`);
  logger.info(
    `CORS configured for: ${
      process.env.FRONTEND_URL || "http://localhost:5173"
    }`
  );
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    server: "Express",
    socketConnections: io.engine.clientsCount,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down servers...");

  httpServer.close(() => {
    logger.info("Express server closed");
  });

  peerServer.close(() => {
    logger.info("PeerJS server closed");
  });

  process.exit(0);
});

// Handle uncaught exceptions to prevent server crash
process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
  // Keep the server running
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", { reason, promise });
  // Keep the server running
});
