import { useState, useEffect } from "react";

/**
 * Custom hook for optimized image loading with various enhancements
 *
 * Features:
 * - Automatically handles loading state
 * - Dynamically computes image dimensions
 * - Provides placeholder for images while loading
 * - Handles errors with fallback images
 * - Supports different image quality based on network conditions
 *
 * @param {string} src - Original image source URL
 * @param {Object} options - Configuration options
 * @returns {Object} Image loading state and optimized props
 */
const useOptimizedImage = (src, options = {}) => {
  const {
    fallbackSrc = "/assets/placeholder.jpg",
    lowQualitySrc = "",
    sizes = "",
    preload = false,
    detectNetworkSpeed = true,
    lowQualityThreshold = 1.5, // Mbps
  } = options;

  const [status, setStatus] = useState("idle");
  const [finalSrc, setFinalSrc] = useState(lowQualitySrc || src);
  const [dimensions, setDimensions] = useState({
    width: undefined,
    height: undefined,
  });
  const [connection, setConnection] = useState({
    downlink: undefined,
    effectiveType: undefined,
    useLowQuality: false,
  });

  // Check network conditions if supported
  useEffect(() => {
    if (!detectNetworkSpeed || !navigator.connection || !lowQualitySrc) return;

    const updateNetworkInfo = () => {
      const { downlink, effectiveType } = navigator.connection;
      const useLowQuality =
        downlink < lowQualityThreshold ||
        ["slow-2g", "2g", "3g"].includes(effectiveType);

      setConnection({ downlink, effectiveType, useLowQuality });

      // If on slow connection and we have low quality version, use it
      if (useLowQuality && lowQualitySrc) {
        setFinalSrc(lowQualitySrc);
      } else {
        setFinalSrc(src);
      }
    };

    updateNetworkInfo();

    // Listen for connection changes
    navigator.connection.addEventListener("change", updateNetworkInfo);
    return () => {
      navigator.connection.removeEventListener("change", updateNetworkInfo);
    };
  }, [src, lowQualitySrc, detectNetworkSpeed, lowQualityThreshold]);

  // Preload image if required
  useEffect(() => {
    if (!preload || !finalSrc) return;

    setStatus("loading");
    const img = new Image();

    img.onload = () => {
      setStatus("loaded");
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      setStatus("error");
      setFinalSrc(fallbackSrc);
    };

    img.src = finalSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [finalSrc, preload, fallbackSrc]);

  // Handle image load/error events
  const handleLoad = (e) => {
    setStatus("loaded");
    if (e.target) {
      setDimensions({
        width: e.target.naturalWidth,
        height: e.target.naturalHeight,
      });
    }
  };

  const handleError = () => {
    setStatus("error");
    setFinalSrc(fallbackSrc);
  };

  // Return image props and state
  return {
    status,
    isLoading: status === "loading",
    isLoaded: status === "loaded",
    isError: status === "error",
    dimensions,
    connection,
    imageProps: {
      src: finalSrc,
      onLoad: handleLoad,
      onError: handleError,
      sizes,
    },
  };
};

export default useOptimizedImage;
