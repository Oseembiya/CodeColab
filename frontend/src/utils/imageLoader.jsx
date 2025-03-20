const loadedImages = new Set();
const LOCAL_STORAGE_PREFIX = "codecolab_img_cache_";
const CACHE_VERSION = 1;

// Queue for pending image loads with delayed execution
const imageLoadQueue = [];
let isProcessingQueue = false;
const DELAY_BETWEEN_LOADS = 300; // Increased delay between image loads
const MAX_RETRY_ATTEMPTS = 3;

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
        console.log(
          `Retrying image (${retryCount}/${MAX_RETRY_ATTEMPTS}) after ${backoffDelay}ms: ${nextImage.src}`
        );

        setTimeout(() => {
          imageLoadQueue.unshift({
            ...nextImage,
            retryCount,
            // Use proxy for retry if it's a Google image
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

const shouldUseProxy = (url) => {
  if (import.meta.env.DEV) return false;

  if (!url) return false;

  return url.includes("googleusercontent.com") || url.includes("ggpht.com");
};

const getProxyUrl = (url) => {
  const encodedUrl = encodeURIComponent(url);
  return `/api/image-proxy?url=${encodedUrl}`;
};

export const preloadImage = (src, onLoad, onError) => {
  if (!src || src.includes("default-avatar.png")) {
    return; // Don't queue default images or empty URLs
  }

  // Use proxy for Google images
  const finalSrc = shouldUseProxy(src) ? getProxyUrl(src) : src;

  // Add to queue
  imageLoadQueue.push({ src: finalSrc, originalSrc: src, onLoad, onError });

  // Start processing queue if not already running
  if (!isProcessingQueue) {
    processQueue();
  }
};

export const getImageUrl = (url, timestamp) => {
  if (!url) return "/default-avatar.png";

  return url;
};

export default {
  preloadImage,
  getImageUrl,
};
