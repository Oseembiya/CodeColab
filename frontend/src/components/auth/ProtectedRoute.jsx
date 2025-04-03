import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/**
 * Protected route wrapper that redirects unauthenticated users to login
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading authentication...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace={true}
        state={{ from: location.pathname }}
      />
    );
  }

  // Show authenticated content
  return children;
};

export default ProtectedRoute;
