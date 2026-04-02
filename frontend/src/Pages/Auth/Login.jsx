import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import "./Auth.css";
import { UserContext } from "../../context/Usercontext";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const { updateUser } = useContext(UserContext);

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (message.text) setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    // Basic validation
    if (!formData.email || !formData.password) {
      setMessage({ type: "error", text: "Please fill in all fields" });
      setIsLoading(false);
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setMessage({ type: "error", text: "Please enter a valid email address" });
      setIsLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email: formData.email,
        password: formData.password,
      });

      // support different token keys from backend
      const token =
        response.data?.token ||
        response.data?.accessToken ||
        response.data?.data?.token;

      if (token) {
        localStorage.setItem("token", token);
        if (rememberMe) {
          // Optional: also persist email
          localStorage.setItem("rememberEmail", formData.email);
        }
        setMessage({ type: "success", text: "Login successful! Redirecting..." });
        updateUser(response.data);
        setTimeout(() => navigate("/dashboard"), 800);
      } else {
        setMessage({
          type: "error",
          text: "Login response missing token. Please try again.",
        });
      }
    } catch (error) {
      // Log for quick diagnosis
      console.error("LOGIN ERROR:", error);

      if (error.response) {
        // Server responded with a status code
        const serverMsg =
          error.response.data?.message ||
          error.response.data?.error ||
          error.response.data?.detail ||
          `Request failed with status ${error.response.status}`;
        setMessage({ type: "error", text: serverMsg });
      } else if (error.request) {
        // No response (network/CORS/server down)
        const targetServer = BASE_URL || window.location.origin;
        setMessage({
          type: "error",
          text: `Cannot reach server at ${targetServer}. Is the backend running and CORS enabled?`,
        });
      } else {
        // Something else triggered the error
        setMessage({ type: "error", text: error.message || "Unexpected error." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="back-to-home">
        <a href="/" className="back-link">
          <span>←</span>
          Back to Home
        </a>
      </div>

      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">AI</div>
            <span className="auth-logo-text">Interview Prep AI</span>
          </div>

          <h1 className="auth-title">Welcome Back!</h1>
          <p className="auth-subtitle">
            Sign in to continue your interview preparation
          </p>
        </div>

        {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-input"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="password-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                className="form-input"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="remember"
                className="checkbox-input"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="checkbox-label">Remember me</label>
            </div>

            <div className="forgot-password">
              <a href="/forgot-password" className="forgot-password-link">Forgot Password?</a>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading && <span className="loading-spinner"></span>}
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <span className="auth-footer-text">
            Don't have an account?
            <a href="/signup" className="auth-footer-link">Sign up for free</a>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
