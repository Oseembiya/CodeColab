import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useAuth } from '../hooks/useAuth';
import CollaborativeEditor from '../components/editor/CollaborativeEditor';
import VideoChat from '../components/collaboration/VideoChat';
import SessionInfo from '../components/sessions/SessionInfo';

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

  if (!activeSession) {
    return <div>No active session found</div>;
  }

  return (
    <div className="collaborative-session">
      <SessionInfo 
        session={activeSession}
        onLeave={handleLeaveSession}
      />
      {/* Session Header */}
      <div className="session-header">
        <h2>{activeSession?.title}</h2>
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
            userId={user.uid}
            initialLanguage={activeSession.language}
          />
        </div>

        <div className="right-panel">
          {view !== 'code' && (
            <Suspense fallback={<div>Loading whiteboard...</div>}>
              <Whiteboard 
                sessionId={sessionId} 
                userId={user.uid}
              />
            </Suspense>
          )}
        </div>

        {/* Video Chat Panel */}
        <div className="video-panel">
          <VideoChat 
            sessionId={sessionId} 
            userId={user.uid}
          />
        </div>
      </div>
    </div>
  );
};

export default CollaborativeSession; 