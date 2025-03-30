// Import the necessary Firebase modules
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  connectAuthEmulator,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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

// Override authDomain with current domain in production
if (
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  !window.location.hostname.includes("127.0.0.1")
) {
  // Use the current hostname for auth domain in production
  firebaseConfig.authDomain = window.location.hostname;
  console.log(
    "Using current hostname for Firebase Auth:",
    firebaseConfig.authDomain
  );
}

// Add direct handler for auth redirect page to prevent black screen
if (
  typeof window !== "undefined" &&
  window.location.pathname.includes("/__/auth/handler")
) {
  console.log("Detected auth handler page, handling redirect");
  // Short delay to ensure auth processing completes
  setTimeout(() => {
    window.location.href = "/dashboard";
  }, 1500);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Use emulator in development if configured
if (
  import.meta.env.MODE === "development" &&
  import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true"
) {
  connectAuthEmulator(auth, "http://localhost:9099");
  console.log("Using Firebase Auth Emulator");
}

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
