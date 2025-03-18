import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [error, setError] = useState(null);

  useEffect(() => {
    let clientId = localStorage.getItem("clientId");
    if (!clientId) {
      clientId = uuidv4();
      localStorage.setItem("clientId", clientId);
    }

    try {
      const newSocket = io(
        import.meta.env.VITE_SOCKET_URL || "http://localhost:3000",
        {
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 20000,
          auth: {
            clientId,
          },
        }
      );

      newSocket.on("connect", () => {
        setConnectionStatus("connected");
        setSocket(newSocket);
        console.log("Connected with client ID:", clientId);
      });

      newSocket.on("connect_error", (err) => {
        setConnectionStatus("error");
        setError(`Connection error: ${err.message}`);
        console.error("Socket connection error:", err);
      });

      newSocket.on("reconnect", () => {
        newSocket.observing = null;
      });

      newSocket.on("reconnect_attempt", () => {
        setConnectionStatus("reconnecting");
        console.log("Attempting to reconnect...");
      });

      newSocket.on("disconnect", (reason) => {
        setConnectionStatus("disconnected");
        console.log("Socket disconnected:", reason);

        if (reason === "io server disconnect") {
          newSocket.connect();
        }
      });

      return () => {
        if (newSocket) {
          if (newSocket.observing) {
            newSocket.emit("leave-observer", {
              sessionId: newSocket.observing,
              observerRoom: `observe:${newSocket.observing}`,
            });
          }
          newSocket.disconnect();
        }
      };
    } catch (err) {
      setError(`Socket initialization error: ${err.message}`);
      console.error("Socket initialization error:", err);
    }
  }, []);

  const contextValue = {
    socket,
    connectionStatus,
    error,
    isConnected: connectionStatus === "connected",
    reconnect: () => {
      if (socket) {
        socket.connect();
      }
    },
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
