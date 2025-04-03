import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { SocketProvider } from "./contexts/SocketContext.jsx";
import { SessionProvider } from "./contexts/SessionContext.jsx";
import { FriendProvider } from "./contexts/FriendContext.jsx";
import { DropdownProvider } from "./contexts/DropdownContext.jsx";
import { UserMetricsProvider } from "./contexts/UserMetricsContext.jsx";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import ErrorBoundary from "./error/ErrorBoundary";
import MainContent from "./components/layouts/mainContent";
import { NotificationProvider } from "./contexts/NotificationContext.jsx";
import routeConfig from "./routeConfig";

/**
 * Loading fallback component for suspense and auth checks
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
  if (process.env.NODE_ENV === "production") {
    console.log("Error tracking initialized in production mode");
  }
};

/**
 * Component that handles auth-aware routes (redirects authenticated users away from login)
 */
const AuthAwareRoute = ({ component: Component }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingFallback message="Checking authentication..." />;

  // If authenticated, redirect to dashboard
  if (user) return <Navigate to="/" replace />;

  // If not authenticated, render the component (auth page)
  return (
    <ErrorBoundary>
      <Suspense
        fallback={<LoadingFallback message="Loading authentication page..." />}
      >
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
};

/**
 * Render a route based on its configuration type
 */
const renderRouteElement = (route) => {
  // For auth-aware routes (login)
  if (route.element.type === "auth-aware") {
    return <AuthAwareRoute component={route.element.component} />;
  }

  // For protected routes
  if (route.element.type === "protected") {
    const ProtectedComponent = route.element.component;
    return (
      <ProtectedComponent>
        {route.children ? <MainContent /> : null}
      </ProtectedComponent>
    );
  }

  // For regular component routes
  if (route.element.type === "component") {
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
  }

  // Handle redirect routes
  if (route.element.type === "redirect") {
    return <Navigate to={route.element.to} replace />;
  }

  // Default fallback
  return <div>Invalid route configuration</div>;
};

/**
 * ScrollToTop component that handles scrolling to top on route changes
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
};

const App = () => {
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
                    {process.env.NODE_ENV !== "production" && (
                      <div
                        style={{
                          position: "fixed",
                          bottom: 10,
                          right: 10,
                          background: "rgba(0,0,0,0.7)",
                          color: "white",
                          padding: "5px 10px",
                          borderRadius: "5px",
                          zIndex: 9999,
                          fontSize: "12px",
                        }}
                      >
                        Path: {window.location.pathname}
                      </div>
                    )}
                    <Routes>
                      {routeConfig.map((route) => {
                        // For routes with children
                        if (route.children) {
                          return (
                            <Route
                              key={route.path}
                              path={route.path}
                              element={renderRouteElement(route)}
                            >
                              {route.children.map((childRoute) => {
                                if (childRoute.index) {
                                  return (
                                    <Route
                                      key="index"
                                      index
                                      element={renderRouteElement(childRoute)}
                                    />
                                  );
                                }
                                return (
                                  <Route
                                    key={childRoute.path}
                                    path={childRoute.path}
                                    element={renderRouteElement(childRoute)}
                                  />
                                );
                              })}
                            </Route>
                          );
                        }

                        // For routes without children
                        return (
                          <Route
                            key={route.path}
                            path={route.path}
                            element={renderRouteElement(route)}
                          />
                        );
                      })}
                    </Routes>
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
