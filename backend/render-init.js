/**
 * Render initialization script
 * This script runs before the server starts and sets up the needed files and configurations
 */
const path = require("path");
const fs = require("fs");

console.log("Backend initialization script running...");

// Create a credentials file from the environment variable if it exists
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    console.log(
      "Writing Firebase credentials from environment variable to file..."
    );

    // Parse to verify it's valid JSON
    const credentials = JSON.parse(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    );

    // Write to file
    const credentialsPath = path.join(__dirname, "firebase-credentials.json");
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    // Set the credentials file path
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

    console.log(`Firebase credentials written to ${credentialsPath}`);
  } catch (error) {
    console.error("Error writing Firebase credentials:", error.message);
  }
} else {
  console.log(
    "No GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable found."
  );
}

// Log environment for debugging
console.log(`NODE_ENV: ${process.env.NODE_ENV || "not set"}`);
console.log(`Production mode: ${process.env.NODE_ENV === "production"}`);

console.log("Initialization completed, server will start normally.");

// No need to export anything
