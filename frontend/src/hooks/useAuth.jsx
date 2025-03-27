import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
import {
  auth,
  authStateObserver,
  handleFirebaseError,
} from "../firebaseConfig";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getIdToken as firebaseGetIdToken,
} from "firebase/auth";
import config from "../config/env";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    loading: true,
    error: null,
  });

  // Token caching and error throttling
  const tokenCache = useRef({
    token: null,
    expiry: 0,
  });
  const tokenErrorCount = useRef(0);
  const lastTokenAttempt = useRef(0);

  useEffect(() => {
    // Listen for auth state changes using the observer from firebaseConfig
    const unsubscribe = authStateObserver((state) => {
      setAuthState({
        user: state.user,
        loading: false,
        error: state.error || null,
      });

      // Reset token cache when auth state changes
      tokenCache.current = {
        token: null,
        expiry: 0,
      };

      // Log auth state in development mode
      if (config.isDevelopment && config.debug) {
        console.log("Auth state changed:", state.status);
      }
    });

    return () => unsubscribe();
  }, []);

  // Secure login function with rate limiting and error handling
  const login = useCallback(async (email, password) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage = handleFirebaseError(error);
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Secure logout function
  const logout = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));
      await firebaseSignOut(auth);
      // Clear token cache on logout
      tokenCache.current = { token: null, expiry: 0 };
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      const errorMessage = handleFirebaseError(error);
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Get authentication token for API calls with caching and quota management
  const getIdToken = useCallback(async () => {
    if (!authState.user || !auth.currentUser) return null;

    const now = Date.now();

    // Check if we have a cached token that's still valid (within 50 minutes)
    // Firebase tokens typically last 60 minutes
    if (tokenCache.current.token && tokenCache.current.expiry > now) {
      return tokenCache.current.token;
    }

    // Check if we should throttle due to quota errors
    if (tokenErrorCount.current > 5) {
      const timeSinceLastAttempt = now - lastTokenAttempt.current;

      // If it's been less than 5 minutes since last error, use cached token or null
      if (timeSinceLastAttempt < 5 * 60 * 1000) {
        console.warn("Throttling token requests due to previous quota errors");
        return tokenCache.current.token || null;
      } else {
        // Reset the counter after the cooldown period
        tokenErrorCount.current = 0;
      }
    }

    // Update last attempt time
    lastTokenAttempt.current = now;

    try {
      // This gets a fresh token if needed
      const token = await firebaseGetIdToken(auth.currentUser, true);

      // Cache the token with expiry time (50 minutes)
      tokenCache.current = {
        token,
        expiry: now + 50 * 60 * 1000,
      };

      // Reset error count on success
      tokenErrorCount.current = 0;

      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);

      // Check for quota exceeded error and increment counter
      if (error.message && error.message.includes("auth/quota-exceeded")) {
        tokenErrorCount.current += 1;
        console.warn(
          `Auth quota exceeded (count: ${tokenErrorCount.current}). Will throttle requests.`
        );
      }

      // Return cached token if available, otherwise null
      return tokenCache.current.token || null;
    }
  }, [authState.user]);

  // Clear any auth errors
  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  const value = {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    isAuthenticated: !!authState.user,
    login,
    logout,
    getIdToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {!authState.loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
