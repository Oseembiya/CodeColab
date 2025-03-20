const express = require("express");
const cors = require("cors");
require("dotenv").config();

/**
 * Express application configuration
 */
const configureApp = () => {
  const app = express();

  // Configure middleware
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    })
  );

  app.use(express.json());

  // Basic health check route
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return app;
};

module.exports = configureApp;
