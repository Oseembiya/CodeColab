import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { AuthProvider } from './hooks/useAuth.jsx';
import { SessionProvider } from './contexts/SessionContext';
import ErrorBoundary from "./error/ErrorBoundary.jsx";
import MainContent from './components/layouts/mainContent';

const SignUp = lazy(() => import("./pages/signUp"));
const ProtectedRoute = lazy(() => import("./pages/protectedRoute"));
const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Profile = lazy(() => import("./pages/profile"));
const Sessions = lazy(() => import("./pages/sessions.jsx")); 
const CodeEditorPage = lazy(() => import("./pages/CodeEditorPage")); // Add this
const CollaborationSession = lazy(() => import("./pages/CollaborativeSession"));
const Whiteboard = lazy(() => import("./pages/Whiteboard"));

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
                    <MainContent />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="sessions" element={<Sessions />} />
                <Route path="sessions/:sessionId" element={<CollaborationSession />} />
                <Route path="editor" element={<CodeEditorPage />} />
                <Route path="whiteboard" element={<Whiteboard />} />
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
