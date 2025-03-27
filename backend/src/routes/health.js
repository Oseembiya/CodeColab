/**
 * Health check routes
 */
const express = require("express");
const router = express.Router();
const { admin, db } = require("../../firebaseConfig");
const os = require("os");

/**
 * Basic health check endpoint
 * GET /health
 */
router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "codecolab-backend",
  });
});

/**
 * Detailed health check endpoint
 * GET /health/detailed
 */
router.get("/detailed", async (req, res) => {
  try {
    const healthInfo = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "codecolab-backend",
      uptime: process.uptime(),
      system: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usage: process.memoryUsage(),
        },
        cpus: os.cpus().length,
        loadAvg: os.loadavg(),
      },
      dependencies: {},
    };

    // Check Firebase connection
    try {
      await admin.firestore().collection("health").doc("ping").set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      healthInfo.dependencies.firebase = { status: "ok" };
    } catch (error) {
      healthInfo.dependencies.firebase = {
        status: "error",
        message: error.message,
      };
      healthInfo.status = "degraded";
    }

    res.status(healthInfo.status === "ok" ? 200 : 503).json(healthInfo);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Failed to perform health check",
      error: error.message,
    });
  }
});

module.exports = router;
