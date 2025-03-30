// Import the necessary Firebase modules
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services with optimized settings
const auth = getAuth(app);

const storage = getStorage(app);

/**
 * Observer for auth state changes
 * @param {Function} callback Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
const authStateObserver = (callback) => {
  return onAuthStateChanged(
    auth,
    (user) => {
      if (user) {
        // User is signed in
        callback({
          status: "signedIn",
          user,
          error: null,
        });
      } else {
        // User is signed out
        callback({
          status: "signedOut",
          user: null,
          error: null,
        });
      }
    },
    (error) => {
      // Auth error occurred
      callback({
        status: "error",
        user: null,
        error,
      });
    }
  );
};

/**
 * Handle Firebase auth errors with user-friendly messages
 * @param {Error} error Firebase auth error
 * @returns {string} User-friendly error message
 */
const handleFirebaseError = (error) => {
  const errorCode = error.code;
  const errorMessage = error.message;

  // Map error codes to user-friendly messages
  const errorMap = {
    "auth/invalid-email": "The email address is not valid.",
    "auth/user-disabled": "This user account has been disabled.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "The password is too weak.",
    "auth/popup-closed-by-user":
      "Sign-in popup was closed before completing the sign in.",
    "auth/cancelled-popup-request": "The sign-in popup request was cancelled.",
    "auth/popup-blocked": "Sign-in popup was blocked by the browser.",
    "auth/network-request-failed":
      "A network error occurred. Please check your connection.",
    "auth/too-many-requests":
      "Too many unsuccessful sign-in attempts. Please try again later.",
    "auth/quota-exceeded": "Operation quota exceeded. Please try again later.",
    "auth/requires-recent-login": "This operation requires re-authentication.",
    "auth/account-exists-with-different-credential":
      "An account already exists with the same email but different sign-in credentials.",
  };

  // Return user-friendly message or fallback to Firebase message
  return errorMap[errorCode] || `Authentication error: ${errorMessage}`;
};

export { app, auth, db, storage, authStateObserver, handleFirebaseError };
