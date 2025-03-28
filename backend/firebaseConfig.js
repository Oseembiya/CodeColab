const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables based on NODE_ENV
const environment = process.env.NODE_ENV || "development";
dotenv.config({
  path: path.resolve(__dirname, `.env.${environment}`),
});

// Initialize Firebase Admin SDK
let adminConfig;

// Check for credential options
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // The SDK will automatically use the environment variable path to the credentials file
  adminConfig = {};
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  // For Render and other cloud hosts - use the JSON content directly
  const serviceAccount = JSON.parse(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  );
  adminConfig = {
    credential: admin.credential.cert(serviceAccount),
  };
} else {
  // Use direct credentials from .env if provided
  adminConfig = {
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  };
}

// Add the database URL if it exists
if (process.env.FIREBASE_DATABASE_URL) {
  adminConfig.databaseURL = process.env.FIREBASE_DATABASE_URL;
}

// Initialize the app if it's not already initialized
if (!admin.apps.length) {
  admin.initializeApp(adminConfig);
}

// Get Firestore database instance
const db = admin.firestore();

module.exports = { admin, db };
