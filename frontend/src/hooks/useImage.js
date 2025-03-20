import { useState, useEffect, useRef } from "react";
import {
  preloadImage,
  getImageUrl,
  isImageLoaded,
  getAvatarUrl,
} from "../utils/imageUtils";

/**
 * Hook for handling image loading with advanced features
 * @param {string} url - Image URL
 * @param {Object} options - Configuration options
 * @returns {Object} Image status and URL
 */
export const useImage = (url, options = {}) => {
  const {
    preload = true,
    timestamp = null,
    size = null,
    isAvatar = false,
    fallbackUrl = "/default-avatar.png",
  } = options;

  const [status, setStatus] = useState(
    isImageLoaded(url) ? "loaded" : "loading"
  );
  const [error, setError] = useState(null);
  const urlRef = useRef(null);

  // Calculate the appropriate URL based on options
  if (
    !urlRef.current ||
    urlRef.current.original !== url ||
    urlRef.current.timestamp !== timestamp ||
    urlRef.current.size !== size
  ) {
    urlRef.current = {
      original: url,
      timestamp,
      size,
      // Get appropriate URL based on image type
      url: !url
        ? fallbackUrl
        : isAvatar
        ? getAvatarUrl(url, size)
        : getImageUrl(url, timestamp),
    };
  }

  useEffect(() => {
    let isMounted = true;

    if (!url) {
      setStatus("loaded");
      return;
    }

    if (isImageLoaded(url)) {
      setStatus("loaded");
      return;
    }

    if (preload) {
      setStatus("loading");

      preloadImage(
        url,
        () => {
          if (isMounted) setStatus("loaded");
        },
        (error) => {
          if (isMounted) {
            setError(error);
            setStatus("error");
            console.warn(`Failed to load image: ${url}`, error);
          }
        }
      );
    }

    return () => {
      isMounted = false;
    };
  }, [url, preload]);

  return {
    url: urlRef.current.url,
    status,
    isLoading: status === "loading",
    isLoaded: status === "loaded",
    isError: status === "error",
    error,
  };
};

/**
 * Hook specifically for avatar images
 * @param {string} photoURL - Avatar URL
 * @param {Object} options - Configuration options
 * @returns {Object} Avatar status and URL
 */
export const useAvatar = (photoURL, options = {}) => {
  const { size = 96, ...restOptions } = options;

  return useImage(photoURL, {
    ...restOptions,
    size,
    isAvatar: true,
    fallbackUrl: "/default-avatar.png",
  });
};

export default useImage;
