import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../hooks/useAuth";
import config from "../config/env";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState(null);
  const { user, getIdToken, isAuthenticated } = useAuth();

  // Add state to track auth errors
  const authErrorCount = useRef(0);
  const lastAuthAttempt = useRef(0);
  const reconnectTimeout = useRef(null);

  // Add refs to prevent reconnection loops
  const isConnecting = useRef(false);
  const connectCount = useRef(0);
  const lastConnectTime = useRef(0);

  // Cleanup function reference
  let cleanupRef = useRef(null);

  // Helper to handle auth token fetch with quota management
  const getAuthToken = async () => {
    // If we've had too many auth errors recently, skip token fetch
    const now = Date.now();
    if (authErrorCount.current > 5) {
      // If it's been more than 5 minutes since our last attempt, reset the counter
      if (now - lastAuthAttempt.current > 5 * 60 * 1000) {
        authErrorCount.current = 0;
      } else {
        // Otherwise skip auth to avoid quota issues
        console.log("Skipping auth token fetch due to previous quota errors");
        return null;
      }
    }

    lastAuthAttempt.current = now;

    try {
      const token = await getIdToken();
      if (token) {
        // Success - reset error counter
        authErrorCount.current = 0;
        return token;
      }
    } catch (error) {
      // Check if this is a quota exceeded error
      if (error.message && error.message.includes("auth/quota-exceeded")) {
        authErrorCount.current += 1;
        console.warn(
          `Auth quota exceeded (count: ${authErrorCount.current}). Will skip token fetch for a while.`
        );
      }
      console.error("Error getting auth token:", error);
    }
    return null;
  };

  const connectSocket = useCallback(async () => {
    // Guard against multiple simultaneous connection attempts
    if (isConnecting.current) {
      console.log("Connection already in progress, skipping");
      return;
    }

    // Add throttling to prevent connection storms
    const now = Date.now();
    const timeSinceLastConnect = now - lastConnectTime.current;
    if (timeSinceLastConnect < 2000) {
      connectCount.current += 1;

      // If we're connecting too frequently, add increasing delay
      if (connectCount.current > 3) {
        const backoffDelay = Math.min(
          30000,
          1000 * Math.pow(2, connectCount.current - 3)
        );
        console.warn(
          `Too many connection attempts. Adding delay: ${backoffDelay}ms`
        );

        // Clear any pending reconnect timeout
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }

        reconnectTimeout.current = setTimeout(() => {
          connectCount.current = 0;
          isConnecting.current = false;
          connectSocket();
        }, backoffDelay);

        return;
      }
    } else {
      // Reset connection counter if it's been a while
      connectCount.current = 0;
    }

    lastConnectTime.current = now;
    isConnecting.current = true;

    // Clear any pending reconnect timeout
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    // Close existing socket if any
    if (socket && socket.connected) {
      console.log("Disconnecting existing socket connection");
      socket.disconnect();
    }

    // If previous cleanup exists, run it first
    if (cleanupRef.current) {
      cleanupRef.current();
    }

    try {
      // Get or create clientId from localStorage
      let clientId = localStorage.getItem("clientId");
      if (!clientId) {
        clientId = uuidv4();
        localStorage.setItem("clientId", clientId);
      }

      // Prepare authentication data
      const authData = { clientId };

      // Add authentication token if user is logged in
      if (isAuthenticated) {
        const token = await getAuthToken();
        if (token) {
          authData.token = token;
          authData.userId = user?.uid;
          console.log("Authentication token acquired for socket connection");
        } else {
          console.warn(
            "No auth token available despite user being authenticated"
          );
        }
      }

      // Socket.io connection URL from environment
      const socketUrl = config.api.socketUrl || "/";

      // Socket.io connection options
      const socketOptions = {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: config.socket.reconnectionAttempts,
        reconnectionDelay: config.socket.reconnectionDelay,
        reconnectionDelayMax: config.socket.reconnectionDelayMax,
        timeout: 60000,
        forceNew: true,
        autoConnect: true,
        auth: authData,
      };

      console.log(`Connecting to socket server at ${socketUrl}`);

      // Create new socket connection
      const newSocket = io(socketUrl, socketOptions);

      newSocket.on("connect", () => {
        isConnecting.current = false;
        setConnectionStatus("connected");
        setSocket(newSocket);
        setError(null);
        console.log("Connected with client ID:", clientId);
        console.log("Transport used:", newSocket.io.engine.transport.name);

        // Log authentication status
        if (authData.token) {
          console.log("Authenticated socket connection established");
        } else {
          console.log("Unauthenticated socket connection established");
        }
      });

      newSocket.io.engine.on("transportChange", (transport) => {
        console.log("Transport changed to:", transport.name);
      });

      newSocket.on("connect_error", (err) => {
        isConnecting.current = false;
        setConnectionStatus("error");
        setError(`Connection error: ${err.message}`);
        console.error("Socket connection error:", err);

        // Check if authentication error but don't automatically reconnect
        // This prevents reconnection storms
        if (err.message.includes("Authentication failed") && isAuthenticated) {
          console.warn(
            "Socket authentication failed despite having a user. Manual reconnection required."
          );
        }
      });

      newSocket.on("reconnect", (attemptNumber) => {
        console.log(
          `Socket reconnected successfully after ${attemptNumber} attempts`
        );
        setConnectionStatus("connected");
        setError(null);
        newSocket.observing = null;
      });

      newSocket.on("reconnect_attempt", (attemptNumber) => {
        setConnectionStatus("reconnecting");
        console.log(`Attempting to reconnect (attempt ${attemptNumber})...`);

        // Try to refresh the auth token on reconnections if authenticated
        // But be careful about quota limits
        if (isAuthenticated && authErrorCount.current < 3) {
          getAuthToken()
            .then((token) => {
              if (token) {
                newSocket.auth.token = token;
                console.log(
                  "Updated authentication token for reconnection attempt"
                );
              }
            })
            .catch((err) => {
              console.error("Failed to refresh token for reconnection:", err);
            });
        }
      });

      newSocket.on("reconnect_error", (err) => {
        console.error("Socket reconnection error:", err);
      });

      newSocket.on("reconnect_failed", () => {
        isConnecting.current = false;
        setConnectionStatus("error");
        setError("Failed to reconnect after multiple attempts");
        console.error("Socket reconnection failed after all attempts");

        // Try again after some time with exponential backoff
        const backoffTime = Math.min(
          30000,
          1000 * Math.pow(2, authErrorCount.current)
        );
        console.log(`Will try again in ${backoffTime / 1000} seconds`);

        reconnectTimeout.current = setTimeout(() => {
          connectSocket();
        }, backoffTime);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);

        // Only update state if this is the current socket
        if (socket === newSocket) {
          setConnectionStatus("disconnected");
        }

        if (reason === "io server disconnect") {
          // Server force disconnected us, wait a bit before reconnecting
          setTimeout(() => {
            console.log(
              "Server disconnected the client, attempting to reconnect"
            );
            if (!isConnecting.current) {
              newSocket.connect();
            }
          }, 2000);
        } else if (reason === "io client disconnect") {
          // Client disconnected intentionally, don't auto-reconnect
          console.log("Client initiated disconnect, no auto-reconnect");
          isConnecting.current = false;
        }
      });

      const cleanup = () => {
        if (newSocket) {
          if (newSocket.observing) {
            newSocket.emit("leave-observer", {
              sessionId: newSocket.observing,
              observerRoom: `observe:${newSocket.observing}`,
            });
          }

          // Make sure we're not in a connecting state during cleanup
          isConnecting.current = false;

          if (newSocket.connected) {
            newSocket.disconnect();
          }
          console.log("Socket connection cleaned up");
        }

        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
      };

      cleanupRef.current = cleanup;
      return cleanup;
    } catch (err) {
      isConnecting.current = false;
      setError(`Socket initialization error: ${err.message}`);
      console.error("Socket initialization error:", err);
    }
  }, [user?.uid, getIdToken, isAuthenticated]); // Reduced dependencies

  // Stabilize the connectSocket reference
  const stableConnectSocket = useCallback(connectSocket, [connectSocket]);

  // Connect when auth state changes - with stable dependencies
  useEffect(() => {
    console.log("Auth state changed, reconnecting socket");
    const cleanup = stableConnectSocket();

    return () => {
      if (typeof cleanup === "function") {
        cleanup();
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [stableConnectSocket]);

  const reconnect = useCallback(() => {
    console.log("Manual reconnection requested");
    connectSocket();
  }, [connectSocket]);

  const contextValue = {
    socket,
    connectionStatus,
    error,
    isConnected: connectionStatus === "connected",
    reconnect,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === null) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export default SocketContext;
