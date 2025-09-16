import { ArrowLeft, Eye, EyeOff, Lock, Mail, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";


function LogIn({ onBack }) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()   

  const styles = {
    container: {
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #fdf8f6 0%, #ffffff 50%, #fdf8f6 100%)",
      padding: "1rem",
      position: "relative",
    },
    backgroundPattern: {
      position: "absolute",
      inset: 0,
      backgroundImage: `radial-gradient(circle at 1px 1px, rgba(184, 118, 62, 0.1) 1px, transparent 0)`,
      backgroundSize: "20px 20px",
      opacity: 0.3,
    },
    backLink: {
      position: "absolute",
      top: "1rem",
      left: "2rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      color: "#6b7280",
      textDecoration: "none",
      fontSize: "0.875rem",
      transition: "all 0.2s ease",
      cursor: "pointer",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "1rem",
      padding: "2rem 2rem",
      boxShadow: "0 25px 50px rgba(184, 118, 62, 0.1), 0 0 0 1px rgba(184, 118, 62, 0.05)",
      width: "100%",
      maxWidth: "420px",
      position: "relative",
      zIndex: 1,
    },
    header: {
      textAlign: "center",
      marginBottom: "1.5rem",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.75rem",
      marginBottom: "1rem",
    },
    logoIcon: {
      width: "3rem",
      height: "3rem",
      backgroundColor: "#B8763E",
      borderRadius: "0.75rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 8px 25px rgba(184, 118, 62, 0.3)",
    },
    logoText: {
      fontSize: "2rem",
      fontWeight: "bold",
      color: "#B8763E",
    },
    title: {
      fontSize: "1.75rem",
      fontWeight: "bold",
      color: "#111827",
      marginBottom: "0.75rem",
    },
    subtitle: {
      color: "#6b7280",
      fontSize: "1rem",
      lineHeight: "1.5",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
    },
    label: {
      fontSize: "0.875rem",
      fontWeight: "600",
      color: "#374151",
    },
    inputWrapper: {
      position: "relative",
    },
    input: {
      width: "100%",
      padding: "1rem 1rem 1rem 2.75rem",
      border: "1px solid #d1d5db",
      borderRadius: "0.5rem",
      fontSize: "1rem",
      transition: "all 0.2s ease",
      outline: "none",
      boxSizing: "border-box",
      lineHeight: "1.5",
    },
    inputIcon: {
      position: "absolute",
      left: "0.875rem",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#9ca3af",
      width: "1rem",
      height: "1rem",
    },
    passwordToggle: {
      position: "absolute",
      right: "0.875rem",
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "0.25rem",
      borderRadius: "0.25rem",
      transition: "color 0.2s ease",
    },
    error: {
      color: "#ef4444",
      fontSize: "0.875rem",
      padding: "0.75rem",
      backgroundColor: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "0.375rem",
      lineHeight: "1.4",
    },
    rememberForgot: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "0.875rem",
      paddingTop: "0.25rem",
    },
    checkboxWrapper: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      cursor: "pointer",
    },
    checkbox: {
      width: "1rem",
      height: "1rem",
      accentColor: "#B8763E",
    },
    forgotLink: {
      color: "#B8763E",
      textDecoration: "none",
      fontWeight: "500",
      transition: "color 0.2s ease",
    },
    button: {
      padding: "1rem 1.5rem",
      backgroundColor: "#B8763E",
      color: "white",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "1rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease",
      position: "relative",
      overflow: "hidden",
      lineHeight: "1.5",
    },
    buttonDisabled: {
      opacity: 0.7,
      cursor: "not-allowed",
    },
    signupLink: {
      textAlign: "center",
      fontSize: "0.875rem",
      color: "#6b7280",
      marginTop: "1.5rem",
      lineHeight: "1.5",
    },
    signupLinkAnchor: {
      color: "#B8763E",
      textDecoration: "none",
      fontWeight: "600",
      transition: "color 0.2s ease",
    },
    footer: {
      textAlign: "center",
      marginTop: "1.5rem",
      fontSize: "0.75rem",
      color: "#9ca3af",
      paddingTop: "1rem",
      borderTop: "1px solid #f3f4f6",
    },
  }

 const handleLogin = async (e) => {
  e.preventDefault();
  setError("");
  setIsLoading(true);

  try {
    const response = await fetch("http://localhost:8000/api/login/", { 
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Login failed");
      return;
    }

    console.log("Login successful:", data);
const role = data.role.trim(); // keep original case from DB

if (role === "Veterinarian") {
  navigate("/VetDashboard");
} else if (role === "Ctu-Vetmed" || role === "Ctu-Admin") {
  navigate("/CtuDashboard");
} else if (role === "Dvmf" || role === "Dvmf-Admin")  {
  navigate("/DvmfDashboard");
} else {
  navigate("/KutDashboard");
}



if (onBack) onBack(role);


  } catch (err) {
    console.error("Login error:", err);
    setError("Login failed. Please try again.");
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern}></div>

      <div
        style={styles.backLink}
        onClick={onBack}
        onMouseEnter={(e) => {
          e.target.style.color = "#B8763E"
          e.target.querySelector("svg").style.transform = "translateX(-2px)"
        }}
        onMouseLeave={(e) => {
          e.target.style.color = "#6b7280"
          e.target.querySelector("svg").style.transform = "translateX(0)"
        }}
      >
        <ArrowLeft size={16} style={{ transition: "transform 0.2s ease" }} />
        Back to Home
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <Stethoscope size={24} color="white" />
            </div>
            <span style={styles.logoText}>Echo</span>
          </div>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Sign in to your Echo account</p>
        </div>

        <form style={styles.form} onSubmit={handleLogin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  ...styles.input,
                  borderColor: email ? "#B8763E" : "#d1d5db",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#B8763E")}
                onBlur={(e) => (e.target.style.borderColor = email ? "#B8763E" : "#d1d5db")}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <Lock style={styles.inputIcon} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  ...styles.input,
                  paddingRight: "3rem",
                  borderColor: password ? "#B8763E" : "#d1d5db",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#B8763E")}
                onBlur={(e) => (e.target.style.borderColor = password ? "#B8763E" : "#d1d5db")}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                style={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                onMouseEnter={(e) => (e.target.style.color = "#B8763E")}
                onMouseLeave={(e) => (e.target.style.color = "#9ca3af")}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.rememberForgot}>
            <label style={styles.checkboxWrapper}>
              <input type="checkbox" style={styles.checkbox} />
              <span style={{ color: "#6b7280" }}>Remember me</span>
            </label>
            <a
              href="#"
              style={styles.forgotLink}
              onMouseEnter={(e) => (e.target.style.color = "#a0612a")}
              onMouseLeave={(e) => (e.target.style.color = "#B8763E")}
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
            disabled={isLoading}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = "#a0612a"
                e.target.style.transform = "translateY(-1px)"
                e.target.style.boxShadow = "0 8px 25px rgba(184, 118, 62, 0.3)"
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = "#B8763E"
                e.target.style.transform = "translateY(0)"
                e.target.style.boxShadow = "none"
              }
            }}
          >
            {isLoading ? "Signing In..." : "Sign In to Echo"}
          </button>
        </form>

        <div style={styles.signupLink}>
          <p>
            Don't have an account?{" "}
            <Link
              to="/signup"
              style={styles.signupLinkAnchor}
              onMouseEnter={(e) => (e.target.style.color = "#a0612a")}
              onMouseLeave={(e) => (e.target.style.color = "#B8763E")}
            >
              Sign up for Echo
            </Link>
          </p>
        </div>

        <div style={styles.footer}>
          <p>© 2025 Echo Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

export default LogIn
