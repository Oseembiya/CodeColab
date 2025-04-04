import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaSearch,
  FaFilter,
  FaClock,
  FaUsers,
  FaCode,
  FaCalendar,
  FaLock,
  FaLockOpen,
} from "react-icons/fa";
import CreateSessionModal from "../components/sessions/CreateSessionModal";
import JoinSessionModal from "../components/sessions/JoinSessionModal";
import SessionCard from "../components/sessions/SessionCard";
import SessionFilters from "../components/sessions/SessionFilters";
import { useAuth } from "../hooks/useAuth";
import { useSessions } from "../hooks/useSessions";
import { useSession } from "../contexts/SessionContext";
import PropTypes from "prop-types";

// Helper function for filtering sessions - placed outside the component
const filterSessions = (allSessions, filters) => {
  if (!allSessions || !Array.isArray(allSessions)) return [];

  return allSessions.filter((session) => {
    // Skip null or invalid sessions
    if (!session || !session.id) return false;

    const matchesSearch =
      session.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
      session.description?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesStatus =
      filters.status === "all" ||
      session.status === filters.status ||
      (filters.status === "completed" && session.status === "ended");

    const matchesLanguage =
      filters.language === "all" || session.language === filters.language;

    const matchesPrivacy =
      filters.privacy === "all" ||
      Boolean(session.isPrivate) === (filters.privacy === "private");

    let matchesDate = true;
    if (filters.dateRange !== "all" && session.startTime) {
      const sessionDate = new Date(session.startTime);
      const now = new Date();
      switch (filters.dateRange) {
        case "today":
          matchesDate = sessionDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = sessionDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          matchesDate = sessionDate >= monthAgo;
          break;
        default:
          break;
      }
    }

    return (
      matchesSearch &&
      matchesStatus &&
      matchesLanguage &&
      matchesPrivacy &&
      matchesDate
    );
  });
};

// Make SessionList a separate component that can be memoized
const SessionList = React.memo(({ sessions, user, view, onJoinSession }) => {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="no-sessions-message">
        <p>No sessions found. Create a new session to get started!</p>
      </div>
    );
  }

  return sessions.map((session) => {
    // Safety check to avoid passing null/undefined sessions to SessionCard
    if (!session || !session.id) return null;

    return (
      <SessionCard
        key={session.id}
        session={{
          ...session,
          participants: session.participants || [],
          maxParticipants: parseInt(session.maxParticipants) || 10,
          isPrivate: Boolean(session.isPrivate),
          language: session.language || "javascript",
          status: session.status || "active",
        }}
        isOwner={(user && session.hostId === user.uid) || false}
        onJoin={() => onJoinSession(session.id)}
        view={view}
      />
    );
  });
});

// Ensure SessionList has proper propTypes
SessionList.propTypes = {
  sessions: PropTypes.array,
  user: PropTypes.object,
  view: PropTypes.string.isRequired,
  onJoinSession: PropTypes.func.isRequired,
};

// LoadingIndicator as a separate component
const LoadingIndicator = () => (
  <div className="loading-container">
    <div className="loading-indicator"></div>
    <p>Loading sessions...</p>
  </div>
);

// ErrorDisplay as a separate component
const ErrorDisplay = ({ message }) => (
  <div className="error-container">
    <p>Error loading sessions: {message}</p>
  </div>
);

ErrorDisplay.propTypes = {
  message: PropTypes.string.isRequired,
};

