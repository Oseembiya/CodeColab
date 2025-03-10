import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { AuthProvider } from './hooks/useAuth.jsx';
import { SessionProvider } from './contexts/SessionContext';
import ErrorBoundary from "./error/ErrorBoundary.jsx";

// Add SignUp import
const SignUp = lazy(() => import("./pages/signUp"));
// Update lazy imports with correct file paths
const ProtectedRoute = lazy(() => import("./pages/protectedRoute"));
const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Profile = lazy(() => import("./pages/profile"));
const Sessions = lazy(() => import("./pages/sessions")); // Make sure filename matches exactly
const CodeEditor = lazy(() => import("./pages/codeEditor")); // Keep this
const CollaborationSession = lazy(() => import("./pages/CollaborativeSession"));

// Improve loading component
const LoadingFallback = () => (
  <div className="loading-spinner">
    <p>Loading...</p>
  </div>
);

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SessionProvider>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              >
                <Route path="profile" element={<Profile />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="sessions/:sessionId" element={<CollaborationSession />} />
                <Route path="editor" element={<CodeEditor />} /> {/* Solo coding */}
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </SessionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
