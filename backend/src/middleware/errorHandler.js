/**
 * Global error handling middleware
 */

// Custom error types
class ValidationError extends Error {
  constructor(message, fields) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
    this.statusCode = 400;
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = 403;
  }
}

class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} not found`);
    this.name = "NotFoundError";
    this.statusCode = 404;
  }
}

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }

  // Set default status and message
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Format the error response based on error type
  let errorResponse = {
    error: {
      name: err.name || "Error",
      message: message,
    },
  };

  // Add specific error data if available
  if (err instanceof ValidationError && err.fields) {
    errorResponse.error.fields = err.fields;
  }

  // Send the error response
  res.status(status).json(errorResponse);
};

// Catch 404 errors
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError("Route");
  next(error);
};

module.exports = {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  errorHandler,
  notFoundHandler,
};
