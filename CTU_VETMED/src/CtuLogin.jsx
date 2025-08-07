"use client"


import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CtuLogin.css"; // Keep the original CSS import

function CtuLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false) // Added for password toggle
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false) // Added for loading state on button
  const usernameInputRef = useRef(null) // Added for auto-focus

  useEffect(() => {
    // Focus on username input when component mounts
    if (usernameInputRef.current) {
      usernameInputRef.current.focus()
    }
  }, [])

  const togglePassword = () => {
    setShowPassword((prev) => !prev)
  }

  const handleToggleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      togglePassword()
    }
  }

  const handleForgotPassword = () => {
    // Simulate navigation to a forgot password page
    console.log("Navigating to forgot password page...")
    // In a real Next.js app, you would use useRouter or a simple <a> tag
    navigate("/ctu-forgotpass");
  }

  const handleLogin = (e) => {
    e.preventDefault()
    setErrorMessage("")
    if (!username || !password) {
      setErrorMessage("Please fill in all fields.")
      return
    }
    setIsLoading(true)
    setTimeout(() => {
      if (username === "admin" && password === "admin") {
        alert("Login successful!")
        setErrorMessage("")
        localStorage.setItem("currentUser", username)
        localStorage.setItem("loginTime", new Date().toISOString())
        navigate("/CtuDashboard");
      } else {
        setErrorMessage("Invalid username or password.")
        setIsLoading(false)
      }
    }, 1500)
  }

  return (
    <div className="modern-login-body">
      <div className="container">
        {/* Left Panel (Logo) */}
        <div className="left-panel">
          <img src="/images/VET.png" alt="CTU Veterinary Medicine College Logo" />
          {/* The image shows "ECHO CTUF" text below the logo, so it's re-added */}
        </div>
        {/* Right Panel (Form) */}
        <div className="right-panel">
          <div className="login-card">
            <h3>Welcome Back!</h3>
            <p>Sign in to your account</p>
            <form onSubmit={handleLogin}>
              {" "}
              {/* Corrected from handleSubmit to handleLogin */}
              <div className="form-group">
                <h3>Username</h3>
                <div>
                  <input
                    type="text"
                    id="username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      setErrorMessage("") // Clear error on input change
                    }}
                    required
                    ref={usernameInputRef}
                  />
                </div>
              </div>
              <div className="form-group">
                <h3>Password</h3>
                <div>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrorMessage("") // Clear error on input change
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={togglePassword}
                    onKeyDown={handleToggleKeyDown}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={0}
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true"></i>
                  </button>
                </div>
              </div>
              {errorMessage && <div className="error-message">{errorMessage}</div>}
              <div className="forgot-password">
                <button type="button" onClick={handleForgotPassword} className="forgot-link">
                  Forgot Password?
                </button>
              </div>
              <button type="submit" className="login-btn" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CtuLogin
