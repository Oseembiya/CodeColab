/**
 * Centralized image utility for handling image loading, caching, and proxying
 */

// Constants
const LOCAL_STORAGE_PREFIX = "codecolab_img_cache_";
const CACHE_VERSION = 1;
const DELAY_BETWEEN_LOADS = 300; // ms delay between image loads
const MAX_RETRY_ATTEMPTS = 3;

// Internal state
const loadedImages = new Set();
const imageLoadQueue = [];
let isProcessingQueue = false;

// Initialize cache from localStorage
try {
  const cacheKeys = Object.keys(localStorage).filter((key) =>
    key.startsWith(LOCAL_STORAGE_PREFIX)
  );
  cacheKeys.forEach((key) => {
    const url = key.replace(LOCAL_STORAGE_PREFIX, "");
    loadedImages.add(url);
  });
} catch (e) {
  console.warn("Could not initialize image cache from localStorage", e);
}

/**
 * Determine if an image URL should use the proxy
 * @param {string} url - Image URL
 * @returns {boolean} - Whether to use proxy
 */
const shouldUseProxy = (url) => {
  // Disable proxy in development to make debugging easier
  if (import.meta.env.DEV) return false;

  if (!url) return false;

  // Check if it's a domain that might rate limit
  return (
    url.includes("googleusercontent.com") ||
    url.includes("ggpht.com") ||
    url.includes("gravatar.com")
  );
};

/**
 * Get proxy URL for an image
 * @param {string} url - Original image URL
 * @returns {string} - Proxy URL
 */
const getProxyUrl = (url) => {
  const encodedUrl = encodeURIComponent(url);
  return `/api/image-proxy?url=${encodedUrl}`;
};

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

      try {
        // Store successful loads in localStorage
        localStorage.setItem(
          `${LOCAL_STORAGE_PREFIX}${nextImage.src}`,
          JSON.stringify({
            timestamp: Date.now(),
            version: CACHE_VERSION,
          })
        );
      } catch (e) {
        // localStorage might be full or unavailable
        console.warn("Could not cache image URL", e);
      }

      if (nextImage.onLoad) nextImage.onLoad(nextImage.src);

      // Process next item with delay
      setTimeout(processQueue, DELAY_BETWEEN_LOADS);
    };

    img.onerror = (err) => {
      console.warn(`Error loading image: ${nextImage.src}`, err);

      // Check retry attempts
      if (!nextImage.retryCount || nextImage.retryCount < MAX_RETRY_ATTEMPTS) {
        // Put back in queue with increased retry count and exponential backoff
        const retryCount = (nextImage.retryCount || 0) + 1;
        const backoffDelay = DELAY_BETWEEN_LOADS * Math.pow(2, retryCount);

        setTimeout(() => {
          imageLoadQueue.unshift({
            ...nextImage,
            retryCount,
            // Use proxy for retry if it's a rate-limited image
            src: shouldUseProxy(nextImage.src)
              ? getProxyUrl(nextImage.src)
              : nextImage.src,
          });

          if (!isProcessingQueue) {
            processQueue();
          }
        }, backoffDelay);
      } else {
        if (nextImage.onError) nextImage.onError(err);
        // Continue processing queue even after final error
        setTimeout(processQueue, DELAY_BETWEEN_LOADS);
      }
    };

    img.src = nextImage.src;
  } else {
    // Skip this image (already loaded) and process next
    setTimeout(processQueue, DELAY_BETWEEN_LOADS);
  }
};

/**
 * Get appropriate image URL, using proxy if needed
 * @param {string} url - Original image URL
 * @param {string|number} timestamp - Optional timestamp for cache busting
 * @returns {string} Formatted image URL
 */
export const getImageUrl = (url, timestamp) => {
  if (!url) return "/default-avatar.png";

  // For Google/other rate-limited images, use proxy
  if (shouldUseProxy(url)) {
    return getProxyUrl(url);
  }

  // Only add timestamp if provided
  return timestamp ? `${url}?t=${timestamp}` : url;
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

  // Use proxy for rate-limited images
  const finalSrc = shouldUseProxy(src) ? getProxyUrl(src) : src;

  // Add to queue
  imageLoadQueue.push({ src: finalSrc, originalSrc: src, onLoad, onError });

  // Start processing queue if not already running
  if (!isProcessingQueue) {
    processQueue();
  }
};

/**
 * Check if an image is already cached/loaded
 * @param {string} url - Image URL
 * @returns {boolean} - Whether image is loaded
 */
export const isImageLoaded = (url) => {
  if (!url) return true;
  return loadedImages.has(url) || loadedImages.has(getProxyUrl(url));
};

/**
 * Create avatar URL with proper sizing
 * @param {string} url - Original URL
 * @param {number} size - Desired size in pixels
 * @returns {string} - Formatted avatar URL
 */
export const getAvatarUrl = (url, size = 96) => {
  if (!url) return "/default-avatar.png";

  // For Google profile photos, ensure correct size
  if (url.includes("googleusercontent.com")) {
    // Parse size from existing URL or use provided size
    const sizeMatch = url.match(/=s(\d+)(?:-c)?/);
    const currentSize = sizeMatch ? parseInt(sizeMatch[1]) : null;

    if (!currentSize || currentSize !== size) {
      // Replace or add size parameter
      return url.replace(/=s\d+(?:-c)?/, `=s${size}-c`) || `${url}=s${size}-c`;
    }
  }

  return getImageUrl(url);
};

export default {
  getImageUrl,
  preloadImage,
  isImageLoaded,
  getAvatarUrl,
};
