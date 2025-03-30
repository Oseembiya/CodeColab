const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  // Only allow POST and GET methods
  if (event.httpMethod !== "POST" && event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Extract path from event
    const path = event.path.replace("/.netlify/functions/judge0-proxy", "");

    // Base URL for Judge0 API
    const apiUrl = "https://judge0-ce.p.rapidapi.com";

    // Get RapidAPI key from environment variables
    // Netlify automatically makes build environment variables available to functions
    const rapidApiKey =
      process.env.VITE_RAPIDAPI_KEY ||
      context.clientContext?.env?.VITE_RAPIDAPI_KEY;

    if (!rapidApiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "RapidAPI key not configured" }),
      };
    }

    // Prepare request options
    const options = {
      method: event.httpMethod,
      headers: {
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        "X-RapidAPI-Key": rapidApiKey,
        "Content-Type": "application/json",
      },
    };

    // Add body for POST requests
    if (event.httpMethod === "POST" && event.body) {
      options.body = event.body;
    }

    // Build the full URL with query parameters
    let url = `${apiUrl}${path}`;
    if (event.queryStringParameters) {
      const queryParams = new URLSearchParams(
        event.queryStringParameters
      ).toString();
      url = `${url}?${queryParams}`;
    }

    console.log("Proxying request to:", url);

    // Send request to Judge0 API
    const response = await fetch(url, options);
    const data = await response.json();

    console.log("Judge0 API response status:", response.status);

    // Return the API response
    return {
      statusCode: response.status,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Judge0 proxy error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to proxy request to Judge0 API",
        message: error.message,
      }),
    };
  }
};
