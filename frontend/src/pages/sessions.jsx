import { useState } from "react";
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

const Sessions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    sessions,
    loading,
    error,
    createSession,
    joinSession,
    refreshSessions,
  } = useSessions();
  const { createSession: sessionContextCreateSession } = useSession();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [joinError, setJoinError] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    language: "all",
    dateRange: "all",
    privacy: "all",
  });
  const [view, setView] = useState("grid");

  if (loading) {
    return <div>Loading sessions...</div>;
  }

  if (error) {
    return <div>Error loading sessions: {error.message}</div>;
  }

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      session.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus =
      filters.status === "all" || session.status === filters.status;
    const matchesLanguage =
      filters.language === "all" || session.language === filters.language;
    const matchesPrivacy =
      filters.privacy === "all" ||
      session.isPrivate === (filters.privacy === "private");

    let matchesDate = true;
    if (filters.dateRange !== "all") {
      const sessionDate = new Date(session.startTime);
      const now = new Date();
      switch (filters.dateRange) {
        case "today":
          matchesDate = sessionDate.toDateString() === now.toDateString();
          break;
        case "week":
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          matchesDate = sessionDate >= weekAgo;
          break;
        case "month":
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
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

  const uniqueSessions = Array.from(
    new Map(filteredSessions.map((session) => [session.id, session])).values()
  );

  const handleCreateSession = async (sessionData) => {
    try {
      const sessionId = await sessionContextCreateSession(sessionData);
      setShowCreateModal(false);
      navigate(`/dashboard/sessions/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const handleJoinSession = async (joinCodeOrSessionId) => {
    try {
      let targetSessionId = null;
      let joinCode = null;

      // Determine if we're joining by code or by session ID
      if (selectedSessionId) {
        // If a session is already selected, the parameter is just the join code
        targetSessionId = selectedSessionId;
        joinCode = joinCodeOrSessionId;
      } else {
        // If no session is selected, we need to find it by join code
        joinCode = joinCodeOrSessionId;
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

      // Now that we have a session ID, store join info
      if (joinCode && targetSessionId) {
        localStorage.setItem(
          "lastJoinedSession",
          JSON.stringify({
            id: targetSessionId,
            joinCode: joinCode.toUpperCase(),
          })
        );
      }

      const result = await joinSession(targetSessionId, joinCode);

      // Clear UI states after successful join
      setShowJoinModal(false);
      setSelectedSessionId(null);
      setJoinError("");

      // Navigate to session
      navigate(`/dashboard/sessions/${targetSessionId}`);
    } catch (error) {
      console.error("Failed to join session:", error);
      setJoinError(error.message);
      // Clean up stored join info on error
      localStorage.removeItem("lastJoinedSession");
    }
  };

  const openJoinModal = (sessionId = null) => {
    setSelectedSessionId(sessionId);
    setShowJoinModal(true);
    setJoinError("");
  };

  const initiateJoinSession = (sessionId) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      setJoinError("Session not found");
      return;
    }

    if (session.isPrivate) {
      openJoinModal(sessionId);
    } else {
      handleJoinSession(sessionId);
    }
  };

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
            <button
              className="join-session-btn"
              onClick={() => openJoinModal()}
            >
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
          {uniqueSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isOwner={session.ownerId === user.uid}
              onJoin={() => initiateJoinSession(session.id)}
              view={view}
            />
          ))}
        </div>
      </div>

      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
        />
      )}

      <JoinSessionModal
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setSelectedSessionId(null);
          setJoinError("");
        }}
        onJoin={handleJoinSession}
        error={joinError}
        sessionId={selectedSessionId}
      />
    </div>
  );
};

export default Sessions;
