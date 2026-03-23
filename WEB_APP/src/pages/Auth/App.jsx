import {
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  Mail,
  MessageSquare,
  Phone,
  Shield,
  Users,
  MapPin
} from "lucide-react"
import { useState } from "react"
import LogIn from "./logIn"

function App() {
  const [currentPage, setCurrentPage] = useState("home")
  const [showLearnMore, setShowLearnMore] = useState(false)
  const [imageHovered, setImageHovered] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)

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
    logoImage: {
      height: "2.5rem",
      width: "auto",
      transition: "transform 0.2s",
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
      transition: "all 0.3s ease-in-out",
      cursor: "pointer",
    },
    cardIcon: {
      width: "3rem",
      height: "3rem",
      borderRadius: "0.75rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 1rem",
      transition: "transform 0.3s ease-in-out",
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
      transition: "all 0.2s",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.25rem",
    },
    modal: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem",
      animation: "fadeIn 0.3s ease-out",
    },
    modalContent: {
      backgroundColor: "white",
      borderRadius: "1rem",
      padding: "2rem",
      maxWidth: "650px",
      width: "100%",
      maxHeight: "85vh",
      overflowY: "auto",
      position: "relative",
      animation: "slideInUp 0.4s ease-out",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
    },
    closeButton: {
      position: "absolute",
      top: "1rem",
      right: "1rem",
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: "0.5rem",
      width: "2rem",
      height: "2rem",
      fontSize: "1.25rem",
      cursor: "pointer",
      color: "#6b7280",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
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
    contactCard: {
      background: "linear-gradient(135deg, #fef3e2 0%, #fff 100%)",
      padding: "1.5rem",
      borderRadius: "1rem",
      marginBottom: "1.5rem",
      border: "1px solid #fde68a",
      transition: "all 0.3s",
    },
    infoRow: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      marginBottom: "1rem",
      padding: "0.75rem",
      borderRadius: "0.5rem",
      backgroundColor: "white",
      transition: "all 0.2s",
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
    @keyframes slideInUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    .card-hover:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border-color: #B8763E;
    }
    
    .card-hover:hover .card-icon {
      transform: scale(1.1);
    }
    
    .button-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(184, 118, 62, 0.3);
    }
    
    .button-hover:active {
      transform: translateY(0);
    }
    
    .nav-link-hover:hover {
      color: #B8763E;
      transform: translateY(-1px);
    }
    
    .footer-link-hover:hover {
      color: #B8763E;
      transform: translateX(2px);
    }
    
    .close-button-hover:hover {
      background-color: #fee2e2;
      color: #dc2626;
      transform: rotate(90deg) scale(1.1);
    }
    
    .info-row-hover:hover {
      transform: translateX(5px);
      background-color: #fef3e2;
      box-shadow: 0 2px 8px rgba(184, 118, 62, 0.1);
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
          <img 
            src="/Images/echo.png" 
            alt="Echo Logo" 
            style={styles.logoImage}
          />
        </a>
        <nav style={styles.nav}>
          <a 
            href="#features" 
            style={{...styles.navLink, transition: "all 0.2s"}}
            className="nav-link-hover"
            onMouseEnter={(e) => e.target.style.color = "#B8763E"}
            onMouseLeave={(e) => e.target.style.color = "#374151"}
          >
            Features
          </a>
          <a 
            href="#benefits" 
            style={{...styles.navLink, transition: "all 0.2s"}}
            className="nav-link-hover"
            onMouseEnter={(e) => e.target.style.color = "#B8763E"}
            onMouseLeave={(e) => e.target.style.color = "#374151"}
          >
            Benefits
          </a>
          <a 
            href="#" 
            style={{...styles.navLink, transition: "all 0.2s"}}
            className="nav-link-hover"
            onMouseEnter={(e) => e.target.style.color = "#B8763E"}
            onMouseLeave={(e) => e.target.style.color = "#374151"}
            onClick={(e) => {
              e.preventDefault();
              setShowContactModal(true);
            }}
          >
            Support
          </a>
        </nav>
        <div style={styles.buttonContainer}>
          <button 
            style={{ ...styles.button, ...styles.secondaryButton, transition: "all 0.2s" }}
            className="button-hover"
            onClick={() => setCurrentPage("login")}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)"
              e.target.style.boxShadow = "0 10px 15px -3px rgba(184, 118, 62, 0.2)"
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)"
              e.target.style.boxShadow = "none"
            }}
          >
            Sign In
          </button>
          <button 
            style={{ ...styles.button, ...styles.primaryButton, transition: "all 0.2s" }}
            className="button-hover"
            onClick={() => setCurrentPage("login")}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)"
              e.target.style.boxShadow = "0 10px 15px -3px rgba(184, 118, 62, 0.3)"
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)"
              e.target.style.boxShadow = "none"
            }}
          >
            Get Started
          </button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section style={styles.hero}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
               Smarter Horse Care Starts with <span style={{ color: "#B8763E" }}>Echo</span>
            </h1>
            <p style={styles.heroSubtitle}>
              A dedicated platform for managing horse health records, scheduling veterinary care, and enhancing communication between veterinarians and kutseros.
            </p>
            <div style={styles.heroButtons}>
              <button
                style={{ ...styles.largeButton, ...styles.primaryButton, transition: "all 0.2s" }}
                className="button-hover"
                onMouseEnter={(e) => {
                  setImageHovered(true)
                  e.target.style.transform = "translateY(-2px)"
                  e.target.style.boxShadow = "0 10px 15px -3px rgba(184, 118, 62, 0.3)"
                }}
                onMouseLeave={(e) => {
                  setImageHovered(false)
                  e.target.style.transform = "translateY(0)"
                  e.target.style.boxShadow = "none"
                }}
                onClick={() => setCurrentPage("login")}
              >
                Get Started
                <ArrowRight size={16} />
              </button>
              <button
                style={{ ...styles.largeButton, ...styles.secondaryButton, transition: "all 0.2s" }}
                className="button-hover"
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
            <div 
              style={styles.card}
              className="card-hover"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)"
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                e.currentTarget.style.borderColor = "#B8763E"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
                e.currentTarget.style.borderColor = "#e5e7eb"
              }}
            >
              <div 
                style={{ ...styles.cardIcon, backgroundColor: "#fef3e2", transition: "transform 0.3s ease-in-out" }}
                className="card-icon"
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
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

            <div 
              style={styles.card}
              className="card-hover"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)"
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                e.currentTarget.style.borderColor = "#B8763E"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
                e.currentTarget.style.borderColor = "#e5e7eb"
              }}
            >
              <div 
                style={{ ...styles.cardIcon, backgroundColor: "#e0f2fe", transition: "transform 0.3s ease-in-out" }}
                className="card-icon"
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
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

            <div 
              style={styles.card}
              className="card-hover"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)"
                e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                e.currentTarget.style.borderColor = "#B8763E"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
                e.currentTarget.style.borderColor = "#e5e7eb"
              }}
            >
              <div 
                style={{ ...styles.cardIcon, backgroundColor: "#f3e8ff", transition: "transform 0.3s ease-in-out" }}
                className="card-icon"
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
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
              className="card-hover"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <div 
                style={{ ...styles.cardIcon, backgroundColor: "#fef3e2", transition: "transform 0.3s ease-in-out" }}
                className="card-icon"
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
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
              className="card-hover"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <div 
                style={{ ...styles.cardIcon, backgroundColor: "#e0f2fe", transition: "transform 0.3s ease-in-out" }}
                className="card-icon"
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
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
              className="card-hover"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <div 
                style={{ ...styles.cardIcon, backgroundColor: "#f3e8ff", transition: "transform 0.3s ease-in-out" }}
                className="card-icon"
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <MessageSquare size={32} color="#7c3aed" />
              </div>
              <h3 style={styles.cardTitle}>Stay Connected</h3>
              <p style={styles.cardDescription}>Seamless communication with horse owners and staff</p>
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
              style={{ ...styles.largeButton, backgroundColor: "white", color: "#B8763E", transition: "all 0.2s" }}
              className="button-hover"
              onMouseEnter={(e) => {
                setImageHovered(true)
                e.target.style.transform = "translateY(-2px)"
                e.target.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.2)"
              }}
              onMouseLeave={(e) => {
                setImageHovered(false)
                e.target.style.transform = "translateY(0)"
                e.target.style.boxShadow = "none"
              }}
              onClick={() => setCurrentPage("login")}
            >
              Get Started Today
            </button>
            <button
              style={{
                ...styles.largeButton,
                backgroundColor: "transparent",
                color: "white",
                border: "1px solid white",
                transition: "all 0.2s"
              }}
              className="button-hover"
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)"
                e.target.style.backgroundColor = "rgba(255, 255, 255, 0.1)"
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)"
                e.target.style.backgroundColor = "transparent"
              }}
              onClick={() => setShowLearnMore(true)}
            >
              Learn More
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>© 2025 Echo. All rights reserved.</p>
          <nav style={styles.footerNav}>
            <a 
              href="#" 
              style={{...styles.footerLink, transition: "all 0.2s"}}
              className="footer-link-hover"
              onMouseEnter={(e) => {
                e.target.style.color = "#B8763E"
                e.target.style.transform = "translateX(2px)"
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#6b7280"
                e.target.style.transform = "translateX(0)"
              }}
              onClick={(e) => {
                e.preventDefault();
                setShowTermsModal(true);
              }}
            >
              Terms and Policy
            </a>
            <a 
              href="#" 
              style={{...styles.footerLink, transition: "all 0.2s"}}
              className="footer-link-hover"
              onMouseEnter={(e) => {
                e.target.style.color = "#B8763E"
                e.target.style.transform = "translateX(2px)"
              }}
              onMouseLeave={(e) => {
                e.target.style.color = "#6b7280"
                e.target.style.transform = "translateX(0)"
              }}
              onClick={(e) => {
                e.preventDefault();
                setShowContactModal(true);
              }}
            >
              <Mail size={12} />
              Contact Support
            </a>
          </nav>
        </div>
      </footer>

      {/* Learn More Modal */}
      {showLearnMore && (
        <div style={styles.modal} onClick={() => setShowLearnMore(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              style={styles.closeButton}
              className="close-button-hover"
              onClick={() => setShowLearnMore(false)}
            >
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
              style={{ ...styles.largeButton, ...styles.primaryButton, width: "100%", justifyContent: "center", transition: "all 0.2s" }}
              className="button-hover"
              onClick={() => setCurrentPage("login")}
            >
              Get Started Now
            </button>
          </div>
        </div>
      )}

      {/* Contact Support Modal - Beautified */}
      {showContactModal && (
        <div style={styles.modal} onClick={() => setShowContactModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              style={styles.closeButton}
              className="close-button-hover"
              onClick={() => setShowContactModal(false)}
            >
              ×
            </button>
            
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{
                width: "4rem",
                height: "4rem",
                backgroundColor: "#fef3e2",
                borderRadius: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
                animation: "float 3s ease-in-out infinite"
              }}>
                <MessageSquare size={32} color="#B8763E" />
              </div>
              <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#B8763E", marginBottom: "0.5rem" }}>
                We're Here to Help!
              </h2>
              <p style={{ color: "#6b7280", fontSize: "1rem" }}>
                Get in touch with our support team for any assistance
              </p>
            </div>

            <div style={styles.contactCard}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Mail size={20} color="#B8763E" />
                Email Support
              </h3>
              <div 
                style={styles.infoRow}
                className="info-row-hover"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(5px)"
                  e.currentTarget.style.backgroundColor = "#fef3e2"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)"
                  e.currentTarget.style.backgroundColor = "white"
                }}
              >
                <div style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  backgroundColor: "#B8763E",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <Mail size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}>Primary Email</p>
                  <p style={{ fontWeight: "600", color: "#B8763E", margin: 0 }}>echosys.ph@gmail.com</p>
                </div>
                <button
                  onClick={() => window.location.href = "mailto:echosys.ph@gmail.com"}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#B8763E",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#9a5e32"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#B8763E"}
                >
                  Compose
                </button>
              </div>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "1rem", padding: "0.75rem", backgroundColor: "white", borderRadius: "0.5rem" }}>
                📬 Response time: Within 24 hours. Please include your account details and a detailed description of your issue.
              </p>
            </div>

            <div style={{ ...styles.contactCard, background: "linear-gradient(135deg, #e0f2fe 0%, #fff 100%)", borderColor: "#bae6fd" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Phone size={20} color="#0284c7" />
                Hotline Support
              </h3>
              <div 
                style={styles.infoRow}
                className="info-row-hover"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(5px)"
                  e.currentTarget.style.backgroundColor = "#e0f2fe"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)"
                  e.currentTarget.style.backgroundColor = "white"
                }}
              >
                <div style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  backgroundColor: "#0284c7",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <Phone size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}>Support Hotline</p>
                  <p style={{ fontWeight: "600", color: "#0284c7", margin: 0 }}>(032) 123-4567</p>
                </div>
                <button
                  onClick={() => window.location.href = "tel:+63231234567"}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#0284c7",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#0369a1"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#0284c7"}
                >
                  Call Now
                </button>
              </div>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "1rem", padding: "0.75rem", backgroundColor: "white", borderRadius: "0.5rem" }}>
                🕐 Available: Monday - Friday, 8:00 AM - 5:00 PM (PHT)
              </p>
            </div>

            <div style={{ ...styles.contactCard, background: "linear-gradient(135deg, #f3e8ff 0%, #fff 100%)", borderColor: "#e9d5ff" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MapPin size={20} color="#7c3aed" />
                Office Location
              </h3>
              <div 
                style={styles.infoRow}
                className="info-row-hover"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(5px)"
                  e.currentTarget.style.backgroundColor = "#f3e8ff"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)"
                  e.currentTarget.style.backgroundColor = "white"
                }}
              >
                <div style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  backgroundColor: "#7c3aed",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <MapPin size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: 0 }}>Main Office</p>
                  <p style={{ fontWeight: "600", color: "#7c3aed", margin: 0 }}>CTU Main Campus, Cebu City, Philippines</p>
                </div>
              </div>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "1rem", padding: "0.75rem", backgroundColor: "white", borderRadius: "0.5rem" }}>
                📍 Visit us during business hours for in-person assistance
              </p>
            </div>

            <button
              style={{ 
                ...styles.largeButton, 
                ...styles.primaryButton, 
                width: "100%", 
                justifyContent: "center",
                marginTop: "1rem"
              }}
              className="button-hover"
              onClick={() => setShowContactModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Terms and Policy Modal - Beautified */}
      {showTermsModal && (
        <div style={styles.modal} onClick={() => setShowTermsModal(false)}>
          <div style={{...styles.modalContent, maxHeight: '85vh'}} onClick={(e) => e.stopPropagation()}>
            <button 
              style={styles.closeButton}
              className="close-button-hover"
              onClick={() => setShowTermsModal(false)}
            >
              ×
            </button>
            
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{
                width: "4rem",
                height: "4rem",
                backgroundColor: "#fef3e2",
                borderRadius: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem"
              }}>
                <Shield size={32} color="#B8763E" />
              </div>
              <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", color: "#B8763E", marginBottom: "0.5rem" }}>
                Terms and Policy
              </h2>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Last updated: March 2025
              </p>
            </div>
            
            <div style={{ maxHeight: "55vh", overflowY: "auto", paddingRight: "1rem" }}>
              {/* Terms and Policy Content */}
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", borderLeft: "3px solid #B8763E", paddingLeft: "0.75rem" }}>
                  1. Introduction
                </h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  Welcome to the ECHO Mobile Application (Equine Care and Health Optimization).
                  By registering and using this app, you agree to comply with and be bound by these Terms and Conditions.
                  The ECHO App is developed to support the Tartanilla Horse Health Management Program under the Department of Veterinary Medicine and Fisheries (DVMF) and the Cebu Technological University (CTU).
                </p>
                <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                  These terms apply to all DVMF Personnel, CTU-VETMED Staff, Veterinarians, and Kutsero Presidents using the mobile application to manage and monitor horse health records.
                </p>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", borderLeft: "3px solid #B8763E", paddingLeft: "0.75rem" }}>
                  2. User Responsibilities
                </h3>
                
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ fontWeight: "600", color: "#B8763E", marginBottom: "0.5rem" }}>a. DVMF (Department of Veterinary Medicine and Fisheries)</h4>
                  <ul style={{ color: "#6b7280", marginBottom: "1rem", paddingLeft: "1.5rem", lineHeight: "1.6" }}>
                    <li style={{ marginBottom: "0.5rem" }}>Oversee the implementation and monitoring of the Tartanilla Horse Health Management Program.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Provide technical guidance and support for equine health management practices.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Coordinate with CTU-VETMED for program updates, research, and development.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Ensure compliance with national animal health and welfare standards.</li>
                    <li>Monitor program effectiveness and implement improvements as needed.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ fontWeight: "600", color: "#B8763E", marginBottom: "0.5rem" }}>b. CTU-VETMED (Cebu Technological University - Veterinary Medicine)</h4>
                  <ul style={{ color: "#6b7280", marginBottom: "1rem", paddingLeft: "1.5rem", lineHeight: "1.6" }}>
                    <li style={{ marginBottom: "0.5rem" }}>Provide academic and technical expertise in equine health management.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Conduct research and development to improve the ECHO application features.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Train and supervise veterinarians and students involved in the program.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Maintain educational standards and curriculum integration.</li>
                    <li>Collaborate with DVMF for program evaluation and enhancement.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ fontWeight: "600", color: "#B8763E", marginBottom: "0.5rem" }}>c. Veterinarian</h4>
                  <ul style={{ color: "#6b7280", marginBottom: "1rem", paddingLeft: "1.5rem", lineHeight: "1.6" }}>
                    <li style={{ marginBottom: "0.5rem" }}>Conduct regular health checkups and medical assessments for all registered horses.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Update horse medical records accurately and promptly through the ECHO app.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Provide professional advice and treatment recommendations for horse health issues.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Coordinate with Kutsero Presidents for health monitoring and emergency responses.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Report critical health cases to DVMF and CTU-VETMED authorities.</li>
                    <li>Maintain professional ethics and standards in all veterinary practices.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ fontWeight: "600", color: "#B8763E", marginBottom: "0.5rem" }}>d. Kutsero President</h4>
                  <ul style={{ color: "#6b7280", marginBottom: "1rem", paddingLeft: "1.5rem", lineHeight: "1.6" }}>
                    <li style={{ marginBottom: "0.5rem" }}>Represent and coordinate all kutseros (drivers) under the Tartanilla program.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Ensure proper handling and welfare of horses during daily operations.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Monitor and report horse health conditions to assigned veterinarians.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Facilitate communication between kutseros, veterinarians, and program administrators.</li>
                    <li style={{ marginBottom: "0.5rem" }}>Organize training and orientation sessions for new kutseros.</li>
                    <li>Enforce compliance with animal welfare standards among all members.</li>
                  </ul>
                </div>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", borderLeft: "3px solid #B8763E", paddingLeft: "0.75rem" }}>
                  3. Data Privacy and Protection
                </h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  The ECHO App collects personal and animal health information necessary for communication and monitoring within the Tartanilla Program.
                </p>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  All collected data will be handled responsibly and in accordance with the principles of the Data Privacy Act of 2012 (Republic Act No. 10173).
                </p>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  Your data may be shared only with authorized DVMF and CTU personnel for official and program-related purposes.
                </p>
                <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                  The ECHO Team implements reasonable safeguards to protect your information from unauthorized use or disclosure.
                </p>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", borderLeft: "3px solid #B8763E", paddingLeft: "0.75rem" }}>
                  4. Account and Security
                </h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  You are solely responsible for maintaining the confidentiality of your login credentials.
                </p>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  Any actions performed under your account will be considered your responsibility.
                </p>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  You must immediately report any unauthorized use or suspected security breach to the ECHO Support Team.
                </p>
                <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                  The administrators reserve the right to suspend or deactivate accounts found to be in violation of these terms.
                </p>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", borderLeft: "3px solid #B8763E", paddingLeft: "0.75rem" }}>
                  5. Acceptable Use
                </h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  You agree to use the ECHO App only for legitimate and lawful purposes connected to the Tartanilla Program.
                </p>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  You must not tamper with the system, upload false information, or access other users' data without authorization.
                </p>
                <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                  Misuse of the app, including fraudulent or inappropriate activities, may result in permanent account termination.
                </p>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", borderLeft: "3px solid #B8763E", paddingLeft: "0.75rem" }}>
                  6. Limitation of Liability
                </h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  The ECHO App serves as a digital tool to assist in horse health tracking and communication; it does not replace physical veterinary consultations.
                </p>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  The developers, administrators, and partner institutions are not liable for any loss, injury, or damage caused by misuse of the app, inaccurate data, or user negligence.
                </p>
                <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                  Users are responsible for ensuring that all information entered into the system is correct and updated.
                </p>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827", marginBottom: "1rem", borderLeft: "3px solid #B8763E", paddingLeft: "0.75rem" }}>
                  7. Modifications to the Terms
                </h3>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  The ECHO Team may modify or update these Terms and Conditions at any time.
                </p>
                <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: "1.6" }}>
                  Users will be notified of significant changes through the mobile app.
                </p>
                <p style={{ color: "#6b7280", lineHeight: "1.6" }}>
                  Continued use of the application after updates constitutes your acceptance of the revised terms.
                </p>
              </div>
            </div>

            <button
              style={{ 
                ...styles.largeButton, 
                ...styles.primaryButton, 
                width: "100%", 
                justifyContent: "center",
                marginTop: "1rem"
              }}
              className="button-hover"
              onClick={() => setShowTermsModal(false)}
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App