const express = require("express");
const axios = require("axios");
const NodeCache = require("node-cache");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Initialize image cache with 24hr TTL
const imageCache = new NodeCache({ stdTTL: 86400 });

// Image proxy rate limiter
const imageProxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  message: "Too many requests, please try again later",
});

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
      res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      return res.send(cachedImage.data);
    }

    // Fetch the image
    const response = await axios({
      method: "get",
      url,
      responseType: "arraybuffer",
      timeout: 5000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
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
    res.set("Cache-Control", "public, max-age=86400");
    return res.send(response.data);
  } catch (error) {
    console.error("Image proxy error:", error.message);

    // Send a 302 redirect to a default avatar
    res.redirect("/default-avatar.png");
  }
});

module.exports = router;
