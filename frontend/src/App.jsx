import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { AuthProvider } from "./hooks/useAuth";
import { SessionProvider } from "./contexts/SessionContext";
import { SocketProvider } from "./contexts/SocketContext";
import { FriendProvider } from "./contexts/FriendContext";
import { DropdownProvider } from "./contexts/DropdownContext";
import { UserMetricsProvider } from "./contexts/UserMetricsContext";
import ErrorBoundary from "./error/ErrorBoundary";
import MainContent from "./components/layouts/mainContent";
import { initializeTheme } from "./config/theme";
import routeConfig from "./config/routes";
import { NotificationProvider } from "./contexts/NotificationContext";

// Improve loading component
const LoadingFallback = () => (
  <div className="loading-spinner">
    <p>Loading...</p>
  </div>
);

/**
 * Render a route based on its configuration
 */
const renderRouteElement = (route) => {
  if (route.element.type === "redirect") {
    return <Navigate to={route.element.to} replace />;
  }

  if (route.element.type === "protected") {
    const ProtectedComponent = route.element.component;
    return (
      <ProtectedComponent>
        <MainContent />
      </ProtectedComponent>
    );
  }

  const Component = route.element.component;
  return <Component />;
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

const App = () => {
  // Initialize theme
  useEffect(() => {
    initializeTheme();
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
                    <Suspense fallback={<LoadingFallback />}>
                      <Routes>{generateRoutes(routeConfig)}</Routes>
                    </Suspense>
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
