const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

// Import authentication middleware
const { verifyAuthToken, optionalAuth } = require("../middleware/auth");

// Import specific route handlers
const imageProxyRouter = require("./imageProxy");
const friendsRouter = require("./friends");
const healthRouter = require("./health");

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiting to all requests
router.use(apiLimiter);

// Public routes - no auth needed
router.use("/health", healthRouter);

// Public routes - optional auth
router.use("/image-proxy", optionalAuth, imageProxyRouter);

// Protected routes - require authentication
router.use("/friends", verifyAuthToken, friendsRouter);

module.exports = router;
