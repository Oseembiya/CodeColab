import { useState, useEffect, useRef } from "react";
import { useSocket } from "../contexts/SocketContext";

/**
 * Custom hook for tracking participant count in sessions
 * @param {string} sessionId - The ID of the session to track
 * @param {number} initialCount - Initial count to use (from session.participants?.length)
 * @param {number} maxParticipants - Max participants allowed in session
 * @param {boolean} isObserver - Whether this is an observer or participant
 * @returns {number} - The current participant count
 */
export const useParticipantCount = (
  sessionId,
  initialCount = 0,
  maxParticipants = 10,
  isObserver = false
) => {
  const [count, setCount] = useState(initialCount);
  const { socket, isConnected } = useSocket();
  const lastRequestTime = useRef(0);
  const refreshTimeoutRef = useRef(null);

  useEffect(() => {
    if (!socket || !isConnected || !sessionId) return;

    // Helper function to request a count update
    const requestCount = () => {
      if (socket.connected) {
        socket.emit("request-participant-count", { sessionId });
        lastRequestTime.current = Date.now();
      }
    };

    // Join observation room if needed
    if (isObserver) {
      socket.emit("observe-session", {
        sessionId,
      });
    }

    // Request initial count
    requestCount();

    // Handler for participant updates
    const handleParticipantUpdate = ({
      sessionId: updatedSessionId,
      participants,
      count: newCount,
    }) => {
      if (updatedSessionId !== sessionId) return;

      console.log("Received participant update:", {
        sessionId: updatedSessionId,
        count: newCount,
        participants: participants?.length || 0,
      });

      // Calculate the actual count to use
      const actualCount =
        typeof newCount === "number"
          ? Math.min(Math.max(0, newCount), maxParticipants) // Bound count between 0 and max
          : participants?.length || 0;

      setCount(actualCount);
    };

    // Event handlers for various participant change events
    const handleUserJoined = ({ sessionId: updatedSessionId }) => {
      if (updatedSessionId === sessionId) {
        console.log(
          `User joined session ${sessionId}, requesting updated count`
        );
        requestCount();
      }
    };

    const handleUserLeft = ({ sessionId: updatedSessionId }) => {
      if (updatedSessionId === sessionId) {
        console.log(`User left session ${sessionId}, requesting updated count`);
        requestCount();
      }
    };

    // Register event listeners
    socket.on("participants-update", handleParticipantUpdate);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("user-left-session", handleUserLeft);

    // Setup periodic refresh (every 10 seconds)
    const refreshInterval = setInterval(() => {
      const now = Date.now();
      // Only request if at least 10 seconds have passed since last request
      if (now - lastRequestTime.current > 10000) {
        requestCount();
      }
    }, 10000);

    // Cleanup function
    return () => {
      socket.off("participants-update", handleParticipantUpdate);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("user-left-session", handleUserLeft);

      if (isObserver) {
        socket.emit("leave-observer", { sessionId });
      }

      clearInterval(refreshInterval);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [socket, isConnected, sessionId, maxParticipants, isObserver]);

  return count;
};

export default useParticipantCount;
