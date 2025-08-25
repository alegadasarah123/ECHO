"use client"

import {
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  MessageSquare,
  Shield,
  Stethoscope,
  Users,
} from "lucide-react"
import { useState } from "react"
import LogIn from "./logIn"

function App() {
  const [currentPage, setCurrentPage] = useState("home")
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [imageHovered, setImageHovered] = useState(false)

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: "linear-gradient(to bottom, #fdf8f6, #ffffff)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      animation: "fadeIn 0.8s ease-in-out",
    },
    header: {
      padding: "0 1rem",
      height: "4rem",
      display: "flex",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(8px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      borderBottom: "1px solid #e5e7eb",
    },
    logo: {
      display: "flex",
      alignItems: "center",
      textDecoration: "none",
      gap: "0.5rem",
    },
    logoIcon: {
      width: "2rem",
      height: "2rem",
      backgroundColor: "#B8763E",
      borderRadius: "0.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "transform 0.2s",
    },
    logoText: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      color: "#B8763E",
      transition: "color 0.2s",
    },
    nav: {
      marginLeft: "auto",
      display: "flex",
      gap: "1.5rem",
    },
    navLink: {
      fontSize: "0.875rem",
      fontWeight: "500",
      color: "#374151",
      textDecoration: "none",
      transition: "color 0.2s",
      cursor: "pointer",
    },
    buttonContainer: {
      marginLeft: "1.5rem",
      display: "flex",
      gap: "0.5rem",
    },
    button: {
      padding: "0.5rem 1rem",
      fontSize: "0.875rem",
      fontWeight: "500",
      borderRadius: "0.375rem",
      border: "none",
      cursor: "pointer",
      transition: "all 0.2s",
    },
    primaryButton: {
      backgroundColor: "#B8763E",
      color: "white",
    },
    secondaryButton: {
      backgroundColor: "transparent",
      color: "#B8763E",
      border: "1px solid #B8763E",
    },
    hero: {
      width: "100%",
      padding: "3rem 1rem",
      display: "flex",
      alignItems: "center",
      gap: "3rem",
      maxWidth: "1200px",
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
    },
    heroContent: {
      flex: 1,
      textAlign: "left",
      animation: "slideInLeft 0.8s ease-out",
    },
    heroTitle: {
      fontSize: "3rem",
      fontWeight: "bold",
      color: "#111827",
      marginBottom: "1rem",
      lineHeight: "1.1",
    },
    heroSubtitle: {
      fontSize: "1.25rem",
      color: "#6b7280",
      marginBottom: "2rem",
      lineHeight: "1.6",
    },
    heroButtons: {
      display: "flex",
      gap: "1rem",
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: "2rem",
    },
    heroImage: {
      flex: 1,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      animation: "slideInRight 0.8s ease-out",
    },
    features: {
      display: "flex",
      justifyContent: "center",
      gap: "2rem",
      flexWrap: "wrap",
      color: "#6b7280",
      fontSize: "0.875rem",
    },
    featureItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    section: {
      width: "100%",
      padding: "4rem 1rem",
      backgroundColor: "#ffffff",
    },
    sectionAlt: {
      backgroundColor: "#f9fafb",
    },
    sectionTitle: {
      fontSize: "2.5rem",
      fontWeight: "bold",
      color: "#111827",
      textAlign: "center",
      marginBottom: "1rem",
    },
    sectionSubtitle: {
      fontSize: "1.125rem",
      color: "#6b7280",
      textAlign: "center",
      marginBottom: "3rem",
      maxWidth: "800px",
      margin: "0 auto 3rem",
    },
    cardGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "2rem",
      maxWidth: "1200px",
      margin: "0 auto",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "0.75rem",
      padding: "2rem",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      border: "1px solid #e5e7eb",
      transition: "all 0.2s",
    },
    cardIcon: {
      width: "3rem",
      height: "3rem",
      borderRadius: "0.75rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 1rem",
    },
    cardTitle: {
      fontSize: "1.25rem",
      fontWeight: "bold",
      color: "#111827",
      textAlign: "center",
      marginBottom: "0.5rem",
    },
    cardDescription: {
      color: "#6b7280",
      textAlign: "center",
      marginBottom: "1rem",
    },
    featureList: {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    },
    featureListItem: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      fontSize: "0.875rem",
    },
    ctaSection: {
      backgroundColor: "#B8763E",
      color: "white",
      textAlign: "center",
      padding: "4rem 1rem",
    },
    ctaTitle: {
      fontSize: "2.5rem",
      fontWeight: "bold",
      marginBottom: "1rem",
    },
    ctaSubtitle: {
      fontSize: "1.125rem",
      marginBottom: "2rem",
      opacity: 0.9,
    },
    ctaButtons: {
      display: "flex",
      gap: "1rem",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: "1rem",
    },
    footer: {
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      padding: "1.5rem 1rem",
      backgroundColor: "#f9fafb",
      borderTop: "1px solid #e5e7eb",
      alignItems: "center",
    },
    footerContent: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      maxWidth: "1200px",
      flexWrap: "wrap",
      gap: "1rem",
    },
    footerNav: {
      display: "flex",
      gap: "1.5rem",
      flexWrap: "wrap",
    },
    footerLink: {
      fontSize: "0.75rem",
      color: "#6b7280",
      textDecoration: "none",
      transition: "color 0.2s",
    },
    modal: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem",
    },
    modalContent: {
      backgroundColor: "white",
      borderRadius: "0.75rem",
      padding: "2rem",
      maxWidth: "600px",
      width: "100%",
      maxHeight: "80vh",
      overflowY: "auto",
      position: "relative",
    },
    closeButton: {
      position: "absolute",
      top: "1rem",
      right: "1rem",
      background: "none",
      border: "none",
      fontSize: "1.5rem",
      cursor: "pointer",
      color: "#6b7280",
    },
    largeButton: {
      padding: "0.75rem 2rem",
      fontSize: "1rem",
      fontWeight: "600",
      borderRadius: "0.5rem",
      border: "none",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      position: "relative",
      overflow: "hidden",
    },
  }

  const keyframes = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideInLeft {
      from { transform: translateX(-50px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideInRight {
      from { transform: translateX(50px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
  `

  if (currentPage === "login") {
    return <LogIn onBack={() => setCurrentPage("home")} />
  }

  return (
    <div style={styles.container}>
      <style>{keyframes}</style>

      {/* Header */}
      <header style={styles.header}>
        <a href="/" style={styles.logo}>
          <div style={styles.logoIcon}>
            <Stethoscope size={20} color="white" />
          </div>
          <span style={styles.logoText}>Echo</span>
        </a>
        <nav style={styles.nav}>
          <a href="#features" style={styles.navLink}>
            Features
          </a>
          <a href="#benefits" style={styles.navLink}>
            Benefits
          </a>
          <a href="#contact" style={styles.navLink}>
            Contact
          </a>
        </nav>
        <div style={styles.buttonContainer}>
          <button style={{ ...styles.button, ...styles.secondaryButton }} onClick={() => setCurrentPage("login")}>
            Sign In
          </button>
          <button style={{ ...styles.button, ...styles.primaryButton }}onClick={() => setCurrentPage("login")}>Get Started</button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              Streamline Your Veterinary Practice with <span style={{ color: "#B8763E" }}>Echo</span>
            </h1>
            <p style={styles.heroSubtitle}>
              The complete platform for veterinarians to manage horse medical records, appointments, and client
              communications all in one place.
            </p>
            <div style={styles.heroButtons}>
              <button
                style={{ ...styles.largeButton, ...styles.primaryButton }}
                onMouseEnter={() => setImageHovered(true)}
                onMouseLeave={() => setImageHovered(false)}
                onClick={() => setCurrentPage("login")} // <-- add this
              >
                Get Started
                <ArrowRight size={16} />
              </button>
              <button
                style={{ ...styles.largeButton, ...styles.secondaryButton }}
                onClick={() => setShowLearnMore(true)}
              >
                Learn More
              </button>
            </div>
            <div style={styles.features}>
              <div style={styles.featureItem}>
                <CheckCircle size={16} color="#B8763E" />
                Easy setup
              </div>
              <div style={styles.featureItem}>
                <Shield size={16} color="#B8763E" />
                Secure & reliable
              </div>
              <div style={styles.featureItem}>
                <Clock size={16} color="#B8763E" />
                24/7 support
              </div>
            </div>
          </div>

          <div style={styles.heroImage}>
            <img
              src="https://t4.ftcdn.net/jpg/02/46/23/73/360_F_246237304_IW2l3Z6VFoaHRSa0PAdModNl6FiCDRBL.jpg"
              alt="Modern veterinary clinic specializing in equine care"
              style={{
                width: "100%",
                maxWidth: "500px",
                height: "auto",
                borderRadius: "1rem",
                boxShadow: "0 10px 25px rgba(184, 118, 62, 0.1)",
                transform: imageHovered ? "scale(1.05) translateY(-5px)" : "scale(1) translateY(0)",
                transition: "all 0.3s ease-in-out",
                animation: imageHovered ? "pulse 2s infinite" : "float 3s ease-in-out infinite",
              }}
            />
          </div>
        </section>

        {/* Features Overview */}
        <section id="features" style={styles.section}>
          <h2 style={styles.sectionTitle}>Everything You Need to Manage Your Practice</h2>
          <p style={styles.sectionSubtitle}>
            Echo provides comprehensive tools for modern veterinary practices specializing in equine care.
          </p>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <div style={{ ...styles.cardIcon, backgroundColor: "#fef3e2" }}>
                <FileText size={24} color="#B8763E" />
              </div>
              <h3 style={styles.cardTitle}>Manage</h3>
              <p style={styles.cardDescription}>Complete control over your practice data</p>
              <div style={styles.featureList}>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  Account profiles
                </div>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  Horse medical records
                </div>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  Message history
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={{ ...styles.cardIcon, backgroundColor: "#e0f2fe" }}>
                <Heart size={24} color="#0284c7" />
              </div>
              <h3 style={styles.cardTitle}>Process</h3>
              <p style={styles.cardDescription}>Streamlined workflows for daily operations</p>
              <div style={styles.featureList}>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  User authentication
                </div>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  Health record updates
                </div>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  Appointment requests
                </div>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  Messaging system
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={{ ...styles.cardIcon, backgroundColor: "#f3e8ff" }}>
                <Bell size={24} color="#7c3aed" />
              </div>
              <h3 style={styles.cardTitle}>Monitor</h3>
              <p style={styles.cardDescription}>Stay on top of your practice activities</p>
              <div style={styles.featureList}>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  Appointment schedules
                </div>
                <div style={styles.featureListItem}>
                  <CheckCircle size={16} color="#B8763E" />
                  Real-time notifications
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" style={{ ...styles.section, ...styles.sectionAlt }}>
          <h2 style={styles.sectionTitle}>Why Veterinarians Choose Echo</h2>
          <p style={styles.sectionSubtitle}>
            Discover how Echo transforms your veterinary practice with powerful, intuitive tools.
          </p>
          <div style={styles.cardGrid}>
            <div
              style={{
                ...styles.card,
                textAlign: "center",
                border: "none",
                boxShadow: "none",
                backgroundColor: "transparent",
              }}
            >
              <div style={{ ...styles.cardIcon, backgroundColor: "#fef3e2" }}>
                <Clock size={32} color="#B8763E" />
              </div>
              <h3 style={styles.cardTitle}>Save Time</h3>
              <p style={styles.cardDescription}>Reduce administrative work by up to 40% with automated workflows</p>
            </div>
            <div
              style={{
                ...styles.card,
                textAlign: "center",
                border: "none",
                boxShadow: "none",
                backgroundColor: "transparent",
              }}
            >
              <div style={{ ...styles.cardIcon, backgroundColor: "#e0f2fe" }}>
                <Users size={32} color="#0284c7" />
              </div>
              <h3 style={styles.cardTitle}>Better Care</h3>
              <p style={styles.cardDescription}>Improve patient outcomes with comprehensive health tracking</p>
            </div>
            <div
              style={{
                ...styles.card,
                textAlign: "center",
                border: "none",
                boxShadow: "none",
                backgroundColor: "transparent",
              }}
            >
              <div style={{ ...styles.cardIcon, backgroundColor: "#f3e8ff" }}>
                <MessageSquare size={32} color="#7c3aed" />
              </div>
              <h3 style={styles.cardTitle}>Stay Connected</h3>
              <p style={styles.cardDescription}>Seamless communication with horse owners and staff</p>
            </div>
            <div
              style={{
                ...styles.card,
                textAlign: "center",
                border: "none",
                boxShadow: "none",
                backgroundColor: "transparent",
              }}
            >
              <div style={{ ...styles.cardIcon, backgroundColor: "#fed7aa" }}>
                <Shield size={32} color="#ea580c" />
              </div>
              <h3 style={styles.cardTitle}>Secure Data</h3>
              <p style={styles.cardDescription}>Enterprise-grade security keeps your data safe and compliant</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={styles.ctaSection}>
          <h2 style={styles.ctaTitle}>Ready to Transform Your Practice?</h2>
          <p style={styles.ctaSubtitle}>
            Be among the first veterinarians to experience the future of practice management.
          </p>
          <div style={styles.ctaButtons}>
            <button
              style={{ ...styles.largeButton, backgroundColor: "white", color: "#B8763E" }}
              onMouseEnter={() => setImageHovered(true)}
              onMouseLeave={() => setImageHovered(false)}
              onClick={() => setCurrentPage("login")} // <-- add this
            >
              Get Started Today
            </button>
            <button
              style={{
                ...styles.largeButton,
                backgroundColor: "transparent",
                color: "white",
                border: "1px solid white",
              }}
              onClick={() => setShowLearnMore(true)}
            >
              Learn More
            </button>
          </div>
          <p style={{ fontSize: "0.875rem", opacity: 0.9, marginTop: "1rem" }}>
            Professional veterinary management • Secure & compliant • Expert support
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.logo}>
            <div style={{ ...styles.logoIcon, width: "1.5rem", height: "1.5rem" }}>
              <Stethoscope size={16} color="white" />
            </div>
            <span style={{ ...styles.logoText, fontSize: "1.125rem" }}>Echo</span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>© 2025 Echo - Portal. All rights reserved.</p>
          <nav style={styles.footerNav}>
            <a href="#" style={styles.footerLink}>
              Privacy Policy
            </a>
            <a href="#" style={styles.footerLink}>
              Terms of Service
            </a>
            <a href="#" style={styles.footerLink} id="contact">
              Contact Support
            </a>
          </nav>
        </div>
      </footer>

      {/* Learn More Modal */}
      {showLearnMore && (
        <div style={styles.modal} onClick={() => setShowLearnMore(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeButton} onClick={() => setShowLearnMore(false)}>
              ×
            </button>
            <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#B8763E", marginBottom: "1rem" }}>
              Learn More About Echo
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
              Discover how Echo revolutionizes veterinary practice management with cutting-edge technology designed
              specifically for equine care professionals.
            </p>

            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem" }}>
                How Echo Works
              </h3>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      ...styles.cardIcon,
                      width: "2.5rem",
                      height: "2.5rem",
                      backgroundColor: "#fef3e2",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={20} color="#B8763E" />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                      Digital Record Management
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      Seamlessly digitize and organize all horse medical records with our intuitive interface.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      ...styles.cardIcon,
                      width: "2.5rem",
                      height: "2.5rem",
                      backgroundColor: "#e0f2fe",
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={20} color="#0284c7" />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>Smart Scheduling</h4>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      Automated appointment scheduling with conflict detection and client notifications.
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      ...styles.cardIcon,
                      width: "2.5rem",
                      height: "2.5rem",
                      backgroundColor: "#f3e8ff",
                      flexShrink: 0,
                    }}
                  >
                    <MessageSquare size={20} color="#7c3aed" />
                  </div>
                  <div>
                    <h4 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                      Client Communication
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      Built-in messaging system for seamless communication with horse owners.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem" }}>
                Getting Started is Easy
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "1.5rem",
                      height: "1.5rem",
                      backgroundColor: "#B8763E",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                    }}
                  >
                    1
                  </div>
                  <span style={{ fontSize: "0.875rem" }}>Sign up for your free Echo account</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "1.5rem",
                      height: "1.5rem",
                      backgroundColor: "#B8763E",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                    }}
                  >
                    2
                  </div>
                  <span style={{ fontSize: "0.875rem" }}>Import your existing records or start fresh</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "1.5rem",
                      height: "1.5rem",
                      backgroundColor: "#B8763E",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                    }}
                  >
                    3
                  </div>
                  <span style={{ fontSize: "0.875rem" }}>Customize your practice settings and preferences</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "1.5rem",
                      height: "1.5rem",
                      backgroundColor: "#B8763E",
                      color: "white",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                    }}
                  >
                    4
                  </div>
                  <span style={{ fontSize: "0.875rem" }}>Start managing your practice more efficiently</span>
                </div>
              </div>
            </div>

            <button
              style={{ ...styles.largeButton, ...styles.primaryButton, width: "100%", justifyContent: "center" }}
             onClick={() => setCurrentPage("login")}
            >
              Get Started Now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
