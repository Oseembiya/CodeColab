/**
 * Utility for handling image loading with rate limiting protection
 */

// Cache for storing loaded image URLs
const loadedImages = new Set();

// Queue for pending image loads with delayed execution
const imageLoadQueue = [];
let isProcessingQueue = false;
const DELAY_BETWEEN_LOADS = 100; // ms delay between image loads

/**
 * Process the image load queue with a delay between each load
 */
const processQueue = () => {
  if (imageLoadQueue.length === 0) {
    isProcessingQueue = false;
    return;
  }

  isProcessingQueue = true;
  const nextImage = imageLoadQueue.shift();

  // Process the next image
  if (nextImage && nextImage.src && !loadedImages.has(nextImage.src)) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      loadedImages.add(nextImage.src);
      if (nextImage.onLoad) nextImage.onLoad(nextImage.src);

      // Process next item with delay
      setTimeout(processQueue, DELAY_BETWEEN_LOADS);
    };

    img.onerror = (err) => {
      if (nextImage.onError) nextImage.onError(err);
      // Continue processing even if there's an error
      setTimeout(processQueue, DELAY_BETWEEN_LOADS);
    };

    img.src = nextImage.src;
  } else {
    // Skip this image (already loaded) and process next
    setTimeout(processQueue, DELAY_BETWEEN_LOADS);
  }
};

/**
 * Preload an image with rate limiting
 * @param {string} src - Image source URL
 * @param {Function} onLoad - Callback on successful load
 * @param {Function} onError - Callback on load error
 */
export const preloadImage = (src, onLoad, onError) => {
  if (!src || src.includes("default-avatar.png")) {
    return; // Don't queue default images or empty URLs
  }

  // Add to queue
  imageLoadQueue.push({ src, onLoad, onError });

  // Start processing queue if not already running
  if (!isProcessingQueue) {
    processQueue();
  }
};

/**
 * Get an image URL with cache busting if needed
 * @param {string} url - Original image URL
 * @param {string|number} timestamp - Optional timestamp for cache busting
 * @returns {string} - Formatted URL
 */
export const getImageUrl = (url, timestamp) => {
  if (!url) return "/default-avatar.png";

  // Only add timestamp if provided
  return timestamp ? `${url}?t=${timestamp}` : url;
};

export default {
  preloadImage,
  getImageUrl,
};
