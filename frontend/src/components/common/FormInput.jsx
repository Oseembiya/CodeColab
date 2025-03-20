import { forwardRef } from "react";
import PropTypes from "prop-types";
import "../../styles/components/form-input.css";

/**
 * Reusable form input component
 */
const FormInput = forwardRef(
  (
    {
      label,
      name,
      type = "text",
      placeholder = "",
      value,
      onChange,
      onBlur,
      error,
      required = false,
      disabled = false,
      readOnly = false,
      fullWidth = true,
      helperText = "",
      prefix = null,
      suffix = null,
      className = "",
      inputProps = {},
      ...props
    },
    ref
  ) => {
    // Generate CSS classes
    const containerClasses = [
      "form-control",
      error ? "form-control-error" : "",
      disabled ? "form-control-disabled" : "",
      fullWidth ? "form-control-full-width" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const inputClasses = [
      "form-input",
      prefix ? "form-input-with-prefix" : "",
      suffix ? "form-input-with-suffix" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const id = name ? `form-input-${name}` : undefined;

    return (
      <div className={containerClasses}>
        {label && (
          <label className="form-label" htmlFor={id}>
            {label}
            {required && <span className="form-required">*</span>}
          </label>
        )}

        <div className="form-input-wrapper">
          {prefix && <div className="form-input-prefix">{prefix}</div>}

          <input
            ref={ref}
            id={id}
            type={type}
            name={name}
            className={inputClasses}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            {...inputProps}
            {...props}
          />

          {suffix && <div className="form-input-suffix">{suffix}</div>}
        </div>

        {(error || helperText) && (
          <div
            className={`form-feedback ${error ? "form-error" : "form-helper"}`}
          >
            {error || helperText}
          </div>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

FormInput.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  fullWidth: PropTypes.bool,
  helperText: PropTypes.string,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
  className: PropTypes.string,
  inputProps: PropTypes.object,
};

export default FormInput;
