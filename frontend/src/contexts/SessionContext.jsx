import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc 
} from 'firebase/firestore';

const SessionContext = createContext(null);

export const SessionProvider = ({ children }) => {
  const [activeSession, setActiveSession] = useState(() => {
    // Try to load from localStorage on initial render
    const saved = localStorage.getItem('activeSession');
    return saved ? JSON.parse(saved) : null;
  });

  // Persist activeSession to localStorage whenever it changes
  useEffect(() => {
    if (activeSession) {
      localStorage.setItem('activeSession', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('activeSession');
    }
  }, [activeSession]);

  const createSession = async (sessionData) => {
    try {
      const sessionToCreate = {
        ...sessionData,
        language: sessionData.language || 'javascript',
        maxParticipants: Number(sessionData.maxParticipants),
        createdAt: new Date().toISOString(),
        startTime: sessionData.startNow ? new Date().toISOString() : sessionData.scheduledTime,
        status: 'active',
        isPrivate: Boolean(sessionData.isPrivate),
      };

      const docRef = await addDoc(collection(db, 'sessions'), sessionToCreate);
      
      setActiveSession({ id: docRef.id, ...sessionToCreate });
      return docRef.id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };
  
  const joinSession = async (sessionId, joinCode = null) => {
    try {
      console.log('Joining session with:', { sessionId, joinCode, hasActiveSession: !!activeSession });
      
      // If we already have an active session with this ID, return it
      if (activeSession && activeSession.id === sessionId) {
        console.log('Already in session, returning active session');
        return activeSession;
      }

      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const session = { id: sessionId, ...sessionDoc.data() };
      console.log('Session data:', { isPrivate: session.isPrivate, hasJoinCode: !!joinCode });
      
      // Validate private session access
      if (session.isPrivate) {
        // Check if we have a stored join code
        const storedJoinInfo = localStorage.getItem('lastJoinedSession');
        const parsedJoinInfo = storedJoinInfo ? JSON.parse(storedJoinInfo) : null;
        const finalJoinCode = joinCode || (parsedJoinInfo?.id === sessionId ? parsedJoinInfo.joinCode : null);

        if (!finalJoinCode) {
          throw new Error('Join code required for private session');
        }

        if (session.joinCode !== finalJoinCode?.toUpperCase()) {
          throw new Error('Invalid join code');
        }
      }

      // Update participants array
      const updatedSession = {
        ...session,
        participants: session.participants || []
      };

      // Set as active session
      setActiveSession(updatedSession);
      
      return updatedSession;
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    }
  };

  const clearActiveSession = () => {
    setActiveSession(null);
    localStorage.removeItem('activeSession');
  };

  const value = {
    activeSession,
    createSession,
    joinSession,
    clearActiveSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}; 