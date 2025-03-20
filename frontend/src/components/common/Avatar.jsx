import PropTypes from "prop-types";
import { useAvatar } from "../../hooks/useImage";
import "../../styles/components/avatar.css";

/**
 * Reusable Avatar component with loading states
 */
const Avatar = ({
  src,
  size = "md",
  alt = "User avatar",
  className = "",
  showStatus = false,
  status = "offline",
  clickable = false,
  onClick = null,
}) => {
  // Map size names to actual pixel values
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 96,
  };

  // Get pixel size for the avatar image
  const pixelSize =
    typeof size === "number" ? size : sizeMap[size] || sizeMap.md;

  // Use our custom hook for avatar loading
  const { url, isLoading, isError } = useAvatar(src, { size: pixelSize });

  // Generate CSS classes
  const avatarClasses = [
    "avatar",
    `avatar-${size}`,
    isLoading ? "avatar-loading" : "",
    isError ? "avatar-error" : "",
    clickable ? "avatar-clickable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Status indicator classes
  const statusClasses = ["avatar-status", `status-${status}`].join(" ");

  return (
    <div className="avatar-container">
      <div
        className={avatarClasses}
        onClick={clickable && onClick ? onClick : undefined}
        style={{ width: pixelSize, height: pixelSize }}
      >
        {isLoading ? (
          <div className="avatar-skeleton" />
        ) : (
          <img
            src={url}
            alt={alt}
            width={pixelSize}
            height={pixelSize}
            onError={(e) => {
              // Fallback to default avatar on error
              e.target.src = "/default-avatar.png";
            }}
          />
        )}

        {showStatus && <span className={statusClasses} />}
      </div>
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  size: PropTypes.oneOfType([
    PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
    PropTypes.number,
  ]),
  alt: PropTypes.string,
  className: PropTypes.string,
  showStatus: PropTypes.bool,
  status: PropTypes.oneOf(["online", "away", "busy", "offline"]),
  clickable: PropTypes.bool,
  onClick: PropTypes.func,
};

export default Avatar;
