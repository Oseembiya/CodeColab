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
  max: 300, // Increased from 100 to 300 requests per windowMs to prevent rate limiting issues with friend-related operations
  standardHeaders: true,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// More permissive rate limiter for search operations
const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  standardHeaders: true,
  message: "Too many search requests, please try again after a minute",
  keyGenerator: (req) => req.ip + "_search", // Separate limit for search operations
});

// Apply rate limiting to all requests
router.use(apiLimiter);

// Public routes - no auth needed
router.use("/health", healthRouter);

// Public routes - optional auth
router.use("/image-proxy", optionalAuth, imageProxyRouter);

// Protected routes - require authentication
router.use("/friends", verifyAuthToken, friendsRouter);

// Add the search-specific rate limiter to the friends/search endpoint
router.use("/friends/search", searchLimiter);

module.exports = router;
