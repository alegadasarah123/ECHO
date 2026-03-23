import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ForgotPass from "./ForgotPass";

function LogIn({ onBack, fromForgotPass = false }) {
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const navigate = useNavigate()   

  // Animation effect when component mounts
  useEffect(() => {
    setIsVisible(true)
  }, [])

  const styles = {
    container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #FDF8F6 0%, #FCE7D9 50%, #FDF4E8 100%)", padding: "1rem", position: "relative", overflow: "hidden" },
    backgroundPattern: { position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B8763E' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundSize: "60px 60px", opacity: 0.4 },
    overlay: { position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(184, 118, 62, 0.08) 0%, rgba(184, 118, 62, 0.02) 100%)", zIndex: 0 },
    backLink: { position: "absolute", top: "2rem", left: "2rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", textDecoration: "none", fontSize: "0.875rem", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", cursor: "pointer", zIndex: 10, background: "rgba(255, 255, 255, 0.9)", padding: "0.5rem 1rem", borderRadius: "2rem", backdropFilter: "blur(10px)", fontWeight: "500", boxShadow: "0 2px 8px rgba(184, 118, 62, 0.1)", border: "1px solid rgba(184, 118, 62, 0.2)" },
    card: { backgroundColor: "white", borderRadius: "2rem", padding: "2.5rem", boxShadow: "0 30px 60px rgba(184, 118, 62, 0.15), 0 0 0 1px rgba(184, 118, 62, 0.05)", width: "100%", maxWidth: "440px", position: "relative", zIndex: 2, transform: isVisible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.98)", opacity: isVisible ? 1 : 0, transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" },
    header: { textAlign: "center", marginBottom: "2rem" },
    logo: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1.5rem", animation: isVisible ? "fadeInDown 0.6s ease-out" : "none" },
    logoImage: { height: "3.5rem", width: "auto", filter: "drop-shadow(0 4px 8px rgba(184, 118, 62, 0.2))" },
    title: { fontSize: "1.75rem", fontWeight: "bold", color: "#111827", marginBottom: "0.75rem" },
    subtitle: { color: "#6b7280", fontSize: "0.95rem", lineHeight: "1.5" },
    form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "0.5rem", animation: isVisible ? "slideInUp 0.5s ease-out" : "none", animationFillMode: "both" },
    label: { fontSize: "0.875rem", fontWeight: "600", color: "#374151", letterSpacing: "0.025em" },
    inputWrapper: { position: "relative" },
    input: { width: "100%", padding: "0.875rem 1rem 0.875rem 2.75rem", border: "2px solid #e5e7eb", borderRadius: "1rem", fontSize: "0.95rem", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", outline: "none", boxSizing: "border-box", backgroundColor: "#fafafa" },
    inputIcon: { position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", width: "1.25rem", height: "1.25rem", transition: "color 0.2s ease" },
    passwordToggle: { position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: "0.25rem", borderRadius: "0.5rem", transition: "all 0.2s ease" },
    error: { color: "#ef4444", fontSize: "0.875rem", padding: "0.75rem 1rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.75rem", lineHeight: "1.4", animation: "shake 0.5s ease-out" },
    forgotLinkContainer: { display: "flex", justifyContent: "flex-end", width: "100%", marginTop: "-0.5rem" },
    forgotLink: { color: "#B8763E", textDecoration: "none", fontWeight: "500", transition: "all 0.2s ease", cursor: "pointer", fontSize: "0.875rem", padding: "0.25rem 0" },
    button: { padding: "0.875rem 1.5rem", backgroundColor: "#B8763E", color: "white", border: "none", borderRadius: "1rem", fontSize: "1rem", fontWeight: "600", cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative", overflow: "hidden", boxShadow: "0 4px 6px rgba(184, 118, 62, 0.25)" },
    buttonDisabled: { opacity: 0.6, cursor: "not-allowed", transform: "none" },
    signupLink: { textAlign: "center", fontSize: "0.875rem", color: "#6b7280", marginTop: "1.5rem", lineHeight: "1.5" },
    signupLinkAnchor: { color: "#B8763E", textDecoration: "none", fontWeight: "600", transition: "all 0.2s ease" },
    footer: { textAlign: "center", marginTop: "1.5rem", fontSize: "0.75rem", color: "#9ca3af", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" },
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/login/", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          if (data.details && data.details.msg) {
            const supabaseError = data.details.msg.toLowerCase();
            if (supabaseError.includes("invalid login credentials")) {
              try {
                const checkEmailResponse = await fetch(`http://localhost:8000/api/check-email/?email=${encodeURIComponent(email)}`);
                if (checkEmailResponse.ok) {
                  const emailData = await checkEmailResponse.json();
                  if (emailData.exists) {
                    setError("The password you entered is incorrect. Please try again.");
                  } else {
                    setError("This email address is not registered with our system. Please verify your email or register for a new account.");                  
                  }
                } else {
                  setError("The password you entered is incorrect. Please try again.");
                }
              } catch (emailErr) {
                setError("The password you entered is incorrect. Please try again.");
              }
            } else {
              setError(data.details.msg);
            }
          } else {
            setError("Incorrect password");
          }
        } else if (response.status === 403) {
          setError(data.error || "Account access restricted");
        } else if (response.status === 404) {
          setError("Email does not exist");
        } else {
          setError(data.error || "Login failed. Please try again.");
        }
        return;
      }

      console.log("Login successful:", data);
      
      const role = data.role.trim();

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
      setError("Network error: Unable to connect to server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setIsVisible(false);
    setTimeout(() => {
      setShowForgotPassword(true);
    }, 300);
  };

  const handleBackToLogin = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShowForgotPassword(false);
      setIsVisible(true);
    }, 300);
  };

  const handleBackToHome = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onBack) {
        onBack();
      } else {
        navigate("/");
      }
    }, 300);
  };

  // Add CSS animations to document head
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes fadeInDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes slideInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
        100% { transform: translateY(0px); }
      }
      
      @keyframes gentlePulse {
        0% { opacity: 0.4; }
        50% { opacity: 0.6; }
        100% { opacity: 0.4; }
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  // If showing forgot password, render the ForgotPass component
  if (showForgotPassword) {
    return <ForgotPass onBack={handleBackToLogin} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <div style={styles.backgroundPattern}></div>
      
      {/* Decorative floating elements */}
      <div style={{
        position: "absolute",
        top: "10%",
        left: "5%",
        width: "300px",
        height: "300px",
        background: "radial-gradient(circle, rgba(184, 118, 62, 0.1) 0%, rgba(184, 118, 62, 0) 70%)",
        borderRadius: "50%",
        animation: "float 8s ease-in-out infinite",
        pointerEvents: "none",
        zIndex: 0
      }}></div>
      
      <div style={{
        position: "absolute",
        bottom: "10%",
        right: "5%",
        width: "400px",
        height: "400px",
        background: "radial-gradient(circle, rgba(184, 118, 62, 0.08) 0%, rgba(184, 118, 62, 0) 70%)",
        borderRadius: "50%",
        animation: "float 10s ease-in-out infinite reverse",
        pointerEvents: "none",
        zIndex: 0
      }}></div>
      
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: "500px",
        height: "500px",
        background: "radial-gradient(circle, rgba(184, 118, 62, 0.05) 0%, rgba(184, 118, 62, 0) 70%)",
        borderRadius: "50%",
        transform: "translate(-50%, -50%)",
        animation: "gentlePulse 4s ease-in-out infinite",
        pointerEvents: "none",
        zIndex: 0
      }}></div>

      <div
        style={styles.backLink}
        onClick={handleBackToHome}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "white"
          e.target.style.transform = "translateX(-4px)"
          e.target.style.boxShadow = "0 4px 12px rgba(184, 118, 62, 0.2)"
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "rgba(255, 255, 255, 0.9)"
          e.target.style.transform = "translateX(0)"
          e.target.style.boxShadow = "0 2px 8px rgba(184, 118, 62, 0.1)"
        }}
      >
        <ArrowLeft size={16} style={{ transition: "transform 0.3s ease" }} />
        Back to Home
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <img 
              src="/Images/echo.png" 
              alt="Echo Logo" 
              style={styles.logoImage}
            />
          </div>
          <p style={styles.subtitle}>Welcome! Please sign in to continue</p>
        </div>

        <form style={styles.form} onSubmit={handleLogin}>
          <div style={{...styles.inputGroup, animationDelay: "0.1s"}}>
            <label style={styles.label}>Email Address</label>
            <div style={styles.inputWrapper}>
              <Mail style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  ...styles.input,
                  borderColor: email ? "#B8763E" : "#e5e7eb",
                  backgroundColor: email ? "#ffffff" : "#fafafa",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#B8763E"
                  e.target.style.backgroundColor = "#ffffff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(184, 118, 62, 0.1)"
                  e.target.previousElementSibling.style.color = "#B8763E"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = email ? "#B8763E" : "#e5e7eb"
                  e.target.style.backgroundColor = email ? "#ffffff" : "#fafafa"
                  e.target.style.boxShadow = "none"
                  e.target.previousElementSibling.style.color = "#9ca3af"
                }}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div style={{...styles.inputGroup, animationDelay: "0.2s"}}>
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
                  borderColor: password ? "#B8763E" : "#e5e7eb",
                  backgroundColor: password ? "#ffffff" : "#fafafa",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#B8763E"
                  e.target.style.backgroundColor = "#ffffff"
                  e.target.style.boxShadow = "0 0 0 3px rgba(184, 118, 62, 0.1)"
                  e.target.previousElementSibling.style.color = "#B8763E"
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = password ? "#B8763E" : "#e5e7eb"
                  e.target.style.backgroundColor = password ? "#ffffff" : "#fafafa"
                  e.target.style.boxShadow = "none"
                  e.target.previousElementSibling.style.color = "#9ca3af"
                }}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                style={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                onMouseEnter={(e) => {
                  e.target.style.color = "#B8763E"
                  e.target.style.backgroundColor = "#fef3e8"
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "#9ca3af"
                  e.target.style.backgroundColor = "transparent"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.forgotLinkContainer}>
            <span
              style={styles.forgotLink}
              onClick={handleForgotPasswordClick}
              onMouseEnter={(e) => {
                e.target.style.color = "#a0612a"
                e.target.style.transform = "translateX(2px)"
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#B8763E"
                e.target.style.transform = "translateX(0)"
              }}
            >
              Forgot password?
            </span>
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
                e.target.style.transform = "translateY(-2px)"
                e.target.style.boxShadow = "0 8px 20px rgba(184, 118, 62, 0.35)"
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = "#B8763E"
                e.target.style.transform = "translateY(0)"
                e.target.style.boxShadow = "0 4px 6px rgba(184, 118, 62, 0.25)"
              }
            }}
          >
            {isLoading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <span style={{ 
                  display: "inline-block", 
                  width: "16px", 
                  height: "16px", 
                  border: "2px solid white", 
                  borderTopColor: "transparent", 
                  borderRadius: "50%", 
                  animation: "spin 0.6s linear infinite" 
                }}></span>
                Signing In...
              </span>
            ) : "Sign In"}
          </button>
        </form>

        <div style={styles.signupLink}>
          <p>
            Are you a licensed veterinarian?{" "}
            <Link
              to="/signup"
              style={styles.signupLinkAnchor}
              onMouseEnter={(e) => {
                e.target.style.color = "#a0612a"
                e.target.style.textDecoration = "underline"
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#B8763E"
                e.target.style.textDecoration = "none"
              }}
            >
              Sign up here
            </Link>
          </p>
        </div>

        <div style={styles.footer}>
          <p>© 2025 ECHO</p>
        </div>
      </div>
    </div>
  )
}

export default LogIn