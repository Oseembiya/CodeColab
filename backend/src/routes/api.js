const express = require("express");
const router = express.Router();

// Import specific route handlers
const imageProxyRouter = require("./imageProxy");
const friendsRouter = require("./friends");

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Register route handlers
router.use("/image-proxy", imageProxyRouter);
router.use("/friends", friendsRouter);

module.exports = router;
