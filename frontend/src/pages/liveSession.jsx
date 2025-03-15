import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../firebaseConfig';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { io } from 'socket.io-client';
import SessionInfo from '../components/sessions/SessionInfo';
import CollaborativeEditor from '../components/editor/CollaborativeEditor';
import VideoChat from '../components/communications/VideoChat';

const CollaborativeSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { currentSession, joinSession, leaveSession } = useSession();
  const { user } = useAuth();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      navigate('/login');
      return;
    }

    // Initialize socket connection
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket']
    });

    // Join the session room
    socketRef.current.emit('join-session', {
      sessionId,
      userId,
      username: auth.currentUser?.displayName || 'Anonymous',
      photoURL: auth.currentUser?.photoURL
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [sessionId, user]);

  const initSession = async () => {
    try {
      // Try to get stored join info
      const storedJoinInfo = localStorage.getItem('lastJoinedSession');
      let joinCode = null;

      if (storedJoinInfo) {
        const { id, joinCode: storedCode } = JSON.parse(storedJoinInfo);
        if (id === sessionId) {
          joinCode = storedCode;
        }
      }

      await joinSession(sessionId, joinCode);
    } catch (error) {
      console.error('Error joining session:', error);
      setError(error.message);
      navigate('/dashboard/sessions');
    }
  };

  useEffect(() => {
    if (!currentSession || currentSession.id !== sessionId) {
      initSession();
    }
  }, [sessionId]);

  useEffect(() => {
    setLoading(true);
    let unsubscribe;

    const initializeSession = async () => {
      try {
        // First, try to use currentSession if it matches current sessionId
        if (currentSession && currentSession.id === sessionId) {
          setSessionData(currentSession);
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
      leaveSession();
    };
  }, [sessionId, currentSession]);

  const handleLeave = () => {
    leaveSession();
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

  if (!currentSession) {
    return <div>Loading session...</div>;
  }

  return (
    <div className="collaborative-session">
      <SessionInfo 
        session={currentSession}
        onLeave={handleLeave}
        socket={socketRef.current}
      />
      
      <div className="session-content">
        <div className="editor-section">
          <CollaborativeEditor
            sessionId={sessionId}
            userId={userId}
          />
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