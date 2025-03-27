import React, { memo } from "react";
import PropTypes from "prop-types";
import OptimizedImage from "./OptimizedImage";

/**
 * Avatar component that uses OptimizedImage for efficient loading
 */
const Avatar = ({
  src,
  alt,
  size = "md",
  className = "",
  fallbackSrc = "/assets/default-avatar.png",
  onClick,
  showStatus = false,
  status = "offline",
  ...props
}) => {
  // Map size values to pixel dimensions
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
    xxl: 128,
  };

  // Get pixel size or use exact number
  const pixelSize = sizeMap[size] || (typeof size === "number" ? size : 48);

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
      <OptimizedImage
        src={src}
        alt={alt || "Avatar"}
        width={pixelSize}
        height={pixelSize}
        fallbackSrc={fallbackSrc}
        className="avatar-image"
        placeholderSrc={fallbackSrc} // Use fallback as low-res placeholder
      />

      {showStatus && <span className={statusClasses} title={status} />}
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  size: PropTypes.oneOfType([
    PropTypes.oneOf(["xs", "sm", "md", "lg", "xl", "xxl"]),
    PropTypes.number,
  ]),
  className: PropTypes.string,
  fallbackSrc: PropTypes.string,
  onClick: PropTypes.func,
  showStatus: PropTypes.bool,
  status: PropTypes.oneOf(["online", "offline", "away", "busy"]),
};

export default memo(Avatar);
