import { Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./pages/signUp"
import Login from "./pages/login"
import Dashboard from "./pages/dashboard"
import PrivateRoute from "./pages/privateRoute"
import Profile from "./pages/profile"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
    </Routes>
  );
}

export default App;
