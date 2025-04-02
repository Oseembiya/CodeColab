/**
 * Utility functions for date and time operations
 */

/**
 * Format a date and time into a timestamp
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {string} time - Time string in HH:MM format
 * @returns {number} - Timestamp in milliseconds
 */
export const formatDateTime = (date, time) => {
  const dateTimeStr = `${date}T${time}`;
  return new Date(dateTimeStr).getTime();
};

/**
 * Get the current timestamp in milliseconds
 * @returns {number} - Current timestamp
 */
export const getCurrentTimestamp = () => {
  return new Date().getTime();
};
