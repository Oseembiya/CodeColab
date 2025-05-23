import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SessionProvider } from "./contexts/SessionContext";
import { SocketProvider } from "./contexts/SocketContext";
import { UserMetricsProvider } from "./contexts/UserMetricsContext";
import { VideoProvider } from "./contexts/VideoContext";
import { useAuth } from "./contexts/AuthContext";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/dashboard";
import Auth from "./pages/auth";
import Profile from "./pages/profile";
import Session from "./pages/session";
import Whiteboard from "./pages/whiteboard";
import StandaloneEditor from "./pages/standaloneEditor";
import StandaloneWhiteboard from "./pages/standaloneWhiteboard";
import LiveSessions from "./pages/liveSessions";
import NotFound from "./pages/notFound";
import "./styles/App.css";

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

function App() {
  const [loading, setLoading] = useState(true);
  const [isSidebarFolded, setIsSidebarFolded] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Remove loading state after a short delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Function to update sidebar folded state
  const handleSidebarFold = (folded) => {
    setIsSidebarFolded(folded);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading CodeColab...</p>
      </div>
    );
  }

  return (
    <div
      className={`app-container ${isSidebarFolded ? "sidebar-folded" : ""} ${
        !currentUser ? "auth-only" : ""
      }`}
    >
      <SocketProvider>
        <UserMetricsProvider>
          <SessionProvider>
            <VideoProvider>
              {/* Only show sidebar for authenticated users */}
              {currentUser && <Sidebar onFoldChange={handleSidebarFold} />}

              <div className="main-content">
                <Routes>
                  {/* Auth route - combines login and register */}
                  <Route
                    path="/auth"
                    element={
                      currentUser ? <Navigate to="/" replace /> : <Auth />
                    }
                  />

                  {/* Protected routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/sessions"
                    element={
                      <ProtectedRoute>
                        <LiveSessions />
                      </ProtectedRoute>
                    }
                  />

                  {/* Standalone Mode Routes */}
                  <Route
                    path="/standalone-editor"
                    element={
                      <ProtectedRoute>
                        <StandaloneEditor />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/standalone-whiteboard"
                    element={
                      <ProtectedRoute>
                        <StandaloneWhiteboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Collaborative Mode Routes */}
                  <Route
                    path="/session/:sessionId"
                    element={
                      <ProtectedRoute>
                        <Session />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/whiteboard/:sessionId"
                    element={
                      <ProtectedRoute>
                        <Whiteboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Redirect legacy routes */}
                  <Route
                    path="/login"
                    element={<Navigate to="/auth" replace />}
                  />
                  <Route
                    path="/register"
                    element={<Navigate to="/auth" replace />}
                  />

                  {/* Legacy standalone mode redirects */}
                  <Route
                    path="/session/new"
                    element={<Navigate to="/standalone-editor" replace />}
                  />
                  <Route
                    path="/whiteboard/new"
                    element={<Navigate to="/standalone-whiteboard" replace />}
                  />

                  {/* 404 route - also protected */}
                  <Route
                    path="*"
                    element={
                      currentUser ? (
                        <NotFound />
                      ) : (
                        <Navigate to="/auth" replace />
                      )
                    }
                  />
                </Routes>
              </div>
            </VideoProvider>
          </SessionProvider>
        </UserMetricsProvider>
      </SocketProvider>
    </div>
  );
}

export default App;
