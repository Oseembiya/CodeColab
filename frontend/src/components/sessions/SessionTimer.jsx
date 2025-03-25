import { useState, useEffect } from "react";
import { useSocket } from "../contexts/SocketContext";
import { Button } from "./ui/Button";

const SessionTimer = ({ sessionId }) => {
  const { socket } = useSocket();
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleExtendSession = () => {
    socket.emit("extend-session", { sessionId });
    setTimeLeft((prev) => prev + 15 * 60); // Add 15 more minutes
  };

  return (
    <div className="session-timer">
      <span>Session time: {formatTime(timeLeft)}</span>
      {timeLeft < 5 * 60 && (
        <Button onClick={handleExtendSession}>Extend Session (+15min)</Button>
      )}
    </div>
  );
};

export default SessionTimer;
