import { createContext, useContext, useState, useEffect } from "react";

const UserMetricsContext = createContext();

export const useUserMetrics = () => {
  const context = useContext(UserMetricsContext);
  if (!context) {
    throw new Error("useUserMetrics must be used within a UserMetricsProvider");
  }
  return context;
};

export const UserMetricsProvider = ({ children }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserMetrics = async () => {
      try {
        // Simulate API call to fetch user metrics
        setTimeout(() => {
          // Placeholder demo data
          setMetrics({
            totalSessions: 5,
            hoursSpent: 12,
            linesOfCode: 430,
            collaborations: 3,
          });
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error("Error fetching user metrics:", error);
        setLoading(false);
      }
    };

    fetchUserMetrics();
  }, []);

  const updateMetrics = (newMetrics) => {
    setMetrics((prev) => ({
      ...prev,
      ...newMetrics,
    }));
  };

  const value = {
    metrics,
    loading,
    updateMetrics,
  };

  return (
    <UserMetricsContext.Provider value={value}>
      {children}
    </UserMetricsContext.Provider>
  );
};

export default UserMetricsContext;
