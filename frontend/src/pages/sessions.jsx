import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaFilter, FaClock, FaUsers, FaCode, FaCalendar, FaLock, FaLockOpen } from 'react-icons/fa';
import CreateSessionModal from '../components/sessions/CreateSessionModal';
import JoinSessionModal from '../components/sessions/JoinSessionModal';
import SessionCard from '../components/sessions/SessionCard';
import SessionFilters from '../components/sessions/SessionFilters';
import { useAuth } from '../hooks/useAuth';
import { useSessions } from '../hooks/useSessions';

const Sessions = () => {
  const { user } = useAuth();
  const { 
    sessions, 
    createSession, 
    joinSession, 
    updateSession,
    deleteSession 
  } = useSessions();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    language: 'all',
    dateRange: 'all',
    privacy: 'all'
  });
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const navigate = useNavigate();

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         session.description.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || session.status === filters.status;
    const matchesLanguage = filters.language === 'all' || session.language === filters.language;
    const matchesPrivacy = filters.privacy === 'all' || session.isPrivate === (filters.privacy === 'private');
    
    // Date range filtering
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
      }
    }

    return matchesSearch && matchesStatus && matchesLanguage && matchesPrivacy && matchesDate;
  });

  const handleCreateSession = async (sessionData) => {
    try {
      const newSession = await createSession({
        ...sessionData,
        ownerId: user.uid,
        status: sessionData.startNow ? 'active' : 'scheduled',
        participants: [{ id: user.uid, role: 'owner' }],
        createdAt: new Date().toISOString()
      });

      if (sessionData.startNow) {
        navigate(`/dashboard/codeEditor/${newSession.id}`);
      }
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating session:', error);
      // Handle error (show notification)
    }
  };

  const handleJoinSession = async (sessionId, code) => {
    try {
      await joinSession(sessionId, code);
      navigate(`/dashboard/codeEditor/${sessionId}`);
    } catch (error) {
      console.error('Error joining session:', error);
      // Handle error (show notification)
    }
  };

  return (
    <div className="sessions-container">
      {/* Header Section */}
      <div className="sessions-header">
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
        </div>
        <button 
          className="create-session-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <FaPlus /> New Session
        </button>
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
            onJoin={() => handleJoinSession(session.id)}
            onEdit={(updatedData) => updateSession(session.id, updatedData)}
            onDelete={() => deleteSession(session.id)}
            view={view}
          />
        ))}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateSessionModal 
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
        />
      )}

      {showJoinModal && (
        <JoinSessionModal 
          onClose={() => setShowJoinModal(false)}
          onJoin={handleJoinSession}
        />
      )}
    </div>
  );
};

export default Sessions; 