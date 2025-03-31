const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables based on NODE_ENV
const environment = process.env.NODE_ENV || "development";
console.log(`Current environment: ${environment}`);

// Try to load .env file
const envPath = path.resolve(__dirname, `.env.${environment}`);
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(`No env file found at: ${envPath}, using process.env values`);
}

// Log available credential methods for debugging
console.log("Available Firebase credential methods:");
console.log(
  `- GOOGLE_APPLICATION_CREDENTIALS: ${
    process.env.GOOGLE_APPLICATION_CREDENTIALS ? "Set" : "Not set"
  }`
);
console.log(
  `- GOOGLE_APPLICATION_CREDENTIALS_JSON: ${
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? "Set" : "Not set"
  }`
);
console.log(
  `- FIREBASE_PROJECT_ID: ${
    process.env.FIREBASE_PROJECT_ID ? "Set" : "Not set"
  }`
);
console.log(
  `- FIREBASE_CLIENT_EMAIL: ${
    process.env.FIREBASE_CLIENT_EMAIL ? "Set" : "Not set"
  }`
);
console.log(
  `- FIREBASE_PRIVATE_KEY: ${
    process.env.FIREBASE_PRIVATE_KEY ? "Set" : "Not set"
  }`
);

// Initialize Firebase Admin SDK
let adminConfig = {};

try {
  // Check for JSON credentials first (for Render and other cloud hosts)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.log(
      "Using GOOGLE_APPLICATION_CREDENTIALS_JSON for Firebase Admin initialization"
    );
    try {
      const serviceAccount = JSON.parse(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
      );
      adminConfig = {
        credential: admin.credential.cert(serviceAccount),
      };
    } catch (e) {
      console.error(
        "Error parsing GOOGLE_APPLICATION_CREDENTIALS_JSON:",
        e.message
      );
      throw new Error("Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON");
    }
  }
  // Then check for credentials file path
  else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(
      "Using GOOGLE_APPLICATION_CREDENTIALS for Firebase Admin initialization"
    );
    // The SDK will automatically use the environment variable path
  }
  // Finally try individual credential values
  else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.log(
      "Using individual Firebase credentials for Admin initialization"
    );
    adminConfig = {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    };
  }
  // No credentials available
  else {
    throw new Error(
      "No Firebase credentials found. Set either GOOGLE_APPLICATION_CREDENTIALS_JSON, GOOGLE_APPLICATION_CREDENTIALS, or individual Firebase credential environment variables."
    );
  }

  // Add the database URL if it exists
  if (process.env.FIREBASE_DATABASE_URL) {
    console.log(
      `Using Firebase database URL: ${process.env.FIREBASE_DATABASE_URL}`
    );
    adminConfig.databaseURL = process.env.FIREBASE_DATABASE_URL;
  }

  // Initialize the app if it's not already initialized
  if (!admin.apps.length) {
    admin.initializeApp(adminConfig);
    console.log("Firebase Admin SDK initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin SDK:", error.message);
  // Re-throw the error to be handled by the caller
  throw error;
}

// Get Firestore database instance
const db = admin.firestore();

module.exports = { admin, db };
