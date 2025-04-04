/**
 * Judge0 API proxy routes
 * This file handles proxying requests to the Judge0 API through RapidAPI
 */
const express = require("express");
const axios = require("axios");
const router = express.Router();
const logger = require("../utils/logger");

// Judge0 API configuration
const JUDGE0_API_HOST = process.env.RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.RAPIDAPI_KEY;

if (!JUDGE0_API_KEY) {
  logger.warn(
    "RAPIDAPI_KEY is not defined. Judge0 API proxy will not work properly."
  );
}

// Helper function to forward requests to Judge0 API
const forwardToJudge0 = async (req, res) => {
  const path = req.params[0] || "";
  const method = req.method;
  const headers = {
    "X-RapidAPI-Host": JUDGE0_API_HOST,
    "X-RapidAPI-Key": JUDGE0_API_KEY,
    "Content-Type": "application/json",
  };

  // Build the target URL
  const url = `https://${JUDGE0_API_HOST}/${path}${
    Object.keys(req.query).length > 0
      ? `?${new URLSearchParams(req.query).toString()}`
      : ""
  }`;

  try {
    logger.info(`Judge0 Proxy: ${method} ${url}`);

    // Forward the request to Judge0 API
    const response = await axios({
      method,
      url,
      headers,
      data: method !== "GET" ? req.body : undefined,
      validateStatus: () => true, // Don't throw on error status codes
    });

    // Forward the response back to the client
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error("Judge0 Proxy Error:", error);

    // Handle axios errors
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      res.status(503).json({
        error: "Judge0 API service unavailable",
        message: "No response received from Judge0 API",
      });
    } else {
      // Something happened in setting up the request
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  }
};

// Handle all HTTP methods for Judge0 API
router.get("/*", forwardToJudge0);
router.post("/*", forwardToJudge0);

module.exports = router;
