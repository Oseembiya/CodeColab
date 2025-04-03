import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import config from "./config/env";

// Initialize Firebase with configuration from environment variables
const firebaseConfig = config.firebaseConfig;

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Initialize Analytics conditionally (only in browser environment)
let analytics = null;
if (typeof window !== "undefined") {
  // Check if analytics is supported in the current environment
  isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

// Export Firebase services
export { app, db, auth, storage, analytics };
