import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import AuthForm from "../components/auth/AuthForm";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  return <AuthForm isLogin={true} />;
};

export default Login;
