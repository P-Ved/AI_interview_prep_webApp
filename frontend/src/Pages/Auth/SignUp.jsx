import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ for redirect
import './Auth.css';
import { UserContext } from '../../context/Usercontext';
import axiosInstance from '../../utils/axiosInstance'; // ✅ axios setup
import { API_PATHS } from '../../utils/apiPaths'; // ✅ API endpoints

const SignUp = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { updateUser } = useContext(UserContext);
  const navigate = useNavigate();

  /* ---------- helpers ---------- */
  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (message.text) setMessage({ type: '', text: '' });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return 'Full name is required';
    if (!/\S+@\S+\.\S+/.test(formData.email))
      return 'Please enter a valid email address';
    if (formData.password.length < 8)
      return 'Password must be at least 8 characters long';
    if (!/(?=.*[a-z])(?=.*\d)/.test(formData.password))
      return 'Password must contain lowercase and a number';
    if (formData.password !== formData.confirmPassword)
      return 'Passwords do not match';
    if (!agreeToTerms)
      return 'Please agree to the Terms of Service and Privacy Policy';
    return null;
  };

  /* ---------- submit ---------- */
  const handleSubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    const error = validateForm();
    if (error) {
      setMessage({ type: 'error', text: error });
      setIsLoading(false);
      return;
    }

    try {
      // ✅ API call to backend
      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        name: formData.fullName,
        email: formData.email,
        password: formData.password,
      });

      console.log('SIGNUP SUCCESS:', response.data);

      const token =
        response.data?.token ||
        response.data?.accessToken ||
        response.data?.data?.token;

      if (token) {
        // ✅ Save token
        localStorage.setItem('token', token);

        // ✅ Update user context using backend payload + token
        updateUser({
          ...response.data,
          name: response.data?.name || formData.fullName,
          email: response.data?.email || formData.email,
          token,
        });

        // ✅ Navigate to dashboard
        navigate('/dashboard');
      } else {
        setMessage({
          type: 'error',
          text: 'Signup response missing token. Please try again.',
        });
      }
    } catch (error) {
      console.error('SIGNUP ERROR:', error.response || error.message);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Something went wrong. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- password-strength helpers ---------- */
  const getPasswordStrength = () => {
    const { password } = formData;
    if (!password) return { text: '', score: 0 };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++; // ✅ only number required

    const labels = ['Weak', 'Weak', 'Fair', 'Good'];
    return { text: labels[score] || 'Strong', score };
  };

  const { text: strengthText, score } = getPasswordStrength();
  const strengthColors = ['#ef4444', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  const strengthColor = strengthColors[score] || '#e5e7eb';

  /* ---------- UI ---------- */
  return (
    <div className="auth-page">
      {/* back link */}
      <div className="back-to-home">
        <a href="/" className="back-link">
          <span>←</span> Back to Home
        </a>
      </div>

      <div className="auth-container">
        {/* logo / intro */}
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">AI</div>
            <span className="auth-logo-text">Interview Prep AI</span>
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">
            Start your interview success journey with AI
          </p>
        </div>

        {/* alerts */}
        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        {/* form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* name */}
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              className="form-input"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* email */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>

            {/* compact strength bar */}
            {formData.password && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div
                    className="strength-fill"
                    style={{
                      width: `${(score / 4) * 100}%`,
                      backgroundColor: strengthColor
                    }}
                  />
                </div>
                <span
                  className="strength-text"
                  style={{ color: strengthColor }}
                >
                  {strengthText}
                </span>
              </div>
            )}
          </div>

          {/* confirm password */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <div className="password-container">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* terms */}
          <div className="checkbox-group">
            <input
              id="agree"
              type="checkbox"
              className="checkbox-input"
              checked={agreeToTerms}
              onChange={() => setAgreeToTerms(!agreeToTerms)}
              required
            />
            <label htmlFor="agree" className="checkbox-label">
              I agree to the&nbsp;
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>
              &nbsp;and&nbsp;
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </label>
          </div>

          {/* submit */}
          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading && <span className="loading-spinner" />}
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* footer link */}
        <div className="auth-footer">
          <span className="auth-footer-text">
            Already have an account?
            <a href="/login" className="auth-footer-link">
              Sign in
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
