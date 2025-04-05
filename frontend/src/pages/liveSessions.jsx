import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaPlus,
  FaUsers,
  FaClock,
  FaLock,
  FaUnlock,
  FaTh,
  FaList,
  FaSync,
  FaSearch,
  FaUserPlus,
} from "react-icons/fa";
import { useSession } from "../contexts/SessionContext";
import "../styles/pages/LiveSessions.css";

// Mock data for sessions - in production would come from API/backend
const MOCK_SESSIONS = [
  {
    id: "s1",
    name: "Quick Collaboration Session",
    description: "A quick session for real-time collaboration",
    status: "active",
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    participants: 2,
    language: "javascript",
    isPublic: true,
  },
  {
    id: "s2",
    name: "React Component Workshop",
    description: "Building reusable React components",
    status: "active",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    participants: 4,
    language: "javascript",
    isPublic: true,
  },
  {
    id: "s3",
    name: "Algorithm Practice",
    description: "Working on sorting algorithms and data structures",
    status: "ended",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    participants: 1,
    language: "python",
    isPublic: true,
  },
  {
    id: "s4",
    name: "Private Code Review",
    description: "Code review for our team project",
    status: "active",
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    participants: 3,
    language: "java",
    isPublic: false,
  },
  {
    id: "s5",
    name: "Backend API Development",
    description: "Creating RESTful APIs with Express",
    status: "ended",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    participants: 2,
    language: "javascript",
    isPublic: true,
  },
  {
    id: "s6",
    name: "CSS Animation Tutorial",
    description: "Learning advanced CSS animations",
    status: "active",
    createdAt: new Date(Date.now() - 20 * 60 * 1000),
    participants: 8,
    language: "html/css",
    isPublic: true,
  },
];

// Filter options for dropdowns
const STATUS_OPTIONS = ["All Status", "Active", "Ended"];
const LANGUAGE_OPTIONS = [
  "All Languages",
  "JavaScript",
  "Python",
  "Java",
  "C#",
  "HTML/CSS",
];
const TIME_OPTIONS = ["All Time", "Last Hour", "Today", "This Week"];
const SESSION_TYPE_OPTIONS = [
  "All Sessions",
  "My Sessions",
  "Public",
  "Private",
];

// Session Card Component
const SessionCard = ({ session, onJoin, onViewDetails }) => {
  const formatTime = (date) => {
    return date.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="session-card">
      <div className="session-header">
        <h3>{session.name}</h3>
        <span className={`status-tag ${session.status}`}>{session.status}</span>
      </div>

      <div className="session-description">{session.description}</div>

      <div className="session-details">
        <div className="detail-item">
          <FaClock /> {formatTime(session.createdAt)}
        </div>
        <div className="detail-item">
          <FaUsers /> {session.participants} Participated
        </div>
        <div className="detail-item language">
          <code>{session.language}</code>
        </div>
        <div className="detail-item visibility">
          {session.isPublic ? (
            <>
              <FaUnlock /> Public
            </>
          ) : (
            <>
              <FaLock /> Private
            </>
          )}
        </div>
      </div>

      <div className="session-actions">
        <button
          className={`session-action-button ${
            session.status === "ended" ? "disabled" : ""
          }`}
          onClick={() => session.status !== "ended" && onJoin(session.id)}
          disabled={session.status === "ended"}
        >
          {session.status === "ended" ? "Completed" : "Join Session"}
        </button>
      </div>
    </div>
  );
};

// Join Private Session Modal
const JoinPrivateSessionModal = ({ onClose, onJoin }) => {
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sessionId.trim()) {
      setError("Please enter a session ID");
      return;
    }
    onJoin(sessionId);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Join Private Session</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="sessionId">Session ID</label>
            <input
              type="text"
              id="sessionId"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter the session ID"
              required
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="button alternative"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="button">
              Join Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Session Modal (reused from Dashboard)
