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
    origin: process.env.FRONTEND_URL || "https://codekolab.netlify.app",
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
  path: "/socket.io/",
  perMessageDeflate: {
    threshold: 32768,
  },
  // Handle being behind Render proxy
  allowUpgrades: true,
  serveClient: false,
  cookie: false,
};

// Initialize Socket.IO
const io = new Server(httpServer, socketConfig);

// Initialize PeerJS server and mount it to Express app
const peerServer = configurePeerServer(httpServer);
app.use("/peerjs", peerServer);

// Register API routes
app.use("/api", apiRoutes);

// Add special route to handle PeerJS token generation if coming through a proxy
app.get("/peerjs/peerjs/id", (req, res) => {
  // This helps PeerJS when it's behind a proxy
  res.setHeader("Content-Type", "text/plain");
  const id = `${Math.random().toString(36).substr(2, 10)}`;
  res.send(id);
});

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

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);

  // Log server information
  const serverInfo = {
    port: PORT,
    mode: process.env.NODE_ENV,
    startTime: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
  };
  logger.info("Server initialization complete", serverInfo);
});

// Handle server shutdown (graceful exit)
const handleExit = () => {
  console.log("Shutting down server...");
  logger.info("Server shutdown initiated");

  // Close the Socket.IO server
  io.close(() => {
    logger.info("Socket.IO server closed");
  });

  // Close the PeerJS server
  if (peerServer) {
    peerServer.close(() => {
      logger.info("PeerJS server closed");
    });
  }

  // Close the HTTP server
  httpServer.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    logger.error("Forced server shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);

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
    path: process.env.PEER_PATH || "/peerjs",
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

// Handle uncaught exceptions to prevent server crash
process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", { reason, promise });
});
