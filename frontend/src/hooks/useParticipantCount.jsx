import { useState, useEffect } from "react";
import { useSocket } from "../contexts/SocketContext";

/**
 * Simple hook to display participant count from server
 * @param {string} sessionId - The ID of the session to track
 * @param {boolean} isObserver - Whether this is an observer (for room joining)
 * @returns {number} - The current participant count
 */
export const useParticipantCount = (sessionId, isObserver = false) => {
  const [count, setCount] = useState(0);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected || !sessionId) return;

    // Join observation room if needed
    if (isObserver) {
      socket.emit("observe-session", { sessionId });
    }

    // Simple handler for participant updates from server
    const handleParticipantUpdate = (data) => {
      if (data.sessionId === sessionId) {
        // Just use the count provided by the server
        setCount(data.count || 0);
      }
    };

    // Listen for updates
    socket.on("participants-update", handleParticipantUpdate);

    // Listen for session ended event to reset count
    socket.on("session-ended", (data) => {
      if (data.sessionId === sessionId) {
        setCount(0);
      }
    });

    // Request initial count
    socket.emit("request-participant-count", { sessionId });

    return () => {
      socket.off("participants-update", handleParticipantUpdate);
      socket.off("session-ended");

      // Leave observer room if needed
      if (isObserver) {
        socket.emit("leave-observer", { sessionId });
      }
    };
  }, [socket, isConnected, sessionId, isObserver]);

  return count;
};

export default useParticipantCount;
