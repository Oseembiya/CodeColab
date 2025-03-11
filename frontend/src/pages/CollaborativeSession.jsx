import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useAuth } from '../hooks/useAuth';
import CollaborativeEditor from '../components/editor/CollaborativeEditor';
import VideoChat from '../components/collaboration/VideoChat';
import SessionInfo from '../components/sessions/SessionInfo';
import { auth } from '../firebaseConfig';
import { io } from 'socket.io-client';

// Lazy load the Whiteboard component
const Whiteboard = lazy(() => import('../components/whiteboard/Whiteboard'));

const CollaborativeSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession, joinSession, clearActiveSession } = useSession();
  const [view, setView] = useState('split'); // split, code, whiteboard
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState(activeSession);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!activeSession || activeSession.id !== sessionId) {
          const joinInfo = localStorage.getItem('lastJoinedSession');
          const parsedJoinInfo = joinInfo ? JSON.parse(joinInfo) : null;
          
          if (parsedJoinInfo?.id === sessionId) {
            await joinSession(sessionId, parsedJoinInfo.joinCode);
          } else {
            await joinSession(sessionId);
          }
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [sessionId, activeSession, joinSession]);

  useEffect(() => {
    if (!sessionId || !userId) {
      navigate('/dashboard');
      return;
    }

    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket']
    });

    // Join session with user info
    socket.emit('join-session', {
      sessionId,
      userId,
      username: auth.currentUser?.displayName,
      photoURL: auth.currentUser?.photoURL
    });

    // Handle participants update
    socket.on('participants-update', ({ participants, count }) => {
      setCurrentSession(prev => ({
        ...prev,
        participants: participants,
        currentParticipants: count
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, userId, navigate]);

  const handleLeaveSession = () => {
    clearActiveSession();
    localStorage.removeItem('lastJoinedSession');
    navigate('/dashboard/sessions');
  };

  if (isLoading) {
    return <div className="loading">Loading session...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error joining session</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard/sessions')}>
          Return to Sessions
        </button>
      </div>
    );
  }

  if (!currentSession) {
    return <div>Loading session...</div>;
  }

  return (
    <div className="collaborative-session">
      <SessionInfo 
        session={{
          ...currentSession,
          participants: currentSession.participants || [],
          maxParticipants: currentSession.maxParticipants || 4
        }}
        onLeave={handleLeaveSession}
      />
      {/* Session Header */}
      <div className="session-header">
        <h2>{currentSession?.title}</h2>
        <div className="view-controls">
          <button 
            className={view === 'split' ? 'active' : ''} 
            onClick={() => setView('split')}
          >
            Split View
          </button>
          <button 
            className={view === 'code' ? 'active' : ''} 
            onClick={() => setView('code')}
          >
            Code Only
          </button>
          <button 
            className={view === 'whiteboard' ? 'active' : ''} 
            onClick={() => setView('whiteboard')}
          >
            Whiteboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`session-content ${view}`}>
        <div className="left-panel">
          <CollaborativeEditor
            sessionId={sessionId}
            userId={userId}
            initialLanguage={currentSession.language}
          />
        </div>

        <div className="right-panel">
          {view !== 'code' && (
            <Suspense fallback={<div>Loading whiteboard...</div>}>
              <Whiteboard 
                sessionId={sessionId} 
                userId={userId}
              />
            </Suspense>
          )}
        </div>

        {/* Video Chat Panel */}
        <div className="video-panel">
          <VideoChat 
            sessionId={sessionId} 
            userId={userId}
          />
        </div>
      </div>
    </div>
  );
};

export default CollaborativeSession; 