import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebaseConfig";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

const UserMetricsContext = createContext(null);

export function UserMetricsProvider({ children }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalSessions: 0,
    hoursSpent: 0,
    linesOfCode: 0,
    collaborations: 0,
    lastSessionStart: null,
    lastActive: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial fetch
    const fetchInitialMetrics = async () => {
      try {
        const userMetricsRef = doc(db, "userMetrics", user.uid);
        const metricsDoc = await getDoc(userMetricsRef);

        if (metricsDoc.exists()) {
          const data = metricsDoc.data();
          setMetrics({
            totalSessions: data.totalSessions || 0,
            hoursSpent: parseFloat(data.hoursSpent || 0).toFixed(1),
            linesOfCode: data.linesOfCode || 0,
            collaborations: data.collaborations || 0,
            lastSessionStart: data.lastSessionStart,
            lastActive: data.lastActive,
          });
        } else {
          // No metrics yet, use defaults
          setMetrics({
            totalSessions: 0,
            hoursSpent: 0,
            linesOfCode: 0,
            collaborations: 0,
            lastSessionStart: null,
            lastActive: null,
          });
        }
      } catch (err) {
        console.error("Error fetching user metrics:", err);
        setError("Failed to load user metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMetrics();

    // Set up real-time listener
    const userMetricsRef = doc(db, "userMetrics", user.uid);
    const unsubscribe = onSnapshot(
      userMetricsRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setMetrics({
            totalSessions: data.totalSessions || 0,
            hoursSpent: parseFloat(data.hoursSpent || 0).toFixed(1),
            linesOfCode: data.linesOfCode || 0,
            collaborations: data.collaborations || 0,
            lastSessionStart: data.lastSessionStart,
            lastActive: data.lastActive,
          });
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error in metrics snapshot:", err);
        setError("Failed to sync user metrics");
        setLoading(false);
      }
    );

    // Cleanup
    return () => unsubscribe();
  }, [user]);

  return (
    <UserMetricsContext.Provider value={{ metrics, loading, error }}>
      {children}
    </UserMetricsContext.Provider>
  );
}

export const useUserMetrics = () => {
  const context = useContext(UserMetricsContext);
  if (context === null) {
    throw new Error("useUserMetrics must be used within a UserMetricsProvider");
  }
  return context;
};

export default UserMetricsContext;
