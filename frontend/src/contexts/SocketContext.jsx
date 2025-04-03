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

// Create context
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState(null);
  const { user, getIdToken, isAuthenticated } = useAuth();

  // Refs to prevent issues with stale closures and tracking connection state
  const reconnectTimeout = useRef(null);
  const isConnecting = useRef(false);
  const connectionAttempts = useRef(0);
  const lastConnectTime = useRef(0);

  // Connect to socket with authentication token
  const connectSocket = useCallback(async () => {
    // Prevent multiple concurrent connection attempts
    if (isConnecting.current) {
      console.log("Connection already in progress");
      return;
    }

    // Apply connection throttling if needed
    const now = Date.now();
    const timeSinceLastConnect = now - lastConnectTime.current;

    if (connectionAttempts.current > 3 && timeSinceLastConnect < 5000) {
      console.warn(
        `Throttling socket connection attempts. Will try again in ${Math.ceil(
          (5000 - timeSinceLastConnect) / 1000
        )} seconds`
      );

      // Schedule a retry after cooldown
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      reconnectTimeout.current = setTimeout(() => {
        connectionAttempts.current = 0;
        connectSocket();
      }, 5000 - timeSinceLastConnect);

      return;
    }

    isConnecting.current = true;
    connectionAttempts.current++;
    lastConnectTime.current = now;

    try {
      // Clean up existing socket if there is one
      if (socket && socket.connected) {
        console.log("Disconnecting existing socket connection");
        socket.disconnect();
        // Small delay to ensure clean disconnection
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Get or create client ID for persistent identity
      let clientId = localStorage.getItem("clientId");
      if (!clientId) {
        clientId = uuidv4();
        localStorage.setItem("clientId", clientId);
      }

      // Prepare auth data with client ID
      const authData = {
        clientId,
        isGuest: !isAuthenticated, // Explicitly mark as guest if not authenticated
      };

      // Add authentication token if user is logged in
      if (isAuthenticated && user && getIdToken) {
        try {
          console.log("Attempting to get auth token...");
          const token = await getIdToken(true);
          console.log(
            `Token obtained: ${token ? "yes" : "no"}, length: ${
              token?.length || 0
            }`
          );

          if (token) {
            authData.token = token;
            authData.userId = user?.uid;
            authData.username = user?.displayName || "Anonymous";
            console.log("Authentication token acquired for socket connection");
            console.log(
              `User details: uid=${user.uid}, displayName=${
                user.displayName || "not set"
              }`
            );
          } else {
            console.warn(
              "Token retrieval returned null despite authenticated user"
            );
          }
        } catch (tokenErr) {
          console.error("Error getting auth token:", tokenErr);
        }
      } else {
        // For guests or not yet authenticated users
        console.log("Connecting as guest or auth not ready:", {
          isAuthenticated,
          hasUser: !!user,
          hasGetIdToken: !!getIdToken,
        });

        authData.mode = "guest";
        authData.guestId = clientId;
      }

      // Socket.io connection options
      const socketOptions = {
        transports: ["polling"], // Use only polling since WebSockets are failing
        reconnection: true,
        reconnectionAttempts: config.socketReconnectionAttempts,
        reconnectionDelay: config.socketReconnectionDelay,
        reconnectionDelayMax: config.socketReconnectionDelayMax,
        timeout: 20000,
        forceNew: true,
        auth: authData,
        path: config.socketPath,
        withCredentials: true,
        autoConnect: false,
      };

      // Create socket connection
      const socketUrl =
        config.socketUrl || "https://codecolab-852p.onrender.com";
      console.log(`Connecting to socket server at ${socketUrl}`);
      console.log("Connection options:", {
        transports: socketOptions.transports,
        auth: {
          hasToken: !!authData.token,
          userId: authData.userId,
          isGuest: authData.isGuest,
          clientId: authData.clientId,
        },
        path: socketOptions.path,
      });

      const newSocket = io(socketUrl, socketOptions);

      // Attempt connection
      newSocket.connect();

      // Connection event handlers
      newSocket.on("connect", () => {
        console.log("Connected with client ID:", clientId);
        console.log("Transport used:", newSocket.io.engine.transport.name);

        if (authData.token) {
          console.log("Authenticated socket connection established");
        } else {
          console.log("Unauthenticated socket connection established");
        }

        setSocket(newSocket);
        setConnectionStatus("connected");
        setError(null);
        isConnecting.current = false;
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
        setError(`Connection error: ${err.message}`);
        setConnectionStatus("error");
        isConnecting.current = false;
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setConnectionStatus("disconnected");

        if (reason === "io client disconnect") {
          // Intentional client disconnect, don't auto-reconnect
          console.log("Client initiated disconnect, no auto-reconnect");
          isConnecting.current = false;
        }
      });

      // Clean up function
      return () => {
        if (newSocket) {
          if (newSocket.connected) {
            newSocket.disconnect();
          }
          console.log("Socket connection cleaned up");
        }
      };
    } catch (err) {
      console.error("Socket initialization error:", err);
      setError(`Socket initialization error: ${err.message}`);
      setConnectionStatus("error");
      isConnecting.current = false;
      return () => {}; // Empty cleanup function
    }
  }, [socket, user?.uid, getIdToken, isAuthenticated]);

  // Connect/reconnect when auth state changes
  useEffect(() => {
    console.log("Auth state changed, connecting socket");
    console.log("Auth status:", {
      isAuthenticated,
      hasUser: !!user,
      hasGetIdToken: !!getIdToken,
    });

    // Only proceed if we have a definitive auth state (true or false, not undefined)
    // And if authenticated, ensure we have the necessary auth functions
    if (typeof isAuthenticated === "undefined") {
      console.log("Authentication state not yet determined, waiting...");
      return;
    }

    // If authenticated, ensure we have user and getIdToken function
    if (isAuthenticated && (!user || !getIdToken)) {
      console.log("Authenticated but user or getIdToken not ready, waiting...");
      return;
    }

    // Debounce reconnection to prevent rapid reconnection attempts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    reconnectTimeout.current = setTimeout(() => {
      const cleanup = connectSocket();

      return () => {
        if (typeof cleanup === "function") {
          cleanup();
        }
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
      };
    }, 300);

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [isAuthenticated, user, getIdToken, connectSocket]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log("Manual reconnection initiated");
    connectSocket();
  }, [connectSocket]);

  // Context value
  const contextValue = {
    socket,
    connectionStatus,
    isConnected: connectionStatus === "connected",
    error,
    reconnect,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook for using socket
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

export default SocketContext;
