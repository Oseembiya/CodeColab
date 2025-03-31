// Import the necessary Firebase modules
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  getRedirectResult,
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

// DO NOT override authDomain with the current hostname
// Firebase Authentication needs its original authDomain for OAuth redirects
// Just make sure codekolab.netlify.app is added to authorized domains in Firebase Console
console.log("Using Firebase Auth Domain:", firebaseConfig.authDomain);

// Add direct handler for auth redirect page to prevent black screen
if (
  typeof window !== "undefined" &&
  window.location.pathname.includes("/__/auth/handler")
) {
  console.log("Detected auth handler page, waiting for auth...");

  // Create a stronger handler that waits for auth to initialize
  const MAX_WAIT_TIME = 10000; // 10 seconds max wait
  const START_TIME = Date.now();

  const checkAuthAndRedirect = () => {
    // Check if we've waited too long
    if (Date.now() - START_TIME > MAX_WAIT_TIME) {
      console.error("Auth redirect timeout - navigating to login page");
      window.location.href = "/login?error=auth_timeout";
      return;
    }

    try {
      // Try to access auth - might not be initialized yet
      if (!auth) {
        console.log("Auth not initialized yet, waiting...");
        setTimeout(checkAuthAndRedirect, 500);
        return;
      }

      const currentUser = auth.currentUser;

      if (currentUser) {
        // User is authenticated, redirect to dashboard
        console.log("Auth detected, redirecting to dashboard");
        window.location.href = "/dashboard";
      } else {
        // No user, but we should still redirect out of the handler page
        // Check if getRedirectResult would be available yet
        if (typeof getRedirectResult === "function") {
          console.log("Checking redirect result directly");
          getRedirectResult(auth)
            .then((result) => {
              if (result?.user) {
                window.location.href = "/dashboard";
              } else {
                console.log("No redirect result found, redirecting to login");
                window.location.href = "/login";
              }
            })
            .catch((error) => {
              console.error("Error in redirect handler:", error);
              window.location.href = `/login?error=${encodeURIComponent(
                error.code || "unknown"
              )}`;
            });
        } else {
          // Try again in a short while
          console.log("No auth detected yet, waiting...");
          setTimeout(checkAuthAndRedirect, 500);
        }
      }
    } catch (error) {
      console.error("Error in auth handler:", error);
      setTimeout(checkAuthAndRedirect, 500);
    }
  };

  // Start checking auth state after a small initial delay
  setTimeout(checkAuthAndRedirect, 1000);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Set up local persistence to keep users logged in
// This helps prevent auth state from being lost during redirects
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set to local");
  })
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

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
