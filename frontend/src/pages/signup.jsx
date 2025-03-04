import { useState } from "react";
import { auth } from "../firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { FaUser, FaEnvelope, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

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
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState('');

    const checkPasswordStrength = (password) => {
        let strength = 0;
        let message = '';

        // Length check
        if (password.length >= 8) strength++;
        
        // Contains number
        if (/\d/.test(password)) strength++;
        
        // Contains lowercase letter
        if (/[a-z]/.test(password)) strength++;
        
        // Contains uppercase letter
        if (/[A-Z]/.test(password)) strength++;
        
        // Contains special character
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

        // Set strength message
        switch (strength) {
            case 0:
            case 1:
                message = 'weak';
                break;
            case 2:
            case 3:
                message = 'medium';
                break;
            case 4:
            case 5:
                message = 'strong';
                break;
            default:
                message = '';
        }

        setPasswordStrength(message);
        return strength >= 3; // Return true if password is at least medium strength
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            setFormData(prevData => ({
                ...prevData,
                [name]: checked
            }));
        } else {
            // For password fields, limit to 12 characters and remove spaces
            if (name === 'password' || name === 'confirmPassword') {
                const cleanedValue = value.replace(/\s/g, '').slice(0, 12);
                setFormData(prevData => ({
                    ...prevData,
                    [name]: cleanedValue
                }));

                // Check password strength when password changes
                if (name === 'password') {
                    checkPasswordStrength(cleanedValue);
                }
            } else {
                // For other fields, just trim whitespace
                const cleanedValue = value.trim();
                setFormData(prevData => ({
                    ...prevData,
                    [name]: cleanedValue
                }));
            }
        }
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
        } else if (formData.password.length > 12) {
            newErrors.password = 'Password cannot exceed 12 characters';
        } else if (!checkPasswordStrength(formData.password)) {
            newErrors.password = 'Password is too weak. Please include numbers, uppercase, lowercase, and special characters';
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
            <div className="signup-form">
                <h1>Sign Up</h1>
                <p>Please fill in the form below to create an account.</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="fullName">Full Name</label>
                        <input 
                            type="text" 
                            id="fullName" 
                            name="fullName" 
                            value={formData.fullName} 
                            placeholder="Osee Armstrong" 
                            onChange={handleChange} 
                        />
                        <FaUser className="input-icon" />
                        {error.fullName && <span className="error">{error.fullName}</span>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            id="email" 
                            name="email" 
                            value={formData.email} 
                            placeholder="Oseearmstrong@gmail.com" 
                            onChange={handleChange} 
                        />
                        <FaEnvelope className="input-icon" />
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
                                placeholder="***********" 
                                onChange={handleChange}
                                maxLength={12}
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
                        {formData.password && (
                            <div className={`password-strength ${passwordStrength}`}>
                                Password strength: {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                                <span className="password-length">
                                    ({formData.password.length}/12)
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="password-input-container">
                            <input 
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword" 
                                name="confirmPassword" 
                                value={formData.confirmPassword} 
                                placeholder="***********" 
                                onChange={handleChange} 
                            />
                            <button 
                                type="button" 
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                            </button>
                        </div>
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
    );
};
export default SignUp;          