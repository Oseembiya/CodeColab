import { useEffect, useState } from "react";
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
  const imageUrl = getImageUrl(photoURL, timestamp);

  useEffect(() => {
    if (photoURL && preload && !isLoaded) {
      preloadImage(
        photoURL,
        () => setIsLoaded(true),
        () => console.warn(`Failed to preload image: ${photoURL}`)
      );
    }
  }, [photoURL, preload, isLoaded]);

  return imageUrl;
};

export default useAvatarLoader;
