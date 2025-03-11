import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import SessionInfo from '../components/sessions/SessionInfo';
import CollaborativeEditor from '../components/editor/CollaborativeEditor';
import VideoChat from '../components/collaboration/VideoChat';
import Whiteboard from '../components/whiteboard/Whiteboard';

const CollaborativeSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { activeSession, clearActiveSession } = useSession();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Set up real-time listener for session updates
  useEffect(() => {
    setLoading(true);
    let unsubscribe;

    const initializeSession = async () => {
      try {
        // First, try to use activeSession if it matches current sessionId
        if (activeSession && activeSession.id === sessionId) {
          setSessionData(activeSession);
          setLoading(false);
        }

        // Set up real-time listener for session updates
        const sessionRef = doc(db, 'sessions', sessionId);
        unsubscribe = onSnapshot(sessionRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = { id: snapshot.id, ...snapshot.data() };
            setSessionData(data);
            setLoading(false);
          } else {
            setError('Session not found');
            setLoading(false);
          }
        }, (err) => {
          console.error('Error listening to session:', err);
          setError(err.message);
          setLoading(false);
        });

      } catch (err) {
        console.error('Error initializing session:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    initializeSession();

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [sessionId, activeSession]);

  const handleLeaveSession = () => {
    clearActiveSession();
    navigate('/dashboard/sessions');
  };

  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button onClick={() => navigate('/dashboard/sessions')}>
          Return to Sessions
        </button>
      </div>
    );
  }

  return (
    <div className="collaborative-session">
      <SessionInfo 
        session={sessionData} 
        onLeave={handleLeaveSession}
      />
      
      <div className="session-content">
        <div className="editor-section">
          <CollaborativeEditor
            sessionId={sessionId}
            userId={auth.currentUser?.uid}
            language={sessionData?.language || 'javascript'}
          />
        </div>
        
        <div className="collaboration-panel">
          <VideoChat
            sessionId={sessionId}
            userId={auth.currentUser?.uid}
          />
          <Whiteboard
            sessionId={sessionId}
            userId={auth.currentUser?.uid}
          />
        </div>
      </div>
    </div>
  );
};

export default CollaborativeSession; 