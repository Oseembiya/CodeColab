import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useAuth } from '../hooks/useAuth';
import CodeEditor from '../components/editor/CodeEditor';
import VideoChat from '../components/collaboration/VideoChat';

// Lazy load the Whiteboard component
const Whiteboard = lazy(() => import('../components/whiteboard/Whiteboard'));

const CollaborativeSession = () => {
  const { sessionId } = useParams();
  const { user } = useAuth();
  const { activeSession, joinSession } = useSession();
  const [view, setView] = useState('split'); // split, code, whiteboard
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (!activeSession || activeSession.id !== sessionId) {
          await joinSession(sessionId);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    initializeSession();
  }, [sessionId, activeSession, joinSession]);

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  if (!activeSession) {
    return <div className="loading">Loading session...</div>;
  }

  return (
    <div className="collaborative-session">
      {/* Session Header */}
      <div className="session-header">
        <h2>{activeSession.title}</h2>
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