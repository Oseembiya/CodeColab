import { useEffect, useState, useRef } from "react";
import { preloadImage, getImageUrl } from "../utils/imageLoader.jsx";

/**
 * Custom hook for handling avatar loading with rate limiting
 *
 * @param {string} photoURL - Original photo URL
 * @param {Object} options - Additional options
 * @param {boolean} options.preload - Whether to preload the image
 * @param {string|number} options.timestamp - Optional timestamp for cache busting
 * @returns {string} Formatted image URL
 */
const useAvatarLoader = (photoURL, options = {}) => {
  const { preload = true, timestamp = null } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const imageUrlRef = useRef(null);

  // Only recalculate the URL if photoURL or timestamp changes
  if (
    !imageUrlRef.current ||
    imageUrlRef.current.original !== photoURL ||
    imageUrlRef.current.timestamp !== timestamp
  ) {
    // Use direct URL to avoid proxy issues temporarily
    imageUrlRef.current = {
      original: photoURL,
      timestamp,
      url: photoURL || "/default-avatar.png",
    };
  }

  useEffect(() => {
    let isMounted = true;

    if (photoURL && preload && !isLoaded) {
      preloadImage(
        photoURL,
        () => {
          if (isMounted) setIsLoaded(true);
        },
        (error) => {
          if (isMounted)
            console.warn(`Failed to preload image: ${photoURL}`, error);
        }
      );
    }

    return () => {
      isMounted = false;
    };
  }, [photoURL, preload, isLoaded]);

  return imageUrlRef.current.url;
};

export default useAvatarLoader;
