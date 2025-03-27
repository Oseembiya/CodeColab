const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { errorHandler, notFoundHandler } = require("../middleware/errorHandler");
require("dotenv").config();

/**
 * Express application configuration
 */
const configureApp = () => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // Configure CORS
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Basic health check route
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Error handlers should be registered after routes
  // These will be applied in the index.js file after routes are defined
  app.registerErrorHandlers = () => {
    // 404 handler for undefined routes
    app.use(notFoundHandler);

    // Global error handler
    app.use(errorHandler);
  };

  return app;
};

module.exports = configureApp;
