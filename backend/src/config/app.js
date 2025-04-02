const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { errorHandler, notFoundHandler } = require("../middleware/errorHandler");
require("dotenv").config();

/**
 * Express application configuration for production
 */
const configureApp = () => {
  const app = express();

  // Add trust proxy setting for render.com deployment
  app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

  // Security middleware with customized Content-Security-Policy
  app.use(
    helmet({
      crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: [
            "'self'",
            "https://*.google.com",
            "https://*.googleapis.com",
            "https://*.firebaseio.com",
            "wss://*.firebaseio.com",
            "https://*.firebase.com",
            "https://*.rapidapi.com",
            "https://judge0-ce.p.rapidapi.com",
            process.env.FRONTEND_URL || "https://codecolab.vercel.app",
            process.env.BACKEND_URL || "https://codecolab-852p.onrender.com",
            "https://*.firebasestorage.app",
            "wss://codecolab-852p.onrender.com",
            "ws://codecolab-852p.onrender.com",
            "ws://localhost:9000",
            "wss://localhost:9000",
          ],
          frameSrc: [
            "'self'",
            "https://*.google.com",
            "https://*.firebaseapp.com",
          ],
          imgSrc: ["'self'", "https://*.google.com", "data:", "blob:"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://*.google.com",
            "https://*.googleapis.com",
            "https://*.gstatic.com",
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://*.googleapis.com"],
        },
      },
    })
  );

  // Configure CORS
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "https://codecolab.vercel.app",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Allow-Headers",
      ],
      exposedHeaders: [
        "Content-Type",
        "Authorization",
        "Content-Length",
        "X-Requested-With",
      ],
      maxAge: 86400,
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
