import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import { AuthProvider } from './hooks/useAuth.jsx';
import SignUp from "./pages/signUp";
import ErrorBoundary from "./components/ErrorBoundary";

// Update lazy imports with correct file paths
const ProtectedRoute = lazy(() => import("./pages/protectedRoute"));
const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Profile = lazy(() => import("./pages/profile"));
const Sessions = lazy(() => import("./pages/sessions")); // Make sure filename matches exactly
const CodeEditor = lazy(() => import("./pages/codeEditor"));

// Improve loading component
const LoadingFallback = () => (
  <div className="loading-spinner">
    <p>Loading...</p>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
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
              <Route path="codeEditor" element={<CodeEditor />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
