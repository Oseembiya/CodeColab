const express = require("express");
const router = express.Router();

// Import specific route handlers
const imageProxyRouter = require("./imageProxy");

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Register route handlers
router.use("/image-proxy", imageProxyRouter);

module.exports = router;
