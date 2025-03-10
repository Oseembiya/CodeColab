import { createContext, useContext, useState } from 'react';
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
  const [activeSession, setActiveSession] = useState(null);

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
  
  const joinSession = async (sessionId, joinCode) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const session = { id: sessionId, ...sessionDoc.data() };
      
      // Add validation for private sessions
      if (session.isPrivate) {
        if (!joinCode) {
          throw new Error('Join code required for private session');
        }
        if (session.joinCode !== joinCode.toUpperCase()) {
          throw new Error('Invalid join code');
        }
      }

      // Update participants array
      const updatedSession = {
        ...session,
        participants: session.participants || []
      };

      // Update the active session
      setActiveSession(updatedSession);
      
      // Update the session document with new participant
      await updateDoc(sessionRef, {
        participants: [...updatedSession.participants]
      });

      return updatedSession;
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    }
  };

  const value = {
    activeSession,
    createSession,
    joinSession,
    // Add more methods as needed
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