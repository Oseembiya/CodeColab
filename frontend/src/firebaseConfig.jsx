import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Initialize Firebase with configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/**
 * Custom function to handle popup authentication with better error handling
 * @param {AuthProvider} provider - The auth provider (Google, Facebook, etc.)
 * @returns {Promise<UserCredential>} - Promise resolving to user credentials
 */
const handlePopupAuth = async (provider) => {
  try {
    // Use standard Firebase signInWithPopup with the specified provider
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    console.error("Popup auth error:", error);

    // Improve error handling for specific cases
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Authentication was cancelled by the user.");
    } else if (error.code === "auth/popup-blocked") {
      throw new Error(
        "Authentication popup was blocked by the browser. Please enable popups for this site."
      );
    } else if (error.code === "auth/cancelled-popup-request") {
      throw new Error(
        "Multiple popup requests were made. Only one popup can be open at a time."
      );
    }

    // Forward other errors
    throw error;
  }
};

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
export { app, db, auth, storage, analytics, handlePopupAuth };
