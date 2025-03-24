const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Initialize image cache with 7-day TTL (increased from 24hr)
const imageCache = new NodeCache({ stdTTL: 604800 });

// Image proxy rate limiter
const imageProxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  message: "Too many requests, please try again later",
});

// Configure axios with retry logic for 429 errors
const axiosWithRetry = async (config) => {
  const MAX_RETRIES = 3;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      return await axios(config);
    } catch (error) {
      // Only retry on rate limit errors
      if (error.response && error.response.status === 429) {
        retries++;
        if (retries >= MAX_RETRIES) throw error;

        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        console.log(
          `Rate limited, retrying in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

/**
 * Image proxy endpoint
 * GET /api/image-proxy?url=https://example.com/image.jpg
 */
router.get("/", imageProxyLimiter, async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).send("URL parameter is required");
    }

    // Check if image is in cache
    const cacheKey = `img_${url}`;
    const cachedImage = imageCache.get(cacheKey);

    if (cachedImage) {
      // Set appropriate headers for cached image
      res.set("Content-Type", cachedImage.contentType);
      res.set("Cache-Control", "public, max-age=604800"); // Cache for 7 days
      return res.send(cachedImage.data);
    }

    // Fetch the image with retry logic
    const response = await axiosWithRetry({
      method: "get",
      url,
      responseType: "arraybuffer",
      timeout: 8000, // Increased timeout
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        // Add a referrer to appear more like a browser request
        Referer: "https://yourwebsite.com/",
      },
    });

    // Get content type
    const contentType = response.headers["content-type"];

    // Store in cache
    imageCache.set(cacheKey, {
      data: response.data,
      contentType,
    });

    // Set headers and send response
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=604800"); // Cache for 7 days
    res.set("Access-Control-Allow-Origin", "*"); // Allow CORS
    return res.send(response.data);
  } catch (error) {
    console.error("Image proxy error:", error.message);

    // Send a 302 redirect to a default avatar
    res.redirect("/default-avatar.png");
  }
});

module.exports = router;
