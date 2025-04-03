/**
 * API client configuration and creation
 * This file provides a reusable API client with authentication support
 */
import config from "../config/env";

/**
 * Creates an API client with authentication
 * @param {Function} getToken - Function that returns a promise resolving to an auth token
 * @returns {Object} - API client object with methods for HTTP requests
 */
export const createApiClient = (getToken) => {
  const baseUrl = config.apiUrl;

  /**
   * Make an authenticated API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise} - Promise resolving to response data
   */
  const makeRequest = async (endpoint, options = {}) => {
    try {
      // Get authentication token if the getToken function is provided
      let headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      if (getToken) {
        const token = await getToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      // Ensure options.body is a string if it exists
      if (options.body && typeof options.body !== "string") {
        options.body = JSON.stringify(options.body);
      }

      // Prepare the URL, handling both absolute and relative URLs
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

      // Make the request
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });

      // Parse the response
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        const error = new Error(data.message || response.statusText);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (error) {
      // Enhance error with additional information
      if (!error.status) {
        error.status = 0;
        error.message = error.message || "Network error";
      }
      throw error;
    }
  };

  // Return an object with methods for different HTTP verbs
  return {
    get: (endpoint, options = {}) =>
      makeRequest(endpoint, { ...options, method: "GET" }),

    post: (endpoint, data = {}, options = {}) =>
      makeRequest(endpoint, {
        ...options,
        method: "POST",
        body: JSON.stringify(data),
      }),

    put: (endpoint, data = {}, options = {}) =>
      makeRequest(endpoint, {
        ...options,
        method: "PUT",
        body: JSON.stringify(data),
      }),

    patch: (endpoint, data = {}, options = {}) =>
      makeRequest(endpoint, {
        ...options,
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (endpoint, options = {}) =>
      makeRequest(endpoint, { ...options, method: "DELETE" }),
  };
};

/**
 * Create a default API client with no authentication
 */
export const api = createApiClient();

export default api;
