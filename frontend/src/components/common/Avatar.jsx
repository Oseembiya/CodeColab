import React, { useState } from "react";
import PropTypes from "prop-types";
import { getAvatarUrl } from "../../utils/imageUtils";

// Import the default avatar data URL from imageUtils
import { getImageUrl } from "../../utils/imageUtils";

// Default avatar as data URL to avoid 404 errors
const DEFAULT_AVATAR_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Cpath fill='%23c6c6c6' d='M0 0h128v128H0z'/%3E%3Ccircle fill='%23fff' cx='64' cy='48' r='28'/%3E%3Cpath fill='%23fff' d='M64 95c19.883 0 36-8.075 36-18.031V89c0 18-16.117 33-36 33S28 107 28 89V76.969C28 86.925 44.117 95 64 95z'/%3E%3C/svg%3E";

/**
 * Avatar component that uses OptimizedImage for efficient loading
 */
const Avatar = ({
  src,
  alt = "User avatar",
  size = 40,
  className = "",
  fallbackSrc = DEFAULT_AVATAR_SVG,
  onClick,
  showStatus = false,
  status = "offline",
  ...props
}) => {
  const [error, setError] = useState(false);

  // Use processed URL or fallback if error
  const imageUrl = error ? fallbackSrc : getAvatarUrl(src, size);

  const handleError = () => {
    setError(true);
  };

  // Generate classes for avatar
  const avatarClasses = [
    "avatar",
    `avatar-${size}`,
    className,
    onClick ? "avatar-clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Generate classes for status indicator
  const statusClasses = ["avatar-status", `status-${status}`].join(" ");

  return (
    <div className={avatarClasses} onClick={onClick} {...props}>
      <img
        src={imageUrl}
        alt={alt}
        className={`rounded-full ${className}`}
        style={{ width: size, height: size, objectFit: "cover" }}
        onError={handleError}
      />

      {showStatus && <span className={statusClasses} title={status} />}
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.number,
  className: PropTypes.string,
  fallbackSrc: PropTypes.string,
  onClick: PropTypes.func,
  showStatus: PropTypes.bool,
  status: PropTypes.oneOf(["online", "offline", "away", "busy"]),
};

export default Avatar;
