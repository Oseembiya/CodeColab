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

// Add explicit CORS handling for Socket.io polling
app.use("/socket.io", (req, res, next) => {
  // Debug Socket.io requests
  console.log("Socket.io request:", {
    method: req.method,
    url: req.url,
    query: req.query,
    headers: {
      origin: req.headers.origin,
      referer: req.headers.referer,
      "user-agent": req.headers["user-agent"],
      cookie: req.headers.cookie ? "[REDACTED]" : undefined,
    },
  });

  // More permissive CORS for development
  const isDevelopmentMode = process.env.NODE_ENV !== "production";
  const allowedOrigins = isDevelopmentMode
    ? [
        "https://codekolab.netlify.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://localhost:5173",
      ]
    : ["https://codekolab.netlify.app"];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (isDevelopmentMode) {
    // In development, be more permissive
    console.log(`Allowing unknown origin in development: ${origin}`);
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    // In production, restrict to known origins
    res.header("Access-Control-Allow-Origin", "https://codekolab.netlify.app");
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

// Add explicit WebSocket handling for Socket.io
app.use((req, res, next) => {
  if (
    req.headers.upgrade &&
    req.headers.upgrade.toLowerCase() === "websocket"
  ) {
    res.setHeader("Connection", "Upgrade");
    res.setHeader("Upgrade", "websocket");
  }
  return next();
});

// Socket.io config for production
const isDevelopmentMode = process.env.NODE_ENV !== "production";
const socketConfig = {
  cors: {
    origin: isDevelopmentMode
      ? [
          "https://codekolab.netlify.app",
          "http://localhost:5173",
          "http://localhost:3000",
          "https://localhost:5173",
        ]
      : "https://codekolab.netlify.app",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["polling", "websocket"],
  pingTimeout: 60000,
  pingInterval: 25000,
  path: "/socket.io/",
  // Reduce complexity
  allowEIO3: true,
  connectTimeout: 45000,
};

// Log Socket.io configuration
console.log("Socket.io configuration:", {
  transports: socketConfig.transports,
  cors: socketConfig.cors,
  path: socketConfig.path,
});

// Initialize Socket.IO
const io = new Server(httpServer, socketConfig);

// Initialize PeerJS server
console.log("Creating PeerJS server instance...");
const peerServer = configurePeerServer(httpServer);

// Mount PeerJS to Express app at /peerjs path
console.log("Mounting PeerJS server to Express app at /peerjs...");
app.use("/peerjs", peerServer);

// Add a debug endpoint to check if PeerJS is mounted
app.get("/peerjs-debug", (req, res) => {
  res.status(200).json({
    isPeerServerMounted: !!peerServer,
    peerServerClientCount: peerServer?._clients?.size || 0,
    peerPath: "/peerjs",
    timestamp: new Date().toISOString(),
  });
});

// Debug logging to verify our Express routes
console.log("Express routes:");
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    console.log(`Route: ${JSON.stringify(middleware.route.path)}`);
  } else if (middleware.name === "router") {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log(`Nested route: ${JSON.stringify(handler.route.path)}`);
      }
    });
  }
});

// Add middleware to help with WebSocket upgrades for PeerJS
app.use("/peerjs", (req, res, next) => {
  if (
    req.headers.upgrade &&
    req.headers.upgrade.toLowerCase() === "websocket"
  ) {
    console.log("PeerJS WebSocket upgrade request detected");
    res.setHeader("Connection", "Upgrade");
    res.setHeader("Upgrade", "websocket");
  }
  return next();
});

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
  try {
    const wsCount = peerServer?._clients?.size || 0;
    const wsClients = peerServer?._clients
      ? Array.from(peerServer._clients.keys())
      : [];

    // Get detailed peer server info
    const info = {
      status: peerServer ? "UP" : "DOWN",
      serverType: peerServer ? typeof peerServer : "undefined",
      isMounted: !!peerServer,
      path: "/peerjs",
      ssl: true,
      connections: wsCount,
      connectionIds: wsClients,
      isServerUp: !!httpServer,
      socketConnections: io?.engine?.clientsCount || 0,
      expressRouteCount: app._router?.stack?.length || 0,
      environment: process.env.NODE_ENV,
      renderService: process.env.RENDER || "unknown",
      time: new Date().toISOString(),
      uptime: process.uptime(),
    };

    // Log the diagnosis for server-side reference
    logger.info("PeerJS server status:", info);
    console.log("PeerJS server status check:", info);

    res.status(200).json(info);
  } catch (error) {
    logger.error("Error in peer-status endpoint:", error);
    res.status(500).json({
      status: "ERROR",
      error: error.message,
      stack: error.stack,
    });
  }
});

// Handle uncaught exceptions to prevent server crash
process.on("uncaughtException", (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, { stack: error.stack });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection", { reason, promise });
});
