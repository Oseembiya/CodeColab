/**
 * Sentry utility functions
 * This is a placeholder implementation to prevent import errors
 */

/**
 * Add a breadcrumb for error tracking
 */
const addBreadcrumb = (breadcrumb) => {
  // No-op function for now - would normally send to Sentry
  console.log("[Sentry Breadcrumb]", breadcrumb);
};

/**
 * Capture an exception
 */
const captureException = (error, options = {}) => {
  // No-op function for now - would normally send to Sentry
  console.error("[Sentry Exception]", error, options);
};

/**
 * Set user context for error tracking
 */
const setUser = (user) => {
  // No-op function for now - would normally send to Sentry
  console.log("[Sentry User]", user);
};

module.exports = {
  addBreadcrumb,
  captureException,
  setUser,
};
