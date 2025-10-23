import { ArrowLeft, CheckCircle, Eye, EyeOff, Lock, Mail, Stethoscope } from "lucide-react";
import { useState } from "react";

function ForgotPass({ onBack }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState("forgot"); // "forgot" | "reset" | "success"
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const styles = {
    container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fdf8f6 0%, #ffffff 50%, #fdf8f6 100%)", padding: "1rem", position: "relative", fontFamily: "sans-serif" },
    card: { backgroundColor: "#fff", borderRadius: "1rem", padding: "2rem", boxShadow: "0 25px 50px rgba(184, 118, 62, 0.1)", width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 },
    backLink: { position: "absolute", top: "1rem", left: "2rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", cursor: "pointer", fontSize: "0.875rem", transition: "all 0.2s ease" },
    header: { textAlign: "center", marginBottom: "1.5rem" },
    logo: { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", marginBottom: "1rem" },
    logoIcon: { width: "3rem", height: "3rem", backgroundColor: "#B8763E", borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 25px rgba(184, 118, 62, 0.3)" },
    logoText: { fontSize: "2rem", fontWeight: "bold", color: "#B8763E" },
    title: { fontSize: "1.75rem", fontWeight: "bold", color: "#111827", marginBottom: "0.75rem" },
    subtitle: { color: "#6b7280", fontSize: "1rem", lineHeight: "1.5", marginBottom: "0.5rem" },
    form: { display: "flex", flexDirection: "column", gap: "1.25rem" },
    inputGroup: { display: "flex", flexDirection: "column", gap: "0.75rem" },
    label: { fontSize: "0.875rem", fontWeight: "600", color: "#374151" },
    inputWrapper: { position: "relative" },
    input: { width: "100%", padding: "1rem 1rem 1rem 2.75rem", border: "1px solid #d1d5db", borderRadius: "0.5rem", fontSize: "1rem", outline: "none", lineHeight: "1.5", transition: "all 0.2s ease" },
    inputIcon: { position: "absolute", left: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", width: "1rem", height: "1rem" },
    toggleIcon: { position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)", color: "#9ca3af", cursor: "pointer" },
    message: { padding: "0.75rem", borderRadius: "0.375rem", fontSize: "0.875rem", lineHeight: "1.4", display: "flex", alignItems: "center", gap: "0.5rem" },
    errorMessage: { backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" },
    successMessage: { backgroundColor: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0" },
    successIcon: { animation: "pop 0.3s ease" },
    button: { padding: "1rem 1.5rem", backgroundColor: "#B8763E", color: "white", border: "none", borderRadius: "0.5rem", fontSize: "1rem", fontWeight: "600", cursor: "pointer", transition: "all 0.2s ease" },
    buttonDisabled: { opacity: 0.7, cursor: "not-allowed" },
    backToLoginLink: { textAlign: "center", fontSize: "0.875rem", color: "#6b7280", marginTop: "1.5rem" },
    backToLoginLinkAnchor: { color: "#B8763E", cursor: "pointer", fontWeight: "600" },
  };

  // Forgot password
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

    try {
      const response = await fetch("http://localhost:8000/api/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.exists) {
          setSuccess("Email exists! You can now reset your password.");
          setStage("reset");
        } else {
          setError("Email not registered.");
          setStage("forgot");
        }
      } else {
        setError(data.error || "Something went wrong.");
        setStage("forgot");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
      setStage("forgot");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess("Password successfully reset! You can now login.");
        setStage("success"); // ✅ show success-only UI
        setEmail("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error(err);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          .fade-slide-enter { opacity: 0; transform: translateY(-20px); }
          .fade-slide-enter-active { opacity: 1; transform: translateY(0); transition: all 300ms ease-in-out; }
          .fade-slide-exit { opacity: 1; transform: translateY(0); }
          .fade-slide-exit-active { opacity: 0; transform: translateY(20px); transition: all 300ms ease-in-out; }
        `}
      </style>

      <div style={styles.backLink} onClick={onBack}>
        <ArrowLeft size={16} />
        Back to Login
      </div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>
              <Stethoscope size={24} color="white" />
            </div>
            <span style={styles.logoText}>Echo</span>
          </div>
          <h1 style={styles.title}>
            {stage === "forgot" ? "Forgot Password?" : stage === "reset" ? "Reset Password" : "Success"}
          </h1>
          <p style={styles.subtitle}>
            {stage === "forgot"
              ? "Enter your email."
              : stage === "reset"
              ? "Enter new password and confirm."
              : ""}
          </p>
        </div>

        {stage !== "success" ? (
          <form style={styles.form} onSubmit={stage === "forgot" ? handleForgotPassword : handleResetPassword}>
            {stage === "forgot" && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email Address</label>
                <div style={styles.inputWrapper}>
                  <Mail style={styles.inputIcon} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ ...styles.input, borderColor: error ? "#ef4444" : "#d1d5db" }}
                    placeholder="Enter your email"
                    disabled={isLoading}
                    required
                    className="fade-slide-enter-active"
                  />
                </div>
              </div>
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
                      style={{ ...styles.input, borderColor: error ? "#ef4444" : "#d1d5db" }}
                      placeholder="Enter new password"
                      required
                      className="fade-slide-enter-active"
                    />
                    <span style={styles.toggleIcon} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </span>
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
                      style={{ ...styles.input, borderColor: error ? "#ef4444" : "#d1d5db" }}
                      placeholder="Confirm password"
                      required
                      className="fade-slide-enter-active"
                    />
                    <span style={styles.toggleIcon} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </span>
                  </div>
                </div>
              </>
            )}

            {error && <div style={{ ...styles.message, ...styles.errorMessage }}>{error}</div>}
            {success && <div style={{ ...styles.message, ...styles.successMessage }}>
              <CheckCircle size={18} style={styles.successIcon} />{success}
            </div>}

            <button type="submit" style={{ ...styles.button, ...(isLoading ? styles.buttonDisabled : {}) }} disabled={isLoading}>
              {isLoading ? (stage === "forgot" ? "Checking..." : "Resetting...") : stage === "forgot" ? "Continue" : "Reset Password"}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ ...styles.message, ...styles.successMessage, justifyContent: "center", marginBottom: "1rem" }}>
              <CheckCircle size={18} style={styles.successIcon} /> {success}
            </div>
            <div style={styles.backToLoginLink}>
              <span onClick={onBack} style={styles.backToLoginLinkAnchor}>Back to Sign In</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPass;
