import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { SocketProvider } from "./contexts/SocketContext.jsx";
import { SessionProvider } from "./contexts/SessionContext.jsx";
import { FriendProvider } from "./contexts/FriendContext.jsx";
import { DropdownProvider } from "./contexts/DropdownContext.jsx";
import { UserMetricsProvider } from "./contexts/UserMetricsContext.jsx";
import { AuthProvider } from "./hooks/useAuth.jsx";
import ErrorBoundary from "./error/ErrorBoundary";
import MainContent from "./components/layouts/mainContent";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import routeConfig from "./routeConfig";

/**
 * Simple loading fallback component
 */
const LoadingFallback = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-primary"></div>
      <p className="mt-2">{message}</p>
    </div>
  </div>
);

/**
 * Initialize error tracking for production environments
 */
const initErrorTracking = () => {
  // This can be replaced with a real error tracking service implementation
  if (process.env.NODE_ENV === "production") {
    console.log("Error tracking initialized in production mode");
  }
};

/**
 * Render a route based on its configuration with suspense boundaries
 * for better code splitting and loading states
 */
const renderRouteElement = (route) => {
  if (route.element.type === "redirect") {
    return <Navigate to={route.element.to} replace />;
  }

  // Add suspense boundaries at the route level
  if (route.element.type === "protected") {
    const ProtectedComponent = route.element.component;
    return (
      <ErrorBoundary>
        <Suspense
          fallback={<LoadingFallback message={`Loading ${route.path}...`} />}
        >
          <ProtectedComponent>
            <MainContent />
          </ProtectedComponent>
        </Suspense>
      </ErrorBoundary>
    );
  }
};

/**
 * Recursively generate routes
 */
const generateRoutes = (routes) => {
  return routes.map((route) => {
    // If the route has children, recursively generate them
    if (route.children) {
      return (
        <Route
          key={route.path || "index"}
          path={route.path}
          element={renderRouteElement(route)}
        >
          {route.index && (
            <Route
              index
              element={renderRouteElement(route.children.find((r) => r.index))}
            />
          )}
          {generateRoutes(route.children)}
        </Route>
      );
    }

    // Otherwise, render a simple route
    return (
      <Route
        key={route.path || "index"}
        path={route.path}
        index={route.index}
        element={renderRouteElement(route)}
      />
    );
  });
};

/**
 * ScrollToTop component that handles scrolling to top on route changes
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => {
  // Initialize error tracking for production
  useEffect(() => {
    initErrorTracking();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <SessionProvider>
            <FriendProvider>
              <NotificationProvider>
                <UserMetricsProvider>
                  <DropdownProvider>
                    <ScrollToTop />
                    <Routes>{generateRoutes(routeConfig)}</Routes>
                  </DropdownProvider>
                </UserMetricsProvider>
              </NotificationProvider>
            </FriendProvider>
          </SessionProvider>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
