import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGoogle,
} from "react-icons/fa";
import PropTypes from "prop-types";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import TermsAndConditions from "./TermsAndConditions";
import "../../styles/components/_terms-modal.css";

const saveUserToFirestore = async (user) => {
  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        photoURL: user.photoURL || "",
        createdAt: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
  }
};

const AuthForm = ({ isLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [error, setError] = useState({});
  const [firebaseError, setFirebaseError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log("Successfully signed in via redirect");
          await saveUserToFirestore(result.user);
          navigate("/dashboard");
        }
      } catch (error) {
        console.error("Redirect Result Error:", error);
        // Log detailed error information for debugging
        console.error("Detailed redirect error:", {
          code: error.code,
          message: error.message,
          fullError: error,
        });

        setIsGoogleLoading(false);
        // Only show errors for non-cancelled requests
        if (
          error.code !== "auth/cancelled-popup-request" &&
          error.code !== "auth/redirect-cancelled-by-user"
        ) {
          setFirebaseError(
            error.message || "An error occurred during sign in."
          );
          setTimeout(() => setFirebaseError(""), 5000);
        }
      } finally {
        setIsGoogleLoading(false);
      }
    };

    handleRedirectResult();
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prevData) => ({
        ...prevData,
        [name]: checked,
      }));
    } else {
      const cleanedValue =
        name === "password" || name === "confirmPassword"
          ? value.replace(/\s/g, "").slice(0, 12)
          : value.trim();

      setFormData((prevData) => ({
        ...prevData,
        [name]: cleanedValue,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isLogin && !formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (formData.password.length > 12) {
      newErrors.password = "Password cannot exceed 12 characters";
    }

    if (!isLogin) {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }

      if (!formData.acceptTerms) {
        newErrors.acceptTerms = "You must accept the terms and conditions";
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (auth.currentUser) {
      navigate("/dashboard");
      return;
    }

    setFirebaseError("");
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      try {
        if (isLogin) {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
          );
          await saveUserToFirestore(userCredential.user);
          navigate("/dashboard");
        } else {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
          );

          await updateProfile(userCredential.user, {
            displayName: formData.fullName,
          });

          await saveUserToFirestore(userCredential.user);
          navigate("/dashboard");
        }
      } catch (error) {
        handleAuthError(error);
      }
    } else {
      setError(newErrors);
    }
  };

  const handleAuthError = (error) => {
    console.error("Firebase error:", error);
    switch (error.code) {
      case "auth/email-already-in-use":
        setFirebaseError("This email is already registered");
        break;
      case "auth/invalid-credential":
        setFirebaseError("Invalid email or password");
        break;
      case "auth/invalid-email":
        setFirebaseError("Invalid email address");
        break;
      case "auth/too-many-requests":
        setFirebaseError("Too many failed attempts. Please try again later.");
        break;
      default:
        setFirebaseError("An error occurred during authentication");
    }
  };

  const handleGoogleAuth = async () => {
    try {
      if (auth.currentUser) {
        navigate("/dashboard");
        return;
      }

      setIsGoogleLoading(true);
      const provider = new GoogleAuthProvider();

      // Add specific scopes needed
      provider.addScope("email");
      provider.addScope("profile");

      // Set custom parameters for more reliable auth
      provider.setCustomParameters({
        prompt: "select_account",
        // Important: Set the current domain as origin_uri to help with redirect
        origin_uri: window.location.origin,
      });

               await signInWithRedirect(auth, provider);
          // The result will be handled in the useEffect with getRedirectResult
          return;
        } catch (redirectError) {
          console.error("Redirect auth failed:", redirectError);
          throw redirectError;
        }
      }
    } catch (error) {
      setIsGoogleLoading(false);

      console.error("Google Auth Error (detailed):", {
        code: error.code,
        message: error.message,
        fullError: error,
      });

      // Handle specific error cases
      const errorMessages = {
        "auth/network-request-failed":
          "Network error. Please check your connection.",
        "auth/popup-blocked":
          "Popup was blocked. Please allow popups for this site.",
        "auth/popup-closed-by-user": "Sign-in was cancelled. Please try again.",
        "auth/cancelled-popup-request":
          "The previous sign-in attempt was cancelled.",
        "auth/account-exists-with-different-credential":
          "An account already exists with the same email. Try signing in with a different method.",
      };

      const errorMessage =
        errorMessages[error.code] || "An error occurred during sign in.";

      setFirebaseError(errorMessage);
      setTimeout(() => setFirebaseError(""), 5000);
    }
  };

  const handleGoogleClick = async () => {
    if (isGoogleLoading) return;

    if (!isLogin && !formData.acceptTerms) {
      setError({
        ...error,
        acceptTerms: "You must accept the terms and conditions",
      });
      return;
    }

    setIsGoogleLoading(true);
    setFirebaseError("");
    await handleGoogleAuth();
  };

  const handleTermsLinkClick = (e) => {
    e.preventDefault();
    setShowTermsModal(true);
  };

  const handleTermsModalClose = (accepted) => {
    setShowTermsModal(false);
    if (accepted) {
      setFormData((prevData) => ({
        ...prevData,
        acceptTerms: true,
      }));
    }
  };

  if (auth.currentUser) {
    return null;
  }

  return (
    <div className={`${isLogin ? "login" : "signup"}-container`}>
      <div className="signup-form">
        <h1>{isLogin ? "Login" : "Sign Up"}</h1>
        <p>
          {isLogin
            ? "Please enter your credentials to login."
            : "Please fill in the form below to create an account."}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  maxLength={20}
                  autoComplete="name"
                />
                <span className="icon-container">
                  <FaUser className="input-icon" />
                </span>
              </div>
              {error.fullName && (
                <span className="error">{error.fullName}</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                maxLength={30}
                autoComplete="username"
              />
              <span className="icon-container">
                <FaEnvelope className="input-icon" />
              </span>
            </div>
            {error.email && <span className="error">{error.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="********"
                maxLength={12}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
            {error.password && <span className="error">{error.password}</span>}
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-input-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="********"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
                {error.confirmPassword && (
                  <span className="error">{error.confirmPassword}</span>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                  />
                  I accept the{" "}
                  <a href="#" onClick={handleTermsLinkClick}>
                    terms and conditions
                  </a>
                </label>
                {error.acceptTerms && (
                  <span className="error">{error.acceptTerms}</span>
                )}
              </div>
            </>
          )}

          {firebaseError && <div className="error">{firebaseError}</div>}

          <button className="submit-button" type="submit">
            {isLogin ? "Login" : "Get Started"}
          </button>

          {!isLogin && (
            <div className="google-auth-section">
              <button
                type="button"
                className="google-button"
                onClick={handleGoogleClick}
                disabled={isGoogleLoading || !formData.acceptTerms}
              >
                <FaGoogle />
                {isGoogleLoading ? "Signing in..." : "Sign in with Google"}
              </button>
            </div>
          )}

          <p className="login-link">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link to={isLogin ? "/signup" : "/login"}>
              {isLogin ? "Sign Up" : "Login"}
            </Link>
          </p>
        </form>
      </div>
      {showTermsModal && <TermsAndConditions onClose={handleTermsModalClose} />}
    </div>
  );
};

AuthForm.propTypes = {
  isLogin: PropTypes.bool.isRequired,
};

export default AuthForm;
