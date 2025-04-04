// Server entry point
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

// Import route modules
const usersRoutes = require("./routes/users");
const sessionsRoutes = require("./routes/sessions");
const codeExecutionRoutes = require("./routes/codeExecution");

// Import socket handlers
const { setupSocketHandlers } = require("./socket/handlers");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Set up socket handlers
setupSocketHandlers(io);

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "CodeColab API is running",
  });
});

// Register route modules
app.use("/api/users", usersRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/code", codeExecutionRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server shutdown
process.on("SIGINT", () => {
  console.log("Server shutting down");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