// Main Sessions component
const Sessions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    sessions = [],
    loading = false,
    error = null,
    createSession,
    joinSession,
    refreshSessions,
  } = useSessions();
  const { createSession: sessionContextCreateSession } = useSession();

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [view, setView] = useState("grid");

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    language: "all",
    dateRange: "all",
    privacy: "all",
  });

  // Derived state - computed with memoization to avoid unnecessary calculations
  const [filteredSessions, setFilteredSessions] = useState([]);

  // Update filtered sessions whenever original sessions or filters change
  useEffect(() => {
    const filtered = filterSessions(sessions, filters);
    setFilteredSessions(filtered);
  }, [sessions, filters]);

  // Session creation handler
  const handleCreateSession = useCallback(
    async (sessionData) => {
      try {
        const sessionId = await sessionContextCreateSession(sessionData);
        setShowCreateModal(false);
        navigate(`/session/${sessionId}`);
      } catch (error) {
        console.error("Failed to create session:", error);
      }
    },
    [sessionContextCreateSession, navigate]
  );

  // Session joining handlers
  const handleJoinSessionDirect = useCallback(
    async (sessionId) => {
      try {
        await joinSession(sessionId);
        navigate(`/session/${sessionId}`);
      } catch (error) {
        console.error("Failed to join session:", error);
        setJoinError(error.message);
      }
    },
    [joinSession, navigate]
  );

  const initiateJoinSession = useCallback(
    (sessionId) => {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) {
        setJoinError("Session not found");
        return;
      }

      // Check if session is scheduled for the future
      if (session.status === "scheduled") {
        const scheduledTime = new Date(session.startTime);
        const now = new Date();

        if (scheduledTime > now) {
          const formattedDate = scheduledTime.toLocaleString();
          setJoinError(
            `This session is scheduled for ${formattedDate}. Please join at the scheduled time.`
          );
          return;
        }
      }

      if (session.isPrivate) {
        // For private sessions, open the modal to enter join code
        setSelectedSessionId(sessionId);
        setShowJoinModal(true);
        setJoinError("");
      } else {
        // For public sessions, directly join with the session ID
        handleJoinSessionDirect(sessionId);
      }
    },
    [sessions, handleJoinSessionDirect]
  );

  const handleJoinSession = useCallback(
    async (joinCode) => {
      try {
        let targetSessionId = null;

        // If we have a selected session ID, use it
        if (selectedSessionId) {
          targetSessionId = selectedSessionId;
        } else {
          // Otherwise, find session by join code
          const matchingSession = sessions.find(
            (s) =>
              s.isPrivate &&
              s.joinCode &&
              s.joinCode.toUpperCase() === joinCode.toUpperCase()
          );

          if (matchingSession) {
            targetSessionId = matchingSession.id;
          } else {
            throw new Error("No session found with this join code");
          }
        }

        // Store join info in local storage
        localStorage.setItem(
          "lastJoinedSession",
          JSON.stringify({
            id: targetSessionId,
            joinCode: joinCode.toUpperCase(),
          })
        );

        await joinSession(targetSessionId, joinCode);

        // Clear UI states
        setShowJoinModal(false);
        setSelectedSessionId(null);
        setJoinError("");

        // Navigate to session
        navigate(`/session/${targetSessionId}`);
      } catch (error) {
        console.error("Failed to join session:", error);
        setJoinError(error.message);
        localStorage.removeItem("lastJoinedSession");
      }
    },
    [selectedSessionId, sessions, joinSession, navigate]
  );

  const handleOpenJoinModal = useCallback(() => {
    setSelectedSessionId(null);
    setShowJoinModal(true);
    setJoinError("");
  }, []);

  const handleCloseJoinModal = useCallback(() => {
    setShowJoinModal(false);
    setSelectedSessionId(null);
    setJoinError("");
  }, []);

  // Render different UI states
  if (loading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <ErrorDisplay message={error.message || "Unknown error"} />;
  }

  return (
    <div className="sessions-container">
      <div className="sticky-container">
        {/* Header */}
        <div className="sessions-page-header">
          <div className="header-left">
            <h1>Coding Sessions</h1>
            <div className="view-toggle">
              <button
                className={view === "grid" ? "active" : ""}
                onClick={() => setView("grid")}
              >
                Grid
              </button>
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                List
              </button>
            </div>
            <button
              className="refresh-button"
              onClick={refreshSessions}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <div className="header-actions">
            <button className="join-session-btn" onClick={handleOpenJoinModal}>
              <FaUsers /> Join private Session
            </button>
            <button
              className="create-session-btn"
              onClick={() => setShowCreateModal(true)}
            >
              <FaPlus /> New Session
            </button>
          </div>
        </div>

        {/* Filters */}
        <SessionFilters filters={filters} onFilterChange={setFilters} />
      </div>

      {/* Sessions Grid Container */}
      <div className="sessions-grid-container">
        <div className={`sessions-${view}`}>
          <SessionList
            sessions={filteredSessions}
            user={user}
            view={view}
            onJoinSession={initiateJoinSession}
          />
        </div>
      </div>

      {/* Modals - only render when needed */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
        />
      )}

      {showJoinModal && (
        <JoinSessionModal
          isOpen={true}
          onClose={handleCloseJoinModal}
          onJoin={handleJoinSession}
          error={joinError}
          sessionId={selectedSessionId}
        />
      )}
    </div>
  );
};

export default Sessions;
