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

  // Add ref to prevent duplicate connection logs
  const connectionLogged = useRef(false);

  // Cleanup function reference
  const cleanupRef = useRef(null);

  // Helper to handle auth token fetch with quota management
  const getAuthToken = useCallback(async () => {
    // Check quota
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAuthAttempt.current;

    // Implement exponential backoff if we've had multiple errors
    const backoffTime = Math.min(
      30000,
      1000 * Math.pow(2, authErrorCount.current)
    );

    if (authErrorCount.current > 0 && timeSinceLastAttempt < backoffTime) {
      console.warn(
        `Skipping auth token request due to previous errors. Will retry after ${
          (backoffTime - timeSinceLastAttempt) / 1000
        } seconds.`
      );
      return null;
    }

    // Update last attempt time
    lastAuthAttempt.current = now;

    if (!getIdToken) {
      console.warn("getIdToken function not available");
      authErrorCount.current += 1;
      return null;
    }

    try {
      const token = await getIdToken(true);
      // Reset error count on success
      authErrorCount.current = 0;
      return token;
    } catch (err) {
      console.error("Error getting auth token:", err);
      authErrorCount.current += 1;
      return null;
    }
  }, [getIdToken]);

  // Function to connect to socket
  const connectSocket = useCallback(async () => {
    // Prevent multiple simultaneous connections
    if (isConnecting.current) {
      console.log("Socket connection already in progress");
      return () => {};
    }

    // Throttle reconnection attempts if we're connecting too frequently
    const now = Date.now();
    const timeSinceLastConnect = now - lastConnectTime.current;
    if (connectCount.current > 3 && timeSinceLastConnect < 5000) {
      console.warn(
        `Throttling socket connection attempts. ${Math.ceil(
          (5000 - timeSinceLastConnect) / 1000
        )} seconds remaining until next attempt.`
      );
      return () => {};
    }

    connectCount.current += 1;
    lastConnectTime.current = now;
    isConnecting.current = true;

    // Disconnect existing socket if any
    if (socket && socket.connected) {
      console.log("Disconnecting existing socket connection");
      socket.disconnect();
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
      const socketUrl =
        config.api.socketUrl || "https://codecolab-852p.onrender.com";

      // Socket.io connection options
      const socketOptions = {
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: config.socket.reconnectionAttempts,
        reconnectionDelay: config.socket.reconnectionDelay,
        reconnectionDelayMax: config.socket.reconnectionDelayMax,
        timeout: 60000,
        forceNew: true,
        autoConnect: true,
        path: "/socket.io/",
        auth: authData,
      };

      console.log(
        `Connecting to socket server at ${socketUrl} with transports: ${socketOptions.transports.join(
          ", "
        )}`
      );

      // Create new socket connection
      const newSocket = io(socketUrl, socketOptions);

      newSocket.on("connect", () => {
        if (!connectionLogged.current) {
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

          // Set the flag to prevent duplicate logs
          connectionLogged.current = true;
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

        // Reset the connection logged flag
        connectionLogged.current = false;

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

          // Reset the connection logged flag during cleanup
          connectionLogged.current = false;

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
      return () => {}; // Return empty cleanup function in case of error
    }
  }, [socket, user?.uid, getAuthToken, isAuthenticated]);

  // Connect when auth state changes
  useEffect(() => {
    console.log("Auth state changed, reconnecting socket");
    const cleanup = connectSocket();

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
  }, [connectSocket]);

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
