import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore, collection } from "firebase/firestore";
import { getStorage, ref as storageRef } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

/**
 * Get Firebase configuration from environment variables
 * @returns {Object} Firebase configuration
 */
const getFirebaseConfig = () => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
});

// Create a singleton Firebase instance
let firebaseInstance = null;

/**
 * Initialize Firebase services with caching
 * @returns {Object} Firebase instance
 */
const initializeFirebase = () => {
  if (!firebaseInstance) {
    const app = initializeApp(getFirebaseConfig());
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);
    let analytics = null;

    // Configure persistence
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence error:", error);
    });

    // Set language
    auth.useDeviceLanguage();

    // Initialize Analytics if supported
    if (typeof window !== "undefined") {
      isSupported()
        .then((yes) => {
          if (yes) analytics = getAnalytics(app);
        })
        .catch((err) => {
          console.warn("Analytics not supported:", err);
        });
    }

    // Store instances
    firebaseInstance = {
      app,
      auth,
      db,
      storage,
      analytics,
    };
  }
  return firebaseInstance;
};

// Initialize and export Firebase instances
const { app, auth, db, storage, analytics } = initializeFirebase();

// Create collection references
const collections = {
  users: collection(db, "users"),
  sessions: collection(db, "sessions"),
  statistics: collection(db, "statistics"),
  activities: collection(db, "activities"),
};

// Create storage references
const storageRefs = {
  profilePhotos: storageRef(storage, "profile-photos"),
  sessionFiles: storageRef(storage, "session-files"),
};

/**
 * Auth state observer helper
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
const authStateObserver = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        lastLoginAt: user.metadata.lastSignInTime,
      };
      callback({ user: userData, status: "authenticated" });
    } else {
      callback({ user: null, status: "unauthenticated" });
    }
  });
};

/**
 * Custom Firebase error handling
 * @param {Error} error - Firebase error
 * @returns {string} User-friendly error message
 */
const handleFirebaseError = (error) => {
  const errorMessage = {
    "auth/user-not-found": "No user found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "Email already registered.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-email": "Invalid email address.",
    "auth/operation-not-allowed": "Operation not allowed.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "storage/unauthorized": "User not authorized to access storage.",
    "storage/canceled": "Storage operation canceled.",
    "storage/unknown": "Unknown storage error occurred.",
    "firestore/permission-denied": "Permission denied to access Firestore.",
    "firestore/unavailable": "Firestore service is unavailable.",
    default: "An error occurred. Please try again.",
  };

  return errorMessage[error.code] || errorMessage.default;
};

export {
  app,
  auth,
  db,
  storage,
  analytics,
  collections,
  storageRefs,
  authStateObserver,
  handleFirebaseError,
};

export default app;
