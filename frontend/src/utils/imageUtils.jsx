/**
 * Centralized image utility for handling image loading, caching, and proxying
 */

// Check environment
const isProduction = import.meta.env.MODE === "production";

// Constants
const LOCAL_STORAGE_PREFIX = "codecolab_img_cache_";
const CACHE_VERSION = 1;
const DELAY_BETWEEN_LOADS = 300; // ms delay between image loads
const MAX_RETRY_ATTEMPTS = 3;

// Default avatar as data URL to avoid 404 errors
const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cpath fill='%23c6c6c6' d='M0 0h128v128H0z'/%3E%3Ccircle fill='%23fff' cx='64' cy='48' r='28'/%3E%3Cpath fill='%23fff' d='M64 95c19.883 0 36-8.075 36-18.031V89c0 18-16.117 33-36 33S28 107 28 89V76.969C28 86.925 44.117 95 64 95z'/%3E%3C/svg%3E";

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
  // Always use proxy for rate-limited domains, even in development
  if (!url) return false;

  // For Google images in production, we should NOT use proxy due to CSP restrictions
  if (
    isProduction &&
    (url.includes("googleusercontent.com") || url.includes("ggpht.com"))
  ) {
    return false; // Don't use proxy for Google images in production due to CSP
  }

  // Check if it's a domain that might rate limit
  return (
    (url.includes("googleusercontent.com") && !isProduction) ||
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
  // If it's a Google user image, try to handle it directly to avoid CSP issues
  if (url.includes("googleusercontent.com")) {
    try {
      // Attempt to extract and format the URL in a way that complies with the CSP
      const encodedUrl = url.split("=")[0]; // Strip any sizing parameters
      if (encodedUrl) {
        // Return the direct Google URL with appropriate size parameter
        return `${encodedUrl}=s96-c`;
      }
    } catch (e) {
      console.warn("Error parsing Google image URL, falling back to proxy", e);
    }
  }

  // For other images, use the proxy
  const encodedUrl = encodeURIComponent(url);
  const apiUrl = import.meta.env.VITE_API_URL || "";

  // Use full API URL in production, relative URL in development
  if (isProduction) {
    // Strip '/api' from the end if it exists to avoid double paths
    const baseUrl = apiUrl.endsWith("/api")
      ? apiUrl.substring(0, apiUrl.length - 4)
      : apiUrl;

    return `${baseUrl}/api/image-proxy?url=${encodedUrl}`;
  } else {
    return `/api/image-proxy?url=${encodedUrl}`;
  }
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
  if (!url) return DEFAULT_AVATAR_SVG;

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
  // Don't queue default images, SVGs, or empty URLs
  if (!src || src === DEFAULT_AVATAR_SVG || src.startsWith("data:")) {
    return;
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
  if (!url) return DEFAULT_AVATAR_SVG;

  // For Google profile photos, ensure correct size
  if (url.includes("googleusercontent.com") || url.includes("ggpht.com")) {
    try {
      // Handle different Google URL formats

      // First try to get the base URL without parameters
      const baseUrl = url.split("?")[0].split("=")[0];

      // If we have a base URL, use it with proper sizing
      if (baseUrl) {
        return `${baseUrl}=s${size}-c`;
      }

      // Fallback to older methods
      // Format 1: URLs with size parameter (=s...)
      const sizeMatch = url.match(/=s(\d+)(?:-c)?/);
      if (sizeMatch) {
        return url.replace(/=s\d+(-c)?/, `=s${size}-c`);
      }

      // Format 2: URLs without size parameter
      if (url.includes("?")) {
        return `${url}&s=${size}-c`;
      } else {
        return `${url}=s${size}-c`;
      }
    } catch (e) {
      console.warn("Error formatting Google avatar URL:", e);
      return url; // Return original as fallback
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
