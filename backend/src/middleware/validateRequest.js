/**
 * Request validation middleware
 */
const { ValidationError } = require("./errorHandler");

/**
 * Validates request body against a schema
 * @param {Object} schema - Schema object with field definitions
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = {};
    const validatedFields = {};

    // Check each field against schema rules
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Check required fields
      if (
        rules.required &&
        (value === undefined || value === null || value === "")
      ) {
        errors[field] = `${field} is required`;
        continue;
      }

      // Skip validation for undefined optional fields
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors[field] = `${field} must be a ${rules.type}`;
        continue;
      }

      // Minimum length for strings
      if (
        rules.type === "string" &&
        rules.minLength &&
        value.length < rules.minLength
      ) {
        errors[
          field
        ] = `${field} must be at least ${rules.minLength} characters`;
        continue;
      }

      // Maximum length for strings
      if (
        rules.type === "string" &&
        rules.maxLength &&
        value.length > rules.maxLength
      ) {
        errors[
          field
        ] = `${field} must be at most ${rules.maxLength} characters`;
        continue;
      }

      // Pattern matching for strings
      if (
        rules.type === "string" &&
        rules.pattern &&
        !rules.pattern.test(value)
      ) {
        errors[field] = rules.message || `${field} format is invalid`;
        continue;
      }

      // Minimum value for numbers
      if (
        rules.type === "number" &&
        rules.min !== undefined &&
        value < rules.min
      ) {
        errors[field] = `${field} must be at least ${rules.min}`;
        continue;
      }

      // Maximum value for numbers
      if (
        rules.type === "number" &&
        rules.max !== undefined &&
        value > rules.max
      ) {
        errors[field] = `${field} must be at most ${rules.max}`;
        continue;
      }

      // Field passed all validations
      validatedFields[field] = value;
    }

    // If there are errors, throw a ValidationError
    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Validation failed", errors);
    }

    // Replace req.body with validated fields
    req.validatedBody = validatedFields;
    next();
  };
};

/**
 * Validates request query parameters against a schema
 * @param {Object} schema - Schema object with field definitions
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const errors = {};
    const validatedQuery = {};

    // Similar validation logic as validateBody
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.query[field];

      if (rules.required && (value === undefined || value === "")) {
        errors[field] = `${field} query parameter is required`;
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      // Type coercion for query parameters (they come as strings)
      let typedValue = value;
      if (rules.type === "number") {
        typedValue = Number(value);
        if (isNaN(typedValue)) {
          errors[field] = `${field} must be a number`;
          continue;
        }
      } else if (rules.type === "boolean") {
        typedValue = value === "true";
      }

      // Apply remaining validations
      if (
        rules.type === "string" &&
        rules.minLength &&
        value.length < rules.minLength
      ) {
        errors[
          field
        ] = `${field} must be at least ${rules.minLength} characters`;
        continue;
      }

      if (
        rules.type === "string" &&
        rules.maxLength &&
        value.length > rules.maxLength
      ) {
        errors[
          field
        ] = `${field} must be at most ${rules.maxLength} characters`;
        continue;
      }

      if (
        rules.type === "string" &&
        rules.pattern &&
        !rules.pattern.test(value)
      ) {
        errors[field] = rules.message || `${field} format is invalid`;
        continue;
      }

      if (
        rules.type === "number" &&
        rules.min !== undefined &&
        typedValue < rules.min
      ) {
        errors[field] = `${field} must be at least ${rules.min}`;
        continue;
      }

      if (
        rules.type === "number" &&
        rules.max !== undefined &&
        typedValue > rules.max
      ) {
        errors[field] = `${field} must be at most ${rules.max}`;
        continue;
      }

      validatedQuery[field] = typedValue;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError("Query validation failed", errors);
    }

    req.validatedQuery = validatedQuery;
    next();
  };
};

module.exports = {
  validateBody,
  validateQuery,
};
