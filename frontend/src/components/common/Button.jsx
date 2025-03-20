import PropTypes from "prop-types";
import "../../styles/components/button.css";

/**
 * Reusable Button component with multiple variants
 */
const Button = ({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  fullWidth = false,
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = "left",
  onClick,
  className = "",
  ...props
}) => {
  // Generate CSS classes
  const buttonClasses = [
    "btn",
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? "btn-full-width" : "",
    loading ? "btn-loading" : "",
    icon && !children ? "btn-icon-only" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              strokeWidth="4"
              stroke="currentColor"
              strokeDasharray="32"
              strokeDashoffset="12"
            />
          </svg>
        </span>
      )}

      {icon && iconPosition === "left" && !loading && (
        <span className="btn-icon btn-icon-left">{icon}</span>
      )}

      {children && <span className="btn-text">{children}</span>}

      {icon && iconPosition === "right" && !loading && (
        <span className="btn-icon btn-icon-right">{icon}</span>
      )}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf([
    "primary",
    "secondary",
    "outline",
    "ghost",
    "danger",
    "success",
  ]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(["left", "right"]),
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default Button;
