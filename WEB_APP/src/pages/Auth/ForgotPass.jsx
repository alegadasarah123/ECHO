import { AlertCircle, ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Mail, Key, Check, X } from "lucide-react";
import { useState, useEffect } from "react";

function ForgotPass({ onBack }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState("forgot"); // "forgot" | "otp" | "reset" | "success"
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
  // Password requirements state
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // Animation effect when component mounts
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Password validation function
  const validatePassword = (password) => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>_]/.test(password)
    };
  };

  // Update password requirements when newPassword changes
  useEffect(() => {
    setPasswordRequirements(validatePassword(newPassword));
  }, [newPassword]);

  // Check if password meets all requirements
  const isPasswordValid = () => {
    const reqs = validatePassword(newPassword);
    return reqs.minLength && reqs.hasUppercase && reqs.hasLowercase && reqs.hasNumber && reqs.hasSpecialChar;
  };

  const styles = {
    container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #FDF8F6 0%, #FCE7D9 50%, #FDF4E8 100%)", padding: "1rem", position: "relative", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: "hidden" },
    backgroundPattern: { position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23B8763E' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`, backgroundSize: "60px 60px", opacity: 0.4 },
    overlay: { position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(184, 118, 62, 0.08) 0%, rgba(184, 118, 62, 0.02) 100%)", zIndex: 0 },
    backLink: { position: "absolute", top: "1.5rem", left: "2rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", cursor: "pointer", fontSize: "0.95rem", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", zIndex: 2, fontWeight: 500, background: "rgba(255, 255, 255, 0.9)", padding: "0.5rem 1rem", borderRadius: "2rem", backdropFilter: "blur(10px)", boxShadow: "0 2px 8px rgba(184, 118, 62, 0.1)", border: "1px solid rgba(184, 118, 62, 0.2)" },
    card: { backgroundColor: "white", borderRadius: "2rem", padding: "2.5rem", boxShadow: "0 30px 60px rgba(184, 118, 62, 0.15), 0 0 0 1px rgba(184, 118, 62, 0.05)", width: "100%", maxWidth: "440px", position: "relative", zIndex: 2, transform: isVisible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.98)", opacity: isVisible ? 1 : 0, transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)" },
    header: { textAlign: "center", marginBottom: "2rem" },
    logo: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1.5rem" },
    logoImage: { height: "3.5rem", width: "auto", filter: "drop-shadow(0 4px 8px rgba(184, 118, 62, 0.2))" },
    title: { fontSize: "1.75rem", fontWeight: "bold", color: "#111827", marginBottom: "0.75rem" },
    subtitle: { color: "#6b7280", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "0.5rem" },
    form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "0.5rem" },
    label: { fontSize: "0.875rem", fontWeight: "600", color: "#374151", letterSpacing: "0.025em" },
    inputWrapper: { position: "relative" },
    input: { width: "100%", padding: "0.875rem 1rem 0.875rem 2.75rem", border: "2px solid #e5e7eb", borderRadius: "1rem", fontSize: "0.95rem", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", outline: "none", boxSizing: "border-box", backgroundColor: "#fafafa" },
    inputIcon: { position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", width: "1.25rem", height: "1.25rem", transition: "color 0.2s ease" },
    toggleIcon: { position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", cursor: "pointer", padding: "0.25rem", borderRadius: "0.5rem", transition: "all 0.2s ease" },
    message: { padding: "0.75rem 1rem", borderRadius: "0.75rem", fontSize: "0.875rem", lineHeight: "1.4", display: "flex", alignItems: "center", gap: "0.5rem", animation: "shake 0.5s ease-out" },
    errorMessage: { backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" },
    successMessage: { backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" },
    button: { padding: "0.875rem 1.5rem", backgroundColor: "#B8763E", color: "white", border: "none", borderRadius: "1rem", fontSize: "1rem", fontWeight: "600", cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative", overflow: "hidden", boxShadow: "0 4px 6px rgba(184, 118, 62, 0.25)" },
    buttonDisabled: { opacity: 0.6, cursor: "not-allowed", transform: "none" },
    backToLoginLink: { textAlign: "center", fontSize: "0.875rem", color: "#6b7280", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6" },
    backToLoginLinkAnchor: { color: "#B8763E", cursor: "pointer", fontWeight: "600", transition: "all 0.2s ease" },
    otpContainer: { display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "0.5rem" },
    otpInput: { width: "3rem", height: "3rem", textAlign: "center", fontSize: "1.25rem", fontWeight: "600", border: "2px solid #e5e7eb", borderRadius: "0.75rem", outline: "none", transition: "all 0.2s ease", backgroundColor: "#fafafa" },
    resendButton: { background: "none", border: "none", color: "#B8763E", cursor: "pointer", fontSize: "0.875rem", fontWeight: "500", transition: "all 0.2s ease", padding: "0.25rem" },
    resendDisabled: { color: "#9ca3af", cursor: "not-allowed" }
  };

  // Handle forgot password - Send OTP
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!email) {
      setError("Please enter your email.");
      setIsLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.exists) {
        setSuccess("OTP sent to your email. Please check your inbox.");
        setStage("otp");
        setResendTimer(60);
      } else {
        setError(data.error || "Email not registered.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/verify-otp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, purpose: "password_reset" }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("OTP verified! You can now reset your password.");
        setStage("reset");
      } else {
        setError(data.error || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch("http://localhost:8000/api/resend-otp/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "password_reset" }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("New OTP sent to your email.");
        setResendTimer(60);
      } else {
        setError(data.error || "Failed to resend OTP.");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password with proper validation
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    // Validate all password requirements before proceeding
    if (!isPasswordValid()) {
      setError("Please meet all password requirements before resetting your password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Password successfully reset! You can now login.");
        setStage("success");
        setEmail("");
        setNewPassword("");
        setConfirmPassword("");
        setOtp("");
      } else {
        // Handle server-side validation errors
        if (data.error) {
          setError(data.error);
        } else if (data.errors) {
          // Handle validation errors from backend
          const errorMessages = Object.values(data.errors).flat().join(", ");
          setError(errorMessages);
        } else {
          setError("Failed to reset password. Please ensure your password meets all requirements.");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle OTP input change
  const handleOtpChange = (e, index) => {
    const value = e.target.value;
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = otp.split('');
    newOtp[index] = value;
    setOtp(newOtp.join(''));
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleBackToLogin = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onBack) onBack();
    }, 300);
  };

  // Add CSS animations
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
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
      
      @keyframes pop {
        0% { transform: scale(0.95); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern}></div>
      <div style={styles.overlay}></div>
      
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

      <div
        style={styles.backLink}
        onClick={handleBackToLogin}
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
        <ArrowLeft size={18} style={{ transition: "transform 0.3s ease" }} />
        Back to Login
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
          <h1 style={styles.title}>
            {stage === "forgot" ? "Forgot Password?" : stage === "otp" ? "Verify OTP" : stage === "reset" ? "Reset Password" : "Success!"}
          </h1>
          <p style={styles.subtitle}>
            {stage === "forgot"
              ? "Enter your email to receive a verification code."
              : stage === "otp"
              ? `We've sent a 6-digit code to ${email}`
              : stage === "reset"
              ? "Enter your new password below."
              : "Your password has been reset successfully!"}
          </p>
        </div>

        {stage !== "success" ? (
          <form style={styles.form} onSubmit={
            stage === "forgot" ? handleForgotPassword : 
            stage === "otp" ? handleVerifyOTP : 
            handleResetPassword
          }>
            {stage === "forgot" && (
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
                      borderColor: error ? "#ef4444" : email ? "#B8763E" : "#e5e7eb",
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
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}

            {stage === "otp" && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Verification Code</label>
                  <div style={styles.otpContainer}>
                    {[...Array(6)].map((_, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength="1"
                        value={otp[index] || ""}
                        onChange={(e) => handleOtpChange(e, index)}
                        style={{
                          ...styles.otpInput,
                          borderColor: error ? "#ef4444" : otp[index] ? "#B8763E" : "#e5e7eb",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "#B8763E"
                          e.target.style.boxShadow = "0 0 0 3px rgba(184, 118, 62, 0.1)"
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = otp[index] ? "#B8763E" : "#e5e7eb"
                          e.target.style.boxShadow = "none"
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resendTimer > 0 || isLoading}
                      style={{
                        ...styles.resendButton,
                        ...(resendTimer > 0 ? styles.resendDisabled : {})
                      }}
                    >
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Code"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {stage === "reset" && (
              <>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>New Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock style={styles.inputIcon} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{
                        ...styles.input,
                        paddingRight: "3rem",
                        borderColor: error ? "#ef4444" : newPassword ? "#B8763E" : "#e5e7eb",
                        backgroundColor: newPassword ? "#ffffff" : "#fafafa",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#B8763E"
                        e.target.style.backgroundColor = "#ffffff"
                        e.target.style.boxShadow = "0 0 0 3px rgba(184, 118, 62, 0.1)"
                        e.target.previousElementSibling.style.color = "#B8763E"
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = newPassword ? "#B8763E" : "#e5e7eb"
                        e.target.style.backgroundColor = newPassword ? "#ffffff" : "#fafafa"
                        e.target.style.boxShadow = "none"
                        e.target.previousElementSibling.style.color = "#9ca3af"
                      }}
                      placeholder="Enter new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.toggleIcon}
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

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Confirm Password</label>
                  <div style={styles.inputWrapper}>
                    <Lock style={styles.inputIcon} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{
                        ...styles.input,
                        paddingRight: "3rem",
                        borderColor: error ? "#ef4444" : confirmPassword ? "#B8763E" : "#e5e7eb",
                        backgroundColor: confirmPassword ? "#ffffff" : "#fafafa",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#B8763E"
                        e.target.style.backgroundColor = "#ffffff"
                        e.target.style.boxShadow = "0 0 0 3px rgba(184, 118, 62, 0.1)"
                        e.target.previousElementSibling.style.color = "#B8763E"
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = confirmPassword ? "#B8763E" : "#e5e7eb"
                        e.target.style.backgroundColor = confirmPassword ? "#ffffff" : "#fafafa"
                        e.target.style.boxShadow = "none"
                        e.target.previousElementSibling.style.color = "#9ca3af"
                      }}
                      placeholder="Confirm your new password"
                      required
                    />
                  </div>
                </div>

                {/* Password Requirements Display */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200/50">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                    <Key className="w-5 h-5 text-green-600" />
                    <span>Password Requirements</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      {passwordRequirements.minLength ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">At least 8 characters long</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {passwordRequirements.hasUppercase ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">Contains uppercase letters</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {passwordRequirements.hasLowercase ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">Contains lowercase letters</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {passwordRequirements.hasNumber ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">Contains numbers</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {passwordRequirements.hasSpecialChar ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">Contains special characters</span>
                    </div>
                    <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-200">
                      {newPassword === confirmPassword && confirmPassword.length > 0 ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">Passwords match</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div style={{ ...styles.message, ...styles.errorMessage }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}
            
            {success && (
              <div style={{ ...styles.message, ...styles.successMessage }}>
                <CheckCircle size={18} /> {success}
              </div>
            )}

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
                  {stage === "forgot" ? "Sending..." : stage === "otp" ? "Verifying..." : "Resetting..."}
                </span>
              ) : (
                stage === "forgot" ? "Send Verification Code" : 
                stage === "otp" ? "Verify Code" : 
                "Reset Password"
              )}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ 
              ...styles.message, 
              ...styles.successMessage, 
              justifyContent: "center", 
              marginBottom: "1.5rem",
              animation: "pop 0.3s ease"
            }}>
              <CheckCircle size={20} /> {success}
            </div>
            <button
              onClick={handleBackToLogin}
              style={styles.button}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#a0612a"
                e.target.style.transform = "translateY(-2px)"
                e.target.style.boxShadow = "0 8px 20px rgba(184, 118, 62, 0.35)"
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#B8763E"
                e.target.style.transform = "translateY(0)"
                e.target.style.boxShadow = "0 4px 6px rgba(184, 118, 62, 0.25)"
              }}
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ForgotPass;