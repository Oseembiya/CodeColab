import { createContext, useContext, useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const SessionContext = createContext();

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};

export const SessionProvider = ({ children }) => {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simulated fetch sessions (would connect to backend API in production)
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          setSessions([]);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  // Create a new session
  const createSession = async (sessionData) => {
    const sessionId = uuidv4();
    const newSession = {
      id: sessionId,
      title: sessionData.title || "Untitled Session",
      description: sessionData.description || "",
      language: sessionData.language || "javascript",
      createdAt: new Date().toISOString(),
      createdBy: sessionData.userId || "anonymous",
      participants: [sessionData.userId || "anonymous"],
      status: "active",
    };

    // In production, this would be an API call to create the session
    setSessions((prevSessions) => [...prevSessions, newSession]);

    return sessionId;
  };

  // Join an existing session
  const joinSession = async (sessionId, userId) => {
    // In production, this would be an API call to join the session
    setCurrentSession(sessionId);

    return sessionId;
  };

  // Leave the current session
  const leaveSession = async () => {
    setCurrentSession(null);
  };

  const value = {
    sessions,
    currentSession,
    loading,
    createSession,
    joinSession,
    leaveSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export default SessionContext;
