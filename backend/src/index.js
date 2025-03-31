const { createServer } = require("http");
const { Server } = require("socket.io");
const configureApp = require("./config/app");
const configurePeerServer = require("./config/peer");
const apiRoutes = require("./routes/api");
const socketModule = require("./socket");
const logger = require("./utils/logger");

// Setting NODE_ENV to production
process.env.NODE_ENV = "production";

// Create Express app
const app = configureApp();

// Create HTTP server
const httpServer = createServer(app);

// Socket.io config for production
const socketConfig = {
  cors: {
    origin: process.env.FRONTEND_URL || "https://codecolab.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  allowEIO3: true,
  transports: ["websocket", "polling"],
  pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || "60000"),
  pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || "25000"),
  maxHttpBufferSize: 1e6, // 1 MB
  connectTimeout: 45000,
  compression: true,
};

// Initialize Socket.IO
const io = new Server(httpServer, socketConfig);

// Initialize PeerJS server
const peerServer = configurePeerServer();

// Register API routes
app.use("/api", apiRoutes);

// Add root route handler
app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "CodeColab API Server",
    docs: "/api/docs",
    health: "/health",
  });
});

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
      process.env.FRONTEND_URL || "https://codecolab.vercel.app"
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

// Add a PeerJS diagnostics endpoint
app.get("/peer-status", (req, res) => {
  const wsCount = peerServer?._clients?.size || 0;
  const wsClients = peerServer?._clients
    ? Array.from(peerServer._clients.keys())
    : [];

  const info = {
    status: peerServer ? "UP" : "DOWN",
    port: process.env.PEER_PORT || 9000,
    path: "/peerjs",
    ssl: true,
    connections: wsCount,
    connectionIds: wsClients,
    environment: process.env.NODE_ENV,
    time: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // Log the diagnosis for server-side reference
  logger.info("PeerJS server status:", info);

  res.status(200).json(info);
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
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", { reason, promise });
});
