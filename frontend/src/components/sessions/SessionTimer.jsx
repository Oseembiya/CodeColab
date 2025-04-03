import PropTypes from "prop-types";
import { useState, useEffect, useRef } from "react";
import { FaClock, FaHourglassHalf, FaPlus } from "react-icons/fa";

// Define propTypes outside the component
const sessionTimerPropTypes = {
  sessionId: PropTypes.string.isRequired,
  className: PropTypes.string,
};

const SessionTimer = ({ sessionId, className = "" }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(null);
  const [extensionsUsed, setExtensionsUsed] = useState(0);
  const [extensionsRemaining, setExtensionsRemaining] = useState(2);
  const [canExtend, setCanExtend] = useState(true);
  const [extendLoading, setExtendLoading] = useState(false);

  // Hold absolute end time for more accurate time calculation
  const scheduledEndTimeRef = useRef(null);
  // Store time offset between server and client
  const timeOffsetRef = useRef(0);
  // Track if we've initialized the timer
  const initializedRef = useRef(false);
  // Reference for animation frame
  const animationFrameRef = useRef(null);
  // Last time an update was performed
  const lastUpdateTimeRef = useRef(0);
  // Flag for unmounting
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    if (!socket || !sessionId) return;

    // Initial time info request
    socket.emit("get-session-time", { sessionId });

    // Listen for time updates from server
    socket.on("session-time-info", (data) => {
      // Calculate time offset (server time - client time)
      const serverTime = data.serverTime;
      const clientTime = new Date().getTime();
      timeOffsetRef.current = serverTime - clientTime;

      // Store the absolute end time - this is the key to accurate time sync
      scheduledEndTimeRef.current = data.scheduledEndTime;

      // Set state vars based on server data
      setExtensionsUsed(data.extensionsUsed || 0);
      setExtensionsRemaining(
        data.extensionsRemaining || 2 - (data.extensionsUsed || 0)
      );
      setCanExtend(data.canExtend);

      // Update initialized flag so we process updates
      initializedRef.current = true;

      // Get accurate time remaining based on server's end time
      updateRemainingTime();
    });

    // Listen for session extension updates
    socket.on("session-extended", (data) => {
      // When a session is extended, update the scheduled end time
      if (data.scheduledEndTime) {
        scheduledEndTimeRef.current = data.scheduledEndTime;

        // If server sent time offset info, update that too
        if (data.serverTime) {
          const clientTime = new Date().getTime();
          timeOffsetRef.current = data.serverTime - clientTime;
        }
      }

      // Set UI state based on server data
      setExtensionsUsed(data.extensionsUsed);
      setExtensionsRemaining(data.extensionsRemaining);
      setCanExtend(data.extensionsRemaining > 0);
      setExtendLoading(false);

      // Calculate new time from end time
      updateRemainingTime();
    });

    // Listen for extension failures
    socket.on("session-extension-failed", (data) => {
      console.error("Session extension failed:", data.reason);
      setExtendLoading(false);
    });

    // Listen for session ending soon warning
    socket.on("session-ending-soon", (data) => {
      // Update can extend flag
      setCanExtend(data.canExtend);
    });

    // Function to calculate time left based on scheduled end time
    const updateRemainingTime = () => {
      if (!scheduledEndTimeRef.current || !initializedRef.current) return;

      // Get current time adjusted for server-client offset
      const now = new Date().getTime() + timeOffsetRef.current;

      // Calculate milliseconds remaining
      const msRemaining = Math.max(0, scheduledEndTimeRef.current - now);

      // Convert to minutes with decimal
      const minutesRemaining = msRemaining / 60000;

      // Set time left for display
      setTimeLeft(minutesRemaining);
    };

    // OPTIMIZATION: Use requestAnimationFrame instead of setInterval
    // This is more performance-friendly and avoids timer violations
    const updateTimerLoop = (timestamp) => {
      // Skip if component is unmounting
      if (isUnmountingRef.current) return;

      // Throttle updates to once per second (1000ms)
      if (
        !lastUpdateTimeRef.current ||
        timestamp - lastUpdateTimeRef.current >= 1000
      ) {
        updateRemainingTime();
        lastUpdateTimeRef.current = timestamp;
      }

      // Continue the loop
      animationFrameRef.current = requestAnimationFrame(updateTimerLoop);
    };

    // Start the animation frame loop
    animationFrameRef.current = requestAnimationFrame(updateTimerLoop);

    return () => {
      // Set unmounting flag
      isUnmountingRef.current = true;

      // Remove socket listeners
      socket.off("session-time-info");
      socket.off("session-extended");
      socket.off("session-extension-failed");
      socket.off("session-ending-soon");

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [socket, sessionId]);

  // Periodically re-sync with server (every minute) to prevent drift
  useEffect(() => {
    if (!socket || !sessionId) return;

    let syncTimeoutId;

    const syncWithServer = () => {
      socket.emit("get-session-time", { sessionId });
      // Schedule next sync
      syncTimeoutId = setTimeout(syncWithServer, 60000); // Sync every minute
    };

    // Start the sync cycle
    syncTimeoutId = setTimeout(syncWithServer, 60000);

    return () => {
      if (syncTimeoutId) {
        clearTimeout(syncTimeoutId);
      }
    };
  }, [socket, sessionId]);

  // Set unmounting flag on component unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;
    };
  }, []);

  const handleExtendSession = () => {
    if (!canExtend || extendLoading || !socket || !user) return;

    setExtendLoading(true);
    socket.emit("extend-session", {
      sessionId,
      userId: user.uid,
    });
  };

  // Don't render anything if we don't have time info yet
  if (timeLeft === null) return null;

  // Format the time remaining
  const formatTime = (minutes) => {
    const wholeMinutes = Math.floor(minutes);
    const seconds = Math.floor((minutes - wholeMinutes) * 60);
    return `${wholeMinutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Determine color based on time left
  const getTimerColor = () => {
    if (timeLeft <= 5) return "text-red-600";
    if (timeLeft <= 10) return "text-orange-500";
    return "text-green-600";
  };

  // Compact single-line design
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`flex items-center ${getTimerColor()}`}>
        <FaClock size={12} />
        <span className="font-mono ml-1">{formatTime(timeLeft)}</span>
        <span className="text-xs text-gray-400 ml-1 hidden sm:inline">
          remaining
        </span>
      </div>

      {extensionsRemaining > 0 && (
        <button
          onClick={handleExtendSession}
          disabled={!canExtend || extendLoading}
          className={`ml-2 text-xs px-1 ${
            canExtend && !extendLoading
              ? "text-blue-500 hover:text-blue-700"
              : "opacity-60 cursor-not-allowed"
          }`}
          title={`Extend session by 15 minutes (${extensionsRemaining} extensions remaining)`}
        >
          {extendLoading ? (
            <FaHourglassHalf size={10} className="animate-spin mr-1 inline" />
          ) : (
            <FaPlus size={10} className="mr-1 inline" />
          )}
          Extend
        </button>
      )}
    </div>
  );
};

// Assign propTypes to component
SessionTimer.propTypes = sessionTimerPropTypes;

export default SessionTimer;
