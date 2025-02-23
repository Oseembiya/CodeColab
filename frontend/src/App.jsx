import { Routes, Route } from "react-router-dom";
import SignUp from "./pages/signUp"
import Login from "./pages/login"
import Dashboard from "./pages/dashboard"

function App() {
  return (
    <Routes>
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
