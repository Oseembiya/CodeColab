import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";

/**
 * Reusable Toast Notification component for showing success or error messages
 */
const Toast = ({
  message,
  type = "success",
  onClose,
  autoClose = true,
  autoCloseTime = 3000,
  position = "top-right",
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  // Handle auto close
  useEffect(() => {
    let autoCloseTimer;
    let fadeTimer;

    if (autoClose && message) {
      autoCloseTimer = setTimeout(() => {
        setIsFading(true);

        fadeTimer = setTimeout(() => {
          setIsVisible(false);
          if (onClose) onClose();
        }, 300); // Match the CSS animation duration
      }, autoCloseTime);
    }

    return () => {
      clearTimeout(autoCloseTimer);
      clearTimeout(fadeTimer);
    };
  }, [autoClose, autoCloseTime, message, onClose]);

  // Handle manual close
  const handleClose = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!message || !isVisible) return null;

  // Determine position class
  const positionClass = `position-${position.replace(/\s+/g, "-")}`;

  return (
    <div
      className={`status-message-container ${type} ${positionClass} ${
        isFading ? "fade-out" : ""
      }`}
      role="alert"
    >
      <div className="status-message-content">
        <div className="status-icon">
          {type === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
        </div>
        <p>{message}</p>
        <button
          className="close-message"
          onClick={handleClose}
          aria-label="Close alert"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

Toast.propTypes = {
  message: PropTypes.string,
  type: PropTypes.oneOf(["success", "error"]),
  onClose: PropTypes.func,
  autoClose: PropTypes.bool,
  autoCloseTime: PropTypes.number,
  position: PropTypes.oneOf([
    "top-right",
    "top-left",
    "bottom-right",
    "bottom-left",
    "top-center",
    "bottom-center",
  ]),
};

export default Toast;
