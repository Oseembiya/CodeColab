import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

/**
 * Enhanced loading fallback component with progress indicator and delay
 * to prevent flashing for quick loads
 */
const LoadingFallback = ({
  message = "Loading...",
  showAfterMs = 300,
  showProgressAfterMs = 1000,
  minDisplayTimeMs = 500,
}) => {
  const [visible, setVisible] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const performanceStart = useRef(performance.now());

  useEffect(() => {
    // Set loading visible after delay to avoid flashing for quick loads
    const timer = setTimeout(() => {
      setVisible(true);
    }, showAfterMs);

    // Show progress indicator for longer loads
    const progressTimer = setTimeout(() => {
      setShowProgress(true);
    }, showProgressAfterMs);

    // Start elapsed time counter
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      clearTimeout(progressTimer);
      clearInterval(interval);
    };
  }, [showAfterMs, showProgressAfterMs]);

  // When component unmounts, force minimum display time
  useEffect(() => {
    return () => {
      const now = Date.now();
      const elapsed = now - performanceStart.current;

      if (elapsed < minDisplayTimeMs) {
        const delay = minDisplayTimeMs - elapsed;
        // This creates a small delay before actually unmounting
        // to prevent abrupt UI changes
        new Promise((resolve) => setTimeout(resolve, delay));
      }
    };
  }, [minDisplayTimeMs]);

  // If still within initial delay, don't render anything
  if (!visible) return null;

  return (
    <div className="loading-fallback">
      <div className="loading-spinner"></div>
      <p className="loading-message">{message}</p>

      {showProgress && (
        <div className="loading-details">
          <div className="loading-progress">
            <div
              className="loading-progress-bar"
              style={{ width: `${Math.min(elapsedTime * 5, 90)}%` }}
            ></div>
          </div>
          {elapsedTime > 5 && (
            <p className="loading-time">{`Taking longer than expected (${elapsedTime}s)...`}</p>
          )}
        </div>
      )}
    </div>
  );
};

LoadingFallback.propTypes = {
  message: PropTypes.string,
  showAfterMs: PropTypes.number,
  showProgressAfterMs: PropTypes.number,
  minDisplayTimeMs: PropTypes.number,
};

export default LoadingFallback;
