import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaFilter, FaClock, FaUsers, FaCode, FaCalendar, FaLock, FaLockOpen } from 'react-icons/fa';
import CreateSessionModal from './CreateSessionModal';
import JoinSessionModal from './JoinSessionModal';
import SessionCard from './SessionCard';
import SessionFilters from './SessionFilters';
import { useAuth } from '../../hooks/useAuth';
import { useSessions } from '../../hooks/useSessions';
import { useSession } from '../../contexts/SessionContext';

const Sessions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    sessions, 
    loading, 
    error, 
    createSession,
    joinSession,
    refreshSessions 
  } = useSessions();
  const { createSession: sessionContextCreateSession } = useSession();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    language: 'all',
    dateRange: 'all',
    privacy: 'all'
  });
  const [view, setView] = useState('grid');

  if (loading) {
    return <div>Loading sessions...</div>;
  }

  if (error) {
    return <div>Error loading sessions: {error.message}</div>;
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         session.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || session.status === filters.status;
    const matchesLanguage = filters.language === 'all' || session.language === filters.language;
    const matchesPrivacy = filters.privacy === 'all' || session.isPrivate === (filters.privacy === 'private');
    
    let matchesDate = true;
    if (filters.dateRange !== 'all') {
      const sessionDate = new Date(session.startTime);
      const now = new Date();
      switch (filters.dateRange) {
        case 'today':
          matchesDate = sessionDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          matchesDate = sessionDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          matchesDate = sessionDate >= monthAgo;
          break;
        default:
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesLanguage && matchesPrivacy && matchesDate;
  });

  const handleCreateSession = async (sessionData) => {
    try {
      const sessionId = await sessionContextCreateSession(sessionData);
      setShowCreateModal(false);
      navigate(`/dashboard/sessions/${sessionId}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const initiateJoinSession = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      setJoinError('Session not found');
      return;
    }

    if (session.isPrivate) {
      setSelectedSessionId(sessionId);
      setShowJoinModal(true);
      setJoinError('');
    } else {
      handleJoinSession(sessionId);
    }
  };

  const handleJoinSession = async (sessionId, joinCode = null) => {
    try {
      console.log('Starting join process:', { sessionId, joinCode });
      
      // Store the join info before attempting to join
      if (joinCode) {
        localStorage.setItem('lastJoinedSession', JSON.stringify({
          id: sessionId,
          joinCode: joinCode.toUpperCase()
        }));
      }
      
      const result = await joinSession(sessionId, joinCode);
      setShowJoinModal(false);
      setSelectedSessionId(null);
      setJoinError('');
      
      navigate(`/dashboard/sessions/${sessionId}`);
    } catch (error) {
      console.error('Failed to join session:', error);
      setJoinError(error.message);
      // Clean up stored join info on error
      localStorage.removeItem('lastJoinedSession');
    }
  };

  return (
    <div className="sessions-container">
      {error && <div className="error-message">{error}</div>}
      
      {/* Change class name here */}
      <div className="sessions-page-header">
        <div className="header-left">
          <h1>Coding Sessions</h1>
          <div className="view-toggle">
            <button 
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
            >
              Grid
            </button>
            <button 
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
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
            onClick={() => setShowJoinModal(true)}
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

      {/* Filters Section */}
      <SessionFilters 
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* Sessions Grid/List */}
      <div className={`sessions-${view}`}>
        {filteredSessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            isOwner={session.ownerId === user.uid}
            onJoin={() => initiateJoinSession(session.id)}
            view={view}
          />
        ))}
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
          setJoinError('');
        }}
        onJoin={(code) => handleJoinSession(selectedSessionId, code)}
        error={joinError}
        sessionId={selectedSessionId}
      />
    </div>
  );
};

export default Sessions;