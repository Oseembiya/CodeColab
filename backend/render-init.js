/**
 * Render initialization script
 * This script runs before the server starts and sets up the needed files and configurations
 */
const fs = require("fs");
const path = require("path");

console.log("Running Render initialization script...");

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

// Log all environment variables (without values) for debugging
console.log("Available environment variables:");
Object.keys(process.env).forEach((key) => {
  console.log(
    `- ${key}: ${
      key.includes("KEY") ||
      key.includes("SECRET") ||
      key.includes("PASSWORD") ||
      key.includes("CREDENTIALS")
        ? "[REDACTED]"
        : "Set"
    }`
  );
});

console.log("Initialization complete.");

// No need to export anything
