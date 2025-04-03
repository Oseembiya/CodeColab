import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Suspense } from "react";

/**
 * A wrapper component for routes that are public
 * Optionally redirects authenticated users from certain routes (like login)
 */
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-primary"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated and trying to access login page, redirect to app
  if (user && location.pathname === "/login") {
    return <Navigate to={from} replace />;
  }

  // Render children for public routes
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

export default PublicRoute;
