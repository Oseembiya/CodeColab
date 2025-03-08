import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch sessions once instead of real-time updates
  const fetchSessions = async () => {
    try {
      const sessionsRef = collection(db, 'sessions');
      const q = query(sessionsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const sessionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSessions(sessionData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err);
      setLoading(false);
    }
  };

  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const createSession = async (sessionData) => {
    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        ...sessionData,
        createdAt: new Date().toISOString()
      });
      
      // Update local state
      setSessions(prev => [{
        id: docRef.id,
        ...sessionData
      }, ...prev]);
      
      return { id: docRef.id, ...sessionData };
    } catch (err) {
      console.error('Error creating session:', err);
      throw err;
    }
  };

  const updateSession = async (sessionId, updateData) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, updateData);
      
      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, ...updateData }
          : session
      ));
    } catch (err) {
      console.error('Error updating session:', err);
      throw err;
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await deleteDoc(sessionRef);
      
      // Update local state
      setSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
      throw err;
    }
  };

  const joinSession = async (sessionId, code) => {
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const session = sessionDoc.data();
      if (session.isPrivate && session.joinCode !== code) {
        throw new Error('Invalid join code');
      }

      return { id: sessionDoc.id, ...session };
    } catch (err) {
      console.error('Error joining session:', err);
      throw err;
    }
  };

  // Manual refresh function
  const refreshSessions = () => {
    setLoading(true);
    fetchSessions();
  };

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
    joinSession,
    refreshSessions
  };
}; 