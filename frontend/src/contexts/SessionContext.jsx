import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../hooks/useAuth';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [currentSession, setCurrentSession] = useState(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  const getSessionData = async (sessionId) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Session not found');
      }

      return {
        id: sessionSnap.id,
        ...sessionSnap.data()
      };
    } catch (error) {
      console.error('Error fetching session data:', error);
      throw new Error('Failed to fetch session data');
    }
  };

  const joinSession = async (sessionId, joinCode) => {
    console.log('Starting join with:', { sessionId, joinCode });

    try {
      if (!user) {
        throw new Error('User must be authenticated to join a session');
      }

      // Check if already in session
      if (currentSession?.id === sessionId) {
        console.log('Already in session, returning active session');
        return currentSession;
      }

      // Get session data from Firestore
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = {
        id: sessionSnap.id,
        ...sessionSnap.data()
      };

      // Validate join code for private sessions
      if (sessionData.isPrivate && sessionData.joinCode !== joinCode) {
        throw new Error('Invalid join code');
      }

      // Validate session status
      if (sessionData.status !== 'active') {
        throw new Error('Session is not active');
      }

      // Check if session is full
      if (sessionData.participants && 
          sessionData.participants.length >= sessionData.maxParticipants) {
        throw new Error('Session is full');
      }

      // Join socket room
      if (socket) {
        socket.emit('join-session', {
          sessionId,
          userId: user.uid,
          username: user.displayName || 'Anonymous',
          photoURL: user.photoURL
        });
      }

      // Update current session
      const updatedSession = {
        ...sessionData,
        joinCode
      };
      
      setCurrentSession(updatedSession);
      return updatedSession;

    } catch (error) {
      console.error('Join session error:', error);
      throw error;
    }
  };

  const createSession = async (sessionData) => {
    try {
      const sessionToCreate = {
        ...sessionData,
        createdAt: new Date().toISOString(),
        status: 'active',
        participants: [user.uid],
        owner: user.uid,
      };

      const docRef = await addDoc(collection(db, 'sessions'), sessionToCreate);
      
      // Create the complete session object
      const createdSession = {
        id: docRef.id,
        ...sessionToCreate
      };

      // Update active session immediately
      setCurrentSession(createdSession);
      localStorage.setItem('activeSession', JSON.stringify(createdSession));

      return docRef.id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };
  
  const clearActiveSession = useCallback(() => {
    setCurrentSession(null);
    localStorage.removeItem('activeSession');
  }, []);

  const leaveSession = () => {
    if (currentSession && socket) {
      socket.emit('leave-session', { 
        sessionId: currentSession.id,
        userId: user?.uid 
      });
      setCurrentSession(null);
    }
  };

  const value = {
    currentSession,
    createSession,
    joinSession,
    clearActiveSession,
    leaveSession,
    getSessionData
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};

export default SessionContext; 