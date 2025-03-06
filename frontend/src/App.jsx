import { Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./pages/signUp";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import PrivateRoute from "./pages/privateRoute";
import Profile from "./pages/profile";
import Sessions from "./pages/sessions";
import CodeEditor from "./pages/codeEditor";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>}>
        <Route index element={<h1>Welcome to Dashboard</h1>} />
        <Route path="profile" element={<Profile />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="codeEditor" element={<CodeEditor />} />
      </Route>
    </Routes>
  );
}

export default App;
