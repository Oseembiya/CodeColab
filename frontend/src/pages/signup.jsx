import { useState } from "react";
import { auth } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import "../index.css";
import image from "../assets/image.png"

const SignUp = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,

    });
    const [error, setError] = useState({});
    const [firebaseError, setFirebaseError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFirebaseError(""); // Reset previous Firebase errors
        setSuccessMessage(""); // Reset previous success message
        const newErrors = validateForm();
        
        if (Object.keys(newErrors).length === 0) {
            try {
                const userCredential = await createUserWithEmailAndPassword(
                    auth, 
                    formData.email, 
                    formData.password
                );
                
                const user = userCredential.user;
                console.log("New user created:", user.uid);
                
                await updateProfile(user, {
                    displayName: formData.fullName
                });
                
                setSuccessMessage("Account created successfully! Redirecting...");
                
                // Replace setTimeout with navigate
                setTimeout(() => {
                    navigate('/dashboard');  // to redirect dashboard
                }, 2000);
                
            } catch (error) {
                console.error("Firebase error:", error);
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        setFirebaseError('This email is already registered please Login');
                        break;
                    case 'auth/invalid-email':
                        setFirebaseError('Invalid email address');
                        break;
                    case 'auth/operation-not-allowed':
                        setFirebaseError('Email/password accounts are not enabled');
                        break;
                    case 'auth/weak-password':
                        setFirebaseError('Password is too weak');
                        break;
                    default:
                        setFirebaseError('An error occurred during registration');
                }
            }
        } else {
            setError(newErrors);
        }
    };
    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Full name is required';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (!formData.acceptTerms) {
            newErrors.acceptTerms = 'You must accept the terms and conditions';
        }

        return newErrors;
    };
    
  return (
    <div className="signup-container">
        <div className="signup-content">
            <img 
                src={image} 
                alt="Sign up illustration" 
            />
        </div>
        <div className="signup-form">
            <h1>Sign Up</h1>
            <p>Please fill in the form below to create an account.</p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="fullName">Full Name</label>
                    <input type="text" id="fullName" name="fullName" value={formData.fullName} placeholder="Osee Armstrong" onChange={handleChange} />
                    <FaUser className="input-icon" />
                    {error.fullName && <span className="error">{error.fullName}</span>}
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" name="email" value={formData.email} placeholder="Oseearmstrong@gmail.com" onChange={handleChange} />
                    <FaEnvelope className="input-icon" />
                    {error.email && <span className="error">{error.email}</span>}
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input type="password" id="password" name="password" value={formData.password} placeholder="***********" onChange={handleChange} />
                    <FaLock className="input-icon" />
                    {error.password && <span className="error">{error.password}</span>}
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} placeholder="***********" onChange={handleChange} />
                    <FaLock className="input-icon" />
                    {error.confirmPassword && <span className="error">{error.confirmPassword}</span>}
                </div>
                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            name="acceptTerms"
                            checked={formData.acceptTerms}
                            onChange={handleChange}
                        />
                        I accept the terms and conditions
                    </label>
                    {error.acceptTerms && <span className="error">{error.acceptTerms}</span>}
                </div>
                {successMessage && <div className="success">{successMessage}</div>}
                {firebaseError && <div className="error">{firebaseError}</div>}
                <button className="submit-button" type="submit">Get Started</button>
                <p className="login-link">Already have an account? <Link to="/login">Login</Link></p>
             </form>   
        </div>
    </div>
  )
}
export default SignUp;          