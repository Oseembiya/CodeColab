import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Suspense } from "react";

/**
 * Protected route wrapper that redirects unauthenticated users to login
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-primary"></div>
          <p className="mt-2">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show authenticated content with suspense for nested lazy-loaded components
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-primary"></div>
            <p className="mt-2">Loading content...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
};

export default ProtectedRoute;
