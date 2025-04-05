const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

// Extract credentials from environment variables
const credentials = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

// Get Firestore instance
const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
