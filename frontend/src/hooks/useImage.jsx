import { useState, useEffect, useRef } from "react";
import {
  preloadImage,
  getImageUrl,
  isImageLoaded,
  getAvatarUrl,
} from "../utils/imageUtils.jsx";

// Define the default avatar SVG as a data URL to avoid 404 errors
const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cpath fill='%23c6c6c6' d='M0 0h128v128H0z'/%3E%3Ccircle fill='%23fff' cx='64' cy='48' r='28'/%3E%3Cpath fill='%23fff' d='M64 95c19.883 0 36-8.075 36-18.031V89c0 18-16.117 33-36 33S28 107 28 89V76.969C28 86.925 44.117 95 64 95z'/%3E%3C/svg%3E";

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
    fallbackUrl = DEFAULT_AVATAR_SVG,
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
    fallbackUrl: DEFAULT_AVATAR_SVG,
  });
};

export default useImage;
