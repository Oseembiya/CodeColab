import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from 'react';
import SignUp from "./pages/signUp";

// Lazy load all components including ProtectedRoute
const ProtectedRoute = lazy(() => import("./pages/protectedRoute"));
const Login = lazy(() => import("./pages/login"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const Profile = lazy(() => import("./pages/profile"));
const Sessions = lazy(() => import("./pages/sessions"));
const CodeEditor = lazy(() => import("./pages/codeEditor"));

// Custom loading component
const LoadingFallback = () => (
  <div className="loading-spinner">Loading...</div>
);

function App() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" 
          element={
            <Suspense fallback={<LoadingFallback />}>
              <Login />
            </Suspense>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Suspense>
          }
        >
          <Route path="profile" 
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Profile />
              </Suspense>
            } 
          />
          <Route path="sessions" 
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Sessions />
              </Suspense>
            } 
          />
          <Route path="codeEditor" 
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CodeEditor />
              </Suspense>
            } 
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace={true} />} />
      </Routes>
    </Suspense>
  );
}

export default App;
