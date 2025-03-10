import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useAuth } from '../hooks/useAuth';
import CodeEditor from '../components/editor/CodeEditor';
import VideoChat from '../components/collaboration/VideoChat';
import SessionInfo from '../components/sessions/SessionInfo';

// Lazy load the Whiteboard component
const Whiteboard = lazy(() => import('../components/whiteboard/Whiteboard'));

const CollaborativeSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeSession, joinSession } = useSession();
  const [view, setView] = useState('split'); // split, code, whiteboard
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        
        // Check if we're already in this session
        if (activeSession && activeSession.id === sessionId) {
          setIsLoading(false);
          return;
        }

        // If no active session, try to get stored join info
        const storedJoinInfo = localStorage.getItem('lastJoinedSession');
        const parsedJoinInfo = storedJoinInfo ? JSON.parse(storedJoinInfo) : null;
        
        // Only use stored join info if it matches the current session
        const joinCode = parsedJoinInfo?.id === sessionId ? parsedJoinInfo.joinCode : null;

        console.log('Initializing session with:', { sessionId, joinCode, hasActiveSession: !!activeSession });
        
        if (!sessionId) {
          navigate('/dashboard/sessions');
          return;
        }

        await joinSession(sessionId, joinCode);
        setIsLoading(false);
        
        // Clear the stored join info after successful join
        localStorage.removeItem('lastJoinedSession');
      } catch (error) {
        console.error('Session initialization error:', error);
        setError(error.message);
        setTimeout(() => {
          navigate('/dashboard/sessions');
        }, 2000);
      }
    };

    initializeSession();
  }, [sessionId, activeSession, joinSession, navigate]);

  const handleLeave = () => {
    // Clean up any connections/sockets
    // Navigate back to sessions list
    navigate('/dashboard/sessions');
  };

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">{error}</div>
        <div>Redirecting to sessions page...</div>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading session...</div>;
  }

  return (
    <div className="collaborative-session">
      <SessionInfo 
        session={activeSession} 
        onLeave={handleLeave}
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
          <CodeEditor 
            collaborative={true} 
            sessionId={sessionId} 
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