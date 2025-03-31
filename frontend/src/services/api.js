/**
 * Centralized API service for making authenticated API calls
 */
import config from "../config/env";

// Default API options
const defaultOptions = {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include",
};

/**
 * Format API endpoint to ensure proper URL structure
 * @param {string} baseUrl - Base API URL
 * @param {string} endpoint - Endpoint to append
 * @returns {string} - Properly formatted URL
 */
const formatEndpoint = (baseUrl, endpoint) => {
  if (!endpoint) return baseUrl;

  // Remove leading slash from endpoint if present
  const formattedEndpoint = endpoint.startsWith("/")
    ? endpoint.substring(1)
    : endpoint;

  // Ensure base URL doesn't have trailing slash
  const formattedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return `${formattedBase}/${formattedEndpoint}`;
};

/**
 * Creates an API client with or without authentication
 * @param {Function} getToken - Function to get authentication token
 * @returns {Object} API client methods
 */
export const createApiClient = (getToken = null) => {
  // Base API URL from configuration
  const baseUrl = config.api.url;

  /**
   * Make authenticated API call
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<any>} API response
   */
  const fetchWithAuth = async (endpoint, options = {}) => {
    try {
      const url = formatEndpoint(baseUrl, endpoint);

      // Merge default options with provided options
      const fetchOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers,
        },
      };

      // Add authentication token if available
      if (getToken) {
        try {
          const token = await getToken();
          if (token) {
            fetchOptions.headers.Authorization = `Bearer ${token}`;
          }
        } catch (tokenError) {
          console.error(
            "Failed to get auth token for API request:",
            tokenError
          );
          // Continue without token - will fail if authentication is required
        }
      }

      // Make API call
      const response = await fetch(url, fetchOptions);

      // Handle JSON responses
      const contentType = response.headers.get("content-type");

      // For empty responses, return an empty object to avoid JSON parse errors
      if (
        response.status === 204 ||
        response.headers.get("content-length") === "0"
      ) {
        return { success: true };
      }

      const isJson = contentType && contentType.includes("application/json");
      let data;

      try {
        data = isJson ? await response.json() : await response.text();
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        data = { error: "Failed to parse response" };
      }

      // Handle error responses
      if (!response.ok) {
        const error = new Error(
          isJson && data.error
            ? data.error.message || data.error
            : "API request failed"
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Don't log specific expected errors
      const isExpectedError =
        error.message &&
        (error.message.includes("already exists") ||
          error.message.includes("Friend request already exists"));

      if (!isExpectedError) {
        console.error(
          `API call error (${options.method || "GET"} ${endpoint}):`,
          error
        );
      }
      throw error;
    }
  };

  // API client methods
  return {
    // GET request
    get: (endpoint, options = {}) =>
      fetchWithAuth(endpoint, { ...options, method: "GET" }),

    // POST request
    post: (endpoint, data, options = {}) =>
      fetchWithAuth(endpoint, {
        ...options,
        method: "POST",
        body: JSON.stringify(data),
      }),

    // PUT request
    put: (endpoint, data, options = {}) =>
      fetchWithAuth(endpoint, {
        ...options,
        method: "PUT",
        body: JSON.stringify(data),
      }),

    // DELETE request
    delete: (endpoint, options = {}) =>
      fetchWithAuth(endpoint, { ...options, method: "DELETE" }),

    // Custom request
    request: fetchWithAuth,
  };
};

export default createApiClient;