const CreateSessionModal = ({ onClose, onSubmit }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      language,
      isPublic,
      userId: "user-123", // placeholder, would come from auth
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Create New Session</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Session Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your session"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (optional)</label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the session"
            />
          </div>
          <div className="form-group">
            <label htmlFor="language">Programming Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="csharp">C#</option>
              <option value="html/css">HTML/CSS</option>
            </select>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Make this session public
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="button alternative"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="button">
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main LiveSessions Component
const LiveSessions = () => {
  const navigate = useNavigate();
  const { createSession } = useSession();

  // State for sessions and filters
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [languageFilter, setLanguageFilter] = useState("All Languages");
  const [timeFilter, setTimeFilter] = useState("All Time");
  const [sessionTypeFilter, setSessionTypeFilter] = useState("All Sessions");

  // UI states
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch sessions - in production this would be an API call
  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
      setSessions(MOCK_SESSIONS);
      setFilteredSessions(MOCK_SESSIONS);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Apply filters when any filter changes
  useEffect(() => {
    if (sessions.length === 0) return;

    let filtered = [...sessions];

    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(
        (session) =>
          session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "All Status") {
      const status = statusFilter.toLowerCase();
      filtered = filtered.filter((session) => session.status === status);
    }

    // Apply language filter
    if (languageFilter !== "All Languages") {
      const language = languageFilter.toLowerCase();
      filtered = filtered.filter(
        (session) => session.language.toLowerCase() === language
      );
    }

    // Apply time filter
    if (timeFilter !== "All Time") {
      const now = new Date();
      let timeThreshold = new Date();

      if (timeFilter === "Last Hour") {
        timeThreshold.setHours(now.getHours() - 1);
      } else if (timeFilter === "Today") {
        timeThreshold.setHours(0, 0, 0, 0);
      } else if (timeFilter === "This Week") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        timeThreshold = new Date(now.setDate(diff));
        timeThreshold.setHours(0, 0, 0, 0);
      }

      filtered = filtered.filter(
        (session) => session.createdAt >= timeThreshold
      );
    }

    // Apply session type filter
    if (sessionTypeFilter !== "All Sessions") {
      if (sessionTypeFilter === "Public") {
        filtered = filtered.filter((session) => session.isPublic);
      } else if (sessionTypeFilter === "Private") {
        filtered = filtered.filter((session) => !session.isPublic);
      } else if (sessionTypeFilter === "My Sessions") {
        // In production, would filter based on user ID
        filtered = filtered.filter(
          (session) => session.id === "s1" || session.id === "s4"
        );
      }
    }

    setFilteredSessions(filtered);
  }, [
    sessions,
    searchQuery,
    statusFilter,
    languageFilter,
    timeFilter,
    sessionTypeFilter,
  ]);

  // Handle refresh button click
  const handleRefresh = () => {
    setIsLoading(true);
    // In production, this would fetch fresh data from the API
    setTimeout(() => {
      setSessions(MOCK_SESSIONS);
      setIsLoading(false);
    }, 1000);
  };

  // Handle joining a session
  const handleJoinSession = (sessionId) => {
    // In production, this would validate the session and connect the user
    navigate(`/session/${sessionId}`);
  };

  // Handle creating a new session
  const handleCreateSession = async (sessionData) => {
    try {
      // In production, this would call an API
      const sessionId = await createSession(sessionData);
      setShowCreateModal(false);
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  // Handle joining a private session
  const handleJoinPrivateSession = (sessionId) => {
    setShowJoinModal(false);
    // In production, would validate the session ID
    navigate(`/session/${sessionId}`);
  };

  return (
    <div className="live-sessions-container">
      <header className="sessions-headers">
        <h1>Coding Sessions</h1>
        <div className="view-controls">
          <button
            className={`view-button ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <FaTh /> Grid
          </button>
          <button
            className={`view-button ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <FaList /> List
          </button>
          <button
            className="refresh-button"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <FaSync className={isLoading ? "rotating" : ""} /> Refresh
          </button>
        </div>
        <div className="action-buttons">
          <button
            className="join-private-button"
            onClick={() => setShowJoinModal(true)}
          >
            <FaUserPlus /> Join private Session
          </button>
          <button
            className="new-session-button"
            onClick={() => setShowCreateModal(true)}
          >
            <FaPlus /> New Session
          </button>
        </div>
      </header>

      <div className="sessions-filters">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-selects">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="filter-select"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="filter-select"
          >
            {TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <select
            value={sessionTypeFilter}
            onChange={(e) => setSessionTypeFilter(e.target.value)}
            className="filter-select"
          >
            {SESSION_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading sessions...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="no-sessions">
          <p>No sessions found matching your filters.</p>
          <button
            className="clear-filters-button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("All Status");
              setLanguageFilter("All Languages");
              setTimeFilter("All Time");
              setSessionTypeFilter("All Sessions");
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div
          className={`sessions-grid ${viewMode === "list" ? "list-view" : ""}`}
        >
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onJoin={handleJoinSession}
            />
          ))}
        </div>
      )}

      {/* Join Private Session Modal */}
      {showJoinModal && (
        <JoinPrivateSessionModal
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinPrivateSession}
        />
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
        />
      )}
    </div>
  );
};

export default LiveSessions;
