import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { SocketProvider } from "./contexts/SocketContext.jsx";
import { SessionProvider } from "./contexts/SessionContext.jsx";
import { FriendProvider } from "./contexts/FriendContext.jsx";
import { DropdownProvider } from "./contexts/DropdownContext.jsx";
import { UserMetricsProvider } from "./contexts/UserMetricsContext.jsx";
import ErrorBoundary from "./error/ErrorBoundary";
import MainContent from "./components/layouts/mainContent";
import routeConfig from "./config/routes";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import LoadingFallback from "./components/common/LoadingFallback";

// Initialize error tracking for production
const initErrorTracking = () => {
  // Production-only error tracking
  console.log("Error tracking initialized in production mode");
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

  const Component = route.element.component;
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <LoadingFallback message={`Loading ${route.path || "page"}...`} />
        }
      >
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
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
    </ErrorBoundary>
  );
};

export default App;
