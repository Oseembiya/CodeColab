import React, { useState, useEffect, useRef, memo } from "react";
import PropTypes from "prop-types";

/**
 * OptimizedImage - A component for optimized, lazy-loaded images
 *
 * Features:
 * - Lazy loading (only loads when in or near viewport)
 * - Loading state management
 * - Error handling with fallback
 * - Blur-up effect for a smoother experience
 */
const OptimizedImage = memo(
  ({
    src,
    alt,
    className = "",
    width,
    height,
    loadingClassName = "image-loading",
    errorClassName = "image-error",
    placeholderSrc = "",
    fallbackSrc = "",
    onLoad = () => {},
    onError = () => {},
    style = {},
    ...props
  }) => {
    const [status, setStatus] = useState("loading");
    const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
    const imageRef = useRef(null);
    const observerRef = useRef(null);

    // Function to handle image load
    const handleLoad = () => {
      setStatus("loaded");
      onLoad();
    };

    // Function to handle image error
    const handleError = () => {
      if (fallbackSrc && src !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      } else {
        setStatus("error");
        onError();
      }
    };

    // Set up intersection observer for lazy loading
    useEffect(() => {
      if (!imageRef.current) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting) {
            // When the image is visible, load the real image
            if (status === "loading" && placeholderSrc) {
              setCurrentSrc(src);
            }
            // Disconnect after load to save resources
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        },
        {
          root: null, // viewport
          rootMargin: "200px 0px", // start loading 200px before visible
          threshold: 0.01, // trigger when 1% visible
        }
      );

      observerRef.current.observe(imageRef.current);

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, [src, status, placeholderSrc]);

    // Combine classes based on loading state
    const imageClasses = [
      className,
      status === "loading" ? loadingClassName : "",
      status === "error" ? errorClassName : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Inline styles for blur-up effect
    const computedStyle = {
      ...style,
      ...(status === "loading" && placeholderSrc
        ? { filter: "blur(10px)", transition: "filter 0.3s ease-out" }
        : {}),
      ...(status === "loaded"
        ? { filter: "blur(0)", transition: "filter 0.3s ease-out" }
        : {}),
    };

    return (
      <img
        ref={imageRef}
        src={currentSrc}
        alt={alt}
        className={imageClasses}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        style={computedStyle}
        {...props}
      />
    );
  }
);

OptimizedImage.displayName = "OptimizedImage";

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  loadingClassName: PropTypes.string,
  errorClassName: PropTypes.string,
  placeholderSrc: PropTypes.string,
  fallbackSrc: PropTypes.string,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
  style: PropTypes.object,
};

export default OptimizedImage;
