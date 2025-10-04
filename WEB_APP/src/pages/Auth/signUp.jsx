import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, User, MapPin, Briefcase, Lock, Eye, EyeOff, 
  Stethoscope, Upload, X, ZoomIn, ZoomOut, Check, AlertCircle, FileText
} from "lucide-react";
import { provinces, getCities, getBarangays } from "./philippinesData";

function SignUp() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const fileInputRef = useRef(null);
  const profileInputRef = useRef(null);
  const [focusedField, setFocusedField] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Step 1 - Personal Info
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Step 2 - Address
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [zipCode, setZipCode] = useState("");
  
  // Clinic Address
  const [clinicProvince, setClinicProvince] = useState("");
  const [clinicCity, setClinicCity] = useState("");
  const [clinicBarangay, setClinicBarangay] = useState("");
  const [clinicStreet, setClinicStreet] = useState("");
  const [clinicZipCode, setClinicZipCode] = useState("");
  const [vetAddressIsClinic, setVetAddressIsClinic] = useState(true);

  // Step 3 - Professional Info
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [affiliatedOrganization, setAffiliatedOrganization] = useState("");
  const [document, setDocument] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Step 4 - Profile Photo
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);

  // Step 5 - Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const totalSteps = 5;

  // Get cities and barangays based on selections
  const cities = getCities(province);
  const barangays = getBarangays(province, city);
  const clinicCities = getCities(clinicProvince);
  const clinicBarangays = getBarangays(clinicProvince, clinicCity);

  // Reset dependent fields when province changes
  useEffect(() => {
    if (province) {
      setCity("");
      setBarangay("");
    }
  }, [province]);

  useEffect(() => {
    if (city) {
      setBarangay("");
    }
  }, [city]);

  useEffect(() => {
    if (clinicProvince) {
      setClinicCity("");
      setClinicBarangay("");
    }
  }, [clinicProvince]);

  useEffect(() => {
    if (clinicCity) {
      setClinicBarangay("");
    }
  }, [clinicCity]);

  // Update clinic address when permanent address changes and checkbox is checked
  useEffect(() => {
    if (vetAddressIsClinic) {
      setClinicProvince(province);
      setClinicCity(city);
      setClinicBarangay(barangay);
      setClinicStreet(street);
      setClinicZipCode(zipCode);
    }
  }, [province, city, barangay, street, zipCode, vetAddressIsClinic]);

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrors({});
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => { 
    setErrors({}); 
    setCurrentStep(prev => Math.max(prev - 1, 1)); 
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!firstName.trim()) newErrors.firstName = "First name is required.";
      if (!lastName.trim()) newErrors.lastName = "Last name is required.";
      if (!dob) newErrors.dob = "Date of Birth is required.";
      else {
        const today = new Date();
        const birthDate = new Date(dob);
        if (birthDate > today) newErrors.dob = "Birthdate cannot be in the future.";
      }
      if (!sex) newErrors.sex = "Sex is required.";
      if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required.";
      else if (!/^(\+63|0)9\d{9}$/.test(phoneNumber)) 
        newErrors.phoneNumber = "Phone number must start with +63 or 09 and be 11 digits.";
    } else if (step === 2) {
      // Permanent address validation
      if (!province) newErrors.province = "Province is required.";
      if (!city) newErrors.city = "City is required.";
      if (!barangay) newErrors.barangay = "Barangay is required.";
      if (!zipCode.trim()) newErrors.zipCode = "ZIP Code is required.";
      else if (!/^\d{4}$/.test(zipCode)) newErrors.zipCode = "ZIP Code must be 4 digits.";
      
      // Clinic address validation - only if not using permanent address
      if (!vetAddressIsClinic) {
        if (!clinicProvince) newErrors.clinicProvince = "Clinic province is required.";
        if (!clinicCity) newErrors.clinicCity = "Clinic city is required.";
        if (!clinicBarangay) newErrors.clinicBarangay = "Clinic barangay is required.";
        // Clinic zip code is optional but must be valid if provided
        if (clinicZipCode && !/^\d{4}$/.test(clinicZipCode)) newErrors.clinicZipCode = "Clinic ZIP Code must be 4 digits.";
      }
    } else if (step === 3) {
      if (!licenseNumber.trim()) newErrors.licenseNumber = "License number is required.";
      else if (!/^\d{7}$/.test(licenseNumber)) newErrors.licenseNumber = "License number must be 7 digits.";
      if (!yearsOfExperience.trim()) newErrors.yearsOfExperience = "Years of experience is required.";
      if (!document) newErrors.document = "A document is required.";
    } else if (step === 5) {
      if (touched.email) {
        if (!email.trim()) newErrors.email = "Email address is required.";
        else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid email address.";
      }
      
      if (touched.password) {
        if (!password) newErrors.password = "Password is required.";
        else if (password.length < 8) newErrors.password = "Password must be at least 8 characters.";
      }
      
      if (touched.confirmPassword) {
        if (!confirmPassword) newErrors.confirmPassword = "Confirm password is required.";
        if (password && confirmPassword && password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
      }

      // Terms and conditions validation
      if (!acceptedTerms) {
        newErrors.terms = "You must accept the Terms and Conditions to proceed.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };  

  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setErrors({...errors, document: "Please upload a PDF file only."});
      return;
    }
    
    setDocument(file);
    setErrors({...errors, document: ""});
  };

  const removeDocument = () => {
    if (documentPreview) URL.revokeObjectURL(documentPreview);
    setDocument(null);
    setDocumentPreview(null);
  };

  const openDocumentPreview = (file) => {
    const fileURL = URL.createObjectURL(file);
    setDocumentPreview(fileURL);
    setZoomLevel(1);
  };

  const closeDocumentPreview = () => {
    if (documentPreview) URL.revokeObjectURL(documentPreview);
    setDocumentPreview(null);
  };

  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setErrors({...errors, profilePhoto: "Please upload an image file."});
      return;
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({...errors, profilePhoto: "Image size must be less than 5MB."});
      return;
    }
    
    setProfilePhoto(file);
    setProfilePreview(URL.createObjectURL(file));
    setErrors({...errors, profilePhoto: ""});
  };

  const removeProfilePhoto = () => {
    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setProfilePhoto(null);
    setProfilePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    
    // Validate all steps before submitting
    let isValid = true;
    const allErrors = {};
    
    // Validate step 1
    if (!firstName.trim()) allErrors.firstName = "First name is required.";
    if (!lastName.trim()) allErrors.lastName = "Last name is required.";
    if (!dob) allErrors.dob = "Date of Birth is required.";
    else {
      const today = new Date();
      const birthDate = new Date(dob);
      if (birthDate > today) allErrors.dob = "Birthdate cannot be in the future.";
    }
    if (!sex) allErrors.sex = "Sex is required.";
    if (!phoneNumber.trim()) allErrors.phoneNumber = "Phone number is required.";
    else if (!/^(\+63|0)9\d{9}$/.test(phoneNumber)) 
      allErrors.phoneNumber = "Phone number must start with +63 or 09 and be 11 digits.";
    
    // Validate step 2
    if (!province) allErrors.province = "Province is required.";
    if (!city) allErrors.city = "City is required.";
    if (!barangay) allErrors.barangay = "Barangay is required.";
    if (!zipCode.trim()) allErrors.zipCode = "ZIP Code is required.";
    else if (!/^\d{4}$/.test(zipCode)) allErrors.zipCode = "ZIP Code must be 4 digits.";
    
    // Clinic address validation - only required fields
    if (!vetAddressIsClinic) {
      if (!clinicProvince) allErrors.clinicProvince = "Clinic province is required.";
      if (!clinicCity) allErrors.clinicCity = "Clinic city is required.";
      if (!clinicBarangay) allErrors.clinicBarangay = "Clinic barangay is required.";
      // Clinic zip code is optional but must be valid if provided
      if (clinicZipCode && !/^\d{4}$/.test(clinicZipCode)) allErrors.clinicZipCode = "Clinic ZIP Code must be 4 digits.";
    }
    
    // Validate step 3
    if (!licenseNumber.trim()) allErrors.licenseNumber = "License number is required.";
    else if (!/^\d{7}$/.test(licenseNumber)) allErrors.licenseNumber = "License number must be 7 digits.";
    if (!yearsOfExperience.trim()) allErrors.yearsOfExperience = "Years of experience is required.";
    if (!document) allErrors.document = "A document is required.";
    
    // Validate step 5
    if (!email.trim()) allErrors.email = "Email address is required.";
    else if (!/\S+@\S+\.\S+/.test(email)) allErrors.email = "Invalid email address.";
    
    if (!password) allErrors.password = "Password is required.";
    else if (password.length < 8) allErrors.password = "Password must be at least 8 characters.";
    
    if (!confirmPassword) allErrors.confirmPassword = "Confirm password is required.";
    if (password && confirmPassword && password !== confirmPassword) allErrors.confirmPassword = "Passwords do not match.";
    
    // Terms and conditions validation
    if (!acceptedTerms) {
      allErrors.terms = "You must accept the Terms and Conditions to proceed.";
    }
    
    // Check if there are any errors - FIXED VERSION
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setIsSubmitting(false);
      
      // Simple scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    try {
      // Create FormData - send files as binary, not base64
      const formData = new FormData();
      formData.append("email", email || "");
      formData.append("password", password || "");
      formData.append("username", `${firstName.toLowerCase()}.${lastName.toLowerCase()}` || "");
      formData.append("firstName", firstName || "");
      formData.append("middleName", middleName || "");
      formData.append("lastName", lastName || "");
      formData.append("dob", dob || "0000-01-01");
      formData.append("sex", sex || "N/A");
      formData.append("phoneNumber", phoneNumber || "");
      formData.append("province", province || "");
      formData.append("city", city || "");
      formData.append("barangay", barangay || "");
      formData.append("street", street || "");
      formData.append("zipCode", zipCode || "");
      formData.append("clinicProvince", clinicProvince || "");
      formData.append("clinicCity", clinicCity || "");
      formData.append("clinicBarangay", clinicBarangay || "");
      formData.append("clinicStreet", clinicStreet || "");
      formData.append("clinicZipCode", clinicZipCode || "");
      formData.append("vetAddressIsClinic", vetAddressIsClinic.toString());
      formData.append("licenseNumber", licenseNumber || "");
      formData.append("yearsOfExperience", yearsOfExperience || "0");
      formData.append("specialization", specialization || "");
      formData.append("affiliatedOrganization", affiliatedOrganization || "");
      
      // Append files as binary - NOT base64
      if (profilePhoto) {
        formData.append("profile_photo", profilePhoto);
      }
      
      if (document) {
        formData.append("document", document); // Single file
      }

      console.log("DEBUG: Sending form data with files");

      const response = await fetch("http://127.0.0.1:8000/api/signup_vet/", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      console.log("DEBUG response from backend:", data);

      if (response.ok) {
        // Beautiful success alert
        setShowSuccessAlert(true);
      } else {
        let errorMsg = data.error || "Registration failed. Please check your information and try again.";
        if (data.details) {
          if (typeof data.details === "string") {
            errorMsg = data.details;
          } else {
            // Handle field-specific errors from backend
            const fieldErrors = Object.entries(data.details).map(([field, messages]) => {
              return `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
            });
            errorMsg = fieldErrors.join('\n');
          }
        }
        
        // Set the error message to display in the form
        setSubmitError(errorMsg);
        
        // Scroll to the top to show the error
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error("Signup error:", err);
      setSubmitError("Network error: Unable to connect to server. Please try again.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Field styles with static sizing
  const fieldStyle = { 
    padding: "0.75rem", 
    borderRadius: "0.5rem", 
    border: "1px solid #d1d5db", 
    width: "100%", 
    outline: "none",
    fontSize: "0.95rem",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    height: "44px",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease"
  };

  const getFieldStyle = (fieldName, hasError = false) => {
    const isFocused = focusedField === fieldName;
    const errorStyle = hasError ? { borderColor: "#ef4444" } : {};
    const focusStyle = isFocused ? { 
      borderColor: "#B8763E",
      boxShadow: "0 0 0 3px rgba(184, 118, 62, 0.1)"
    } : {};
    
    return { ...fieldStyle, ...errorStyle, ...focusStyle };
  };

  const handleFieldFocus = (fieldName) => {
    setFocusedField(fieldName);
  };

  const handleFieldBlur = (fieldName) => {
    setFocusedField(null);
    if (!touched[fieldName]) {
      setTouched(prev => ({...prev, [fieldName]: true}));
      if (currentStep === 5) {
        validateStep(5);
      }
    }
  };

  // Custom checkbox component
  const Checkbox = ({ checked, onChange, label, hasError = false }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "4px",
          border: "2px solid",
          borderColor: checked ? "#B8763E" : hasError ? "#ef4444" : "#d1d5db",
          backgroundColor: checked ? "#B8763E" : "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s ease",
          flexShrink: 0,
          marginTop: "0.125rem"
        }}
        onClick={() => onChange(!checked)}
      >
        {checked && <Check size={14} color="white" />}
      </div>
      <span 
        style={{ 
          fontSize: "0.95rem", 
          color: "#374151",
          fontWeight: 500,
          lineHeight: "1.4"
        }}
        onClick={() => onChange(!checked)}
      >
        {label}
      </span>
    </div>
  );

  // Success Alert Component
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const SuccessAlert = () => {
    if (!showSuccessAlert) return null;

    return (
      <div style={{
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
        padding: "1rem"
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          padding: "2rem",
          maxWidth: "500px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem"
          }}>
            <Check size={30} color="white" />
          </div>
          
          <h3 style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#1f2937",
            marginBottom: "1rem"
          }}>
            Registration Submitted Successfully!
          </h3>
          
          <p style={{
            color: "#6b7280",
            fontSize: "1rem",
            lineHeight: "1.6",
            marginBottom: "2rem"
          }}>
            Your registration has been received and is currently under review. 
            <strong> You will receive an email notification</strong> once your account 
            has been approved or if additional information is required.
          </p>
          
          <div style={{
            fontSize: "0.875rem",
            color: "#9ca3af",
            backgroundColor: "#f9fafb",
            padding: "1rem",
            borderRadius: "0.5rem",
            marginBottom: "2rem"
          }}>
            <strong>Note:</strong> Please check your email regularly, including spam folder, 
            for updates regarding your registration status.
          </div>
          
          <button
            onClick={() => {
              setShowSuccessAlert(false);
              navigate("/login");
            }}
            style={{
              backgroundColor: "#B8763E",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s ease",
              width: "100%"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#a36936"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#B8763E"}
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  };

  // Error Alert Component for form submission errors
  const ErrorAlert = () => {
    if (!submitError) return null;

    return (
      <div style={{
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "0.5rem",
        padding: "1rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.75rem"
      }}>
        <AlertCircle size={20} color="#dc2626" />
        <div style={{ flex: 1 }}>
          <h4 style={{
            color: "#dc2626",
            fontWeight: "600",
            margin: "0 0 0.5rem 0",
            fontSize: "0.95rem"
          }}>
            Registration Failed
          </h4>
          <p style={{
            color: "#b91c1c",
            margin: 0,
            fontSize: "0.875rem",
            lineHeight: "1.4",
            whiteSpace: "pre-line"
          }}>
            {submitError}
          </p>
        </div>
        <button
          onClick={() => setSubmitError("")}
          style={{
            background: "none",
            border: "none",
            color: "#dc2626",
            cursor: "pointer",
            padding: "0.25rem",
            borderRadius: "0.25rem"
          }}
        >
          <X size={16} />
        </button>
      </div>
    );
  };

// Terms and Conditions Modal - Clean Version
const TermsModal = () => {
  const [showButtons, setShowButtons] = useState(false);
  const contentRef = useRef(null);

  const handleScroll = () => {
    const element = contentRef.current;
    if (element) {
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 5;
      setShowButtons(isAtBottom);
    }
  };

  useEffect(() => {
    const element = contentRef.current;
    if (element) {
      // Check initial scroll position
      handleScroll();
    }
  }, []);

  if (!showTermsModal) return null;

  return (
    <div style={{
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
      padding: "1rem"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        padding: "0",
        maxWidth: "700px",
        width: "100%",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Header - Fixed at top */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.5rem 2rem 1rem 2rem",
          borderBottom: "1px solid #e5e7eb",
          flexShrink: 0
        }}>
          <h2 style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#1f2937",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <FileText size={24} color="#B8763E" />
            Terms and Conditions
          </h2>
          <button
            onClick={() => setShowTermsModal(false)}
            style={{
              background: "none",
              border: "none",
              color: "#6b7280",
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: "0.25rem"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div 
          ref={contentRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 2rem 2rem 2rem" // Increased bottom padding for buttons
          }}
        >
          <div style={{
            fontSize: "0.95rem",
            lineHeight: "1.6",
            color: "#374151"
          }}>
            <h3 style={{ color: "#B8763E", marginBottom: "1rem", fontSize: "1.1rem" }}>
              1. Account Registration and Verification
            </h3>
            <p style={{ marginBottom: "1rem" }}>
              By registering as a veterinarian on Echo Portal, you agree to provide accurate and complete information about your professional credentials, including your license number, specialization, and years of experience. All information submitted will be verified by our administrative team.
            </p>

            <h3 style={{ color: "#B8763E", marginBottom: "1rem", fontSize: "1.1rem" }}>
              2. Professional Conduct
            </h3>
            <p style={{ marginBottom: "1rem" }}>
              You agree to maintain professional standards of conduct while using the platform. This includes providing accurate medical advice, maintaining client confidentiality, and adhering to veterinary ethics and regulations in the Philippines.
            </p>

            <h3 style={{ color: "#B8763E", marginBottom: "1rem", fontSize: "1.1rem" }}>
              3. Data Privacy and Confidentiality
            </h3>
            <p style={{ marginBottom: "1rem" }}>
              We are committed to protecting your personal and professional information. Your data will be stored securely and used only for platform functionality, verification purposes, and communication related to your account.
            </p>

            <h3 style={{ color: "#B8763E", marginBottom: "1rem", fontSize: "1.1rem" }}>
              4. Platform Usage
            </h3>
            <p style={{ marginBottom: "1rem" }}>
              The Echo Portal is designed for professional veterinary use. You agree not to misuse the platform for unauthorized purposes, including but not limited to spam, fraudulent activities, or distribution of harmful content.
            </p>

            <h3 style={{ color: "#B8763E", marginBottom: "1rem", fontSize: "1.1rem" }}>
              5. Account Approval and Suspension
            </h3>
            <p style={{ marginBottom: "1rem" }}>
              Account approval is subject to verification of your credentials. Echo Portal reserves the right to suspend or terminate accounts that violate these terms or provide false information. You will be notified of any account status changes.
            </p>

            <h3 style={{ color: "#B8763E", marginBottom: "1rem", fontSize: "1.1rem" }}>
              6. Intellectual Property
            </h3>
            <p style={{ marginBottom: "1rem" }}>
              All content and materials on the Echo Portal are protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without explicit permission.
            </p>

            <h3 style={{ color: "#B8763E", marginBottom: "1rem", fontSize: "1.1rem" }}>
              7. Limitation of Liability
            </h3>
            <p style={{ marginBottom: "1rem" }}>
              Echo Portal provides the platform as a service and is not liable for any direct or indirect damages arising from the use of the platform. Veterinary professionals are responsible for their own professional decisions and advice.
            </p>

            <h3 style={{ color: "#B8763E", marginBottom: "1rem", fontSize: "1.1rem" }}>
              8. Amendments to Terms
            </h3>
            <p style={{ marginBottom: "1rem" }}>
              We reserve the right to modify these terms and conditions at any time. Continued use of the platform after changes constitutes acceptance of the modified terms.
            </p>

            <div style={{
              backgroundColor: "#f3f4f6",
              padding: "1rem",
              borderRadius: "0.5rem",
              marginTop: "1.5rem",
              borderLeft: "4px solid #B8763E"
            }}>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
                <strong>Note:</strong> By accepting these terms, you acknowledge that you have read, understood, and agree to be bound by all the conditions outlined above.
              </p>
            </div>

            {/* BUTTONS - ALWAYS VISIBLE AT BOTTOM OF CONTENT */}
            <div style={{
              padding: "2rem 0 0 0",
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
              marginTop: "2rem",
              borderTop: "1px solid #e5e7eb"
            }}>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#e5e7eb"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#f3f4f6"}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#B8763E",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontWeight: "500",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "#a36936"}
                onMouseOut={(e) => e.target.style.backgroundColor = "#B8763E"}
              >
                Accept Terms
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600, marginBottom: "0.5rem" }}>
              <User size={20} /> Personal & Contact Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              <div data-field="firstName">
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>First Name *</label>
                <input 
                  style={getFieldStyle("firstName", errors.firstName)} 
                  type="text" 
                  value={firstName} 
                  onChange={e => { setFirstName(e.target.value); setErrors(prev => ({ ...prev, firstName: "" })); }} 
                  onFocus={() => handleFieldFocus("firstName")}
                  onBlur={() => handleFieldBlur("firstName")}
                />
                {errors.firstName && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.firstName}</p>}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Middle Name</label>
                <input 
                  style={getFieldStyle("middleName")} 
                  type="text" 
                  value={middleName} 
                  onChange={e => setMiddleName(e.target.value)} 
                  onFocus={() => handleFieldFocus("middleName")}
                  onBlur={() => handleFieldBlur("middleName")}
                />
              </div>
              <div data-field="lastName">
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Last Name *</label>
                <input 
                  style={getFieldStyle("lastName", errors.lastName)} 
                  type="text" 
                  value={lastName} 
                  onChange={e => { setLastName(e.target.value); setErrors(prev => ({ ...prev, lastName: "" })); }} 
                  onFocus={() => handleFieldFocus("lastName")}
                  onBlur={() => handleFieldBlur("lastName")}
                />
                {errors.lastName && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.lastName}</p>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1rem" }}>
              <div data-field="dob">
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Date Of Birth *</label>
                <input 
                  style={getFieldStyle("dob", errors.dob)} 
                  type="date" 
                  value={dob} 
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => { setDob(e.target.value); setErrors(prev => ({ ...prev, dob: "" })); }} 
                  onFocus={() => handleFieldFocus("dob")}
                  onBlur={() => handleFieldBlur("dob")}
                />
                {errors.dob && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.dob}</p>}
              </div>
              <div data-field="sex">
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Sex *</label>
                <select 
                  style={getFieldStyle("sex", errors.sex)} 
                  value={sex} 
                  onChange={e => { setSex(e.target.value); setErrors(prev => ({ ...prev, sex: "" })); }}
                  onFocus={() => handleFieldFocus("sex")}
                  onBlur={() => handleFieldBlur("sex")}
                >
                  <option value="">Please select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.sex && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.sex}</p>}
              </div>
            </div>
            <div data-field="phoneNumber">
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Phone Number *</label>
              <input 
                style={getFieldStyle("phoneNumber", errors.phoneNumber)} 
                type="tel" 
                value={phoneNumber} 
                onChange={e => { 
                  const value = e.target.value.replace(/[^\d+]/g, '');
                  setPhoneNumber(value); 
                  setErrors(prev => ({ ...prev, phoneNumber: "" })); 
                }} 
                placeholder="e.g., +639123456789"
                maxLength={13}
                onFocus={() => handleFieldFocus("phoneNumber")}
                onBlur={() => handleFieldBlur("phoneNumber")}
              />
              {errors.phoneNumber && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.phoneNumber}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600, marginBottom: "0.5rem" }}>
              <MapPin size={20} /> Address Information
            </h3>
            
            {/* Permanent Address Section */}
            <div style={{ padding: "1.5rem", backgroundColor: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
              <h4 style={{ color: "#1e293b", fontWeight: 600, marginBottom: "1rem", fontSize: "1.1rem" }}>
                Permanent Address *
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Province and City in one row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div data-field="province">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Province *</label>
                    <select 
                      style={getFieldStyle("province", errors.province)} 
                      value={province} 
                      onChange={e => { setProvince(e.target.value); setErrors(prev => ({ ...prev, province: "" })); }}
                      onFocus={() => handleFieldFocus("province")}
                      onBlur={() => handleFieldBlur("province")}
                    >
                      <option value="">Select Province</option>
                      {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {errors.province && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.province}</p>}
                  </div>
                  <div data-field="city">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>City *</label>
                    <select 
                      style={getFieldStyle("city", errors.city)} 
                      value={city} 
                      onChange={e => { setCity(e.target.value); setErrors(prev => ({ ...prev, city: "" })); }} 
                      disabled={!province}
                      onFocus={() => handleFieldFocus("city")}
                      onBlur={() => handleFieldBlur("city")}
                    >
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.city && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.city}</p>}
                  </div>
                </div>

                {/* Barangay and Street in one row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div data-field="barangay">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Barangay *</label>
                    <select 
                      style={getFieldStyle("barangay", errors.barangay)} 
                      value={barangay} 
                      onChange={e => { setBarangay(e.target.value); setErrors(prev => ({ ...prev, barangay: "" })); }} 
                      disabled={!city}
                      onFocus={() => handleFieldFocus("barangay")}
                      onBlur={() => handleFieldBlur("barangay")}
                    >
                      <option value="">Select Barangay</option>
                      {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    {errors.barangay && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.barangay}</p>}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Street <span style={{ fontWeight: 400, color: "#6b7280" }}></span></label>
                    <input 
                      style={getFieldStyle("street")} 
                      type="text" 
                      value={street} 
                      onChange={e => setStreet(e.target.value)} 
                      placeholder="Street name, building, house no."
                      onFocus={() => handleFieldFocus("street")}
                      onBlur={() => handleFieldBlur("street")}
                    />
                  </div>
                </div>

                {/* ZIP Code */}
                <div style={{ maxWidth: "200px" }}>
                  <div data-field="zipCode">
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>ZIP Code *</label>
                    <input 
                      style={getFieldStyle("zipCode", errors.zipCode)} 
                      type="text" 
                      value={zipCode} 
                      onChange={e => { 
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setZipCode(value); 
                        setErrors(prev => ({ ...prev, zipCode: "" })); 
                      }} 
                      placeholder="e.g., 1600"
                      onFocus={() => handleFieldFocus("zipCode")}
                      onBlur={() => handleFieldBlur("zipCode")}
                    />
                    {errors.zipCode && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.zipCode}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Clinic Address Section */}
            <div style={{ padding: "1.5rem", backgroundColor: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <h4 style={{ color: "#1e293b", fontWeight: 600, fontSize: "1.1rem" }}>
                  Clinic Address
                </h4>
                <Checkbox 
                  checked={vetAddressIsClinic}
                  onChange={(checked) => {
                    setVetAddressIsClinic(checked);
                    if (checked) {
                      // Copy permanent address to clinic address
                      setClinicProvince(province);
                      setClinicCity(city);
                      setClinicBarangay(barangay);
                      setClinicStreet(street);
                      setClinicZipCode(zipCode);
                    }
                  }}
                  label="Use permanent address as clinic address"
                />
              </div>

              {!vetAddressIsClinic && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Province and City in one row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div data-field="clinicProvince">
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Province *</label>
                      <select 
                        style={getFieldStyle("clinicProvince", errors.clinicProvince)} 
                        value={clinicProvince} 
                        onChange={e => { setClinicProvince(e.target.value); setErrors(prev => ({ ...prev, clinicProvince: "" })); }}
                        onFocus={() => handleFieldFocus("clinicProvince")}
                        onBlur={() => handleFieldBlur("clinicProvince")}
                      >
                        <option value="">Select Province</option>
                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      {errors.clinicProvince && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.clinicProvince}</p>}
                    </div>
                    <div data-field="clinicCity">
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>City *</label>
                      <select 
                        style={getFieldStyle("clinicCity", errors.clinicCity)} 
                        value={clinicCity} 
                        onChange={e => { setClinicCity(e.target.value); setErrors(prev => ({ ...prev, clinicCity: "" })); }} 
                        disabled={!clinicProvince}
                        onFocus={() => handleFieldFocus("clinicCity")}
                        onBlur={() => handleFieldBlur("clinicCity")}
                      >
                        <option value="">Select City</option>
                        {clinicCities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {errors.clinicCity && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.clinicCity}</p>}
                    </div>
                  </div>

                  {/* Barangay and Street in one row */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div data-field="clinicBarangay">
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Barangay *</label>
                      <select 
                        style={getFieldStyle("clinicBarangay", errors.clinicBarangay)} 
                        value={clinicBarangay} 
                        onChange={e => { setClinicBarangay(e.target.value); setErrors(prev => ({ ...prev, clinicBarangay: "" })); }} 
                        disabled={!clinicCity}
                        onFocus={() => handleFieldFocus("clinicBarangay")}
                        onBlur={() => handleFieldBlur("clinicBarangay")}
                      >
                        <option value="">Select Barangay</option>
                        {clinicBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                      {errors.clinicBarangay && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.clinicBarangay}</p>}
                    </div>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Street <span style={{ fontWeight: 400, color: "#6b7280" }}></span></label>
                      <input 
                        style={getFieldStyle("clinicStreet")} 
                        type="text" 
                        value={clinicStreet} 
                        onChange={e => setClinicStreet(e.target.value)} 
                        placeholder="Street name, building, house no."
                        onFocus={() => handleFieldFocus("clinicStreet")}
                        onBlur={() => handleFieldBlur("clinicStreet")}
                      />
                    </div>
                  </div>

                  {/* ZIP Code */}
                  <div style={{ maxWidth: "200px" }}>
                    <div data-field="clinicZipCode">
                      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>ZIP Code <span style={{ fontWeight: 400, color: "#6b7280" }}>(Optional)</span></label>
                      <input 
                        style={getFieldStyle("clinicZipCode", errors.clinicZipCode)} 
                        type="text" 
                        value={clinicZipCode} 
                        onChange={e => { 
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setClinicZipCode(value); 
                          setErrors(prev => ({ ...prev, clinicZipCode: "" })); 
                        }} 
                        placeholder="e.g., 1600"
                        onFocus={() => handleFieldFocus("clinicZipCode")}
                        onBlur={() => handleFieldBlur("clinicZipCode")}
                      />
                      {errors.clinicZipCode && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.clinicZipCode}</p>}
                    </div>
                  </div>
                </div>
              )}

              {vetAddressIsClinic && (
                <div style={{ 
                  padding: "1rem", 
                  backgroundColor: "#ecfdf5", 
                  borderRadius: "0.5rem", 
                  border: "1px solid #d1fae5",
                  color: "#065f46",
                  fontSize: "0.95rem"
                }}>
                  <strong>Note:</strong> Clinic address will use the same details as your permanent address.
                </div>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600, marginBottom: "0.5rem" }}>
              <Stethoscope size={20} /> Professional Info
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div data-field="licenseNumber">
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>License Number *</label>
                <input 
                  style={getFieldStyle("licenseNumber", errors.licenseNumber)} 
                  type="text" 
                  value={licenseNumber} 
                  onChange={e => { 
                    const value = e.target.value.replace(/\D/g, '').slice(0, 7);
                    setLicenseNumber(value); 
                    setErrors(prev => ({ ...prev, licenseNumber: "" })); 
                  }} 
                  placeholder="7-digit number"
                  onFocus={() => handleFieldFocus("licenseNumber")}
                  onBlur={() => handleFieldBlur("licenseNumber")}
                />
                {errors.licenseNumber && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.licenseNumber}</p>}
              </div>
              <div data-field="yearsOfExperience">
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Years of Experience *</label>
                <input 
                  style={getFieldStyle("yearsOfExperience", errors.yearsOfExperience)} 
                  type="number" 
                  min="0"
                  value={yearsOfExperience} 
                  onChange={e => { setYearsOfExperience(e.target.value); setErrors(prev => ({ ...prev, yearsOfExperience: "" })); }} 
                  onFocus={() => handleFieldFocus("yearsOfExperience")}
                  onBlur={() => handleFieldBlur("yearsOfExperience")}
                />
                {errors.yearsOfExperience && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.yearsOfExperience}</p>}
              </div>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Specialization <span style={{ fontWeight: 400, color: "#6b7280" }}>(Optional)</span></label>
              <input 
                style={getFieldStyle("specialization")} 
                type="text" 
                value={specialization} 
                onChange={e => setSpecialization(e.target.value)} 
                onFocus={() => handleFieldFocus("specialization")}
                onBlur={() => handleFieldBlur("specialization")}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Affiliated Organization <span style={{ fontWeight: 400, color: "##6b7280" }}>(Optional)</span></label>
              <input 
                style={getFieldStyle("affiliatedOrganization")} 
                type="text" 
                value={affiliatedOrganization} 
                onChange={e => setAffiliatedOrganization(e.target.value)} 
                onFocus={() => handleFieldFocus("affiliatedOrganization")}
                onBlur={() => handleFieldBlur("affiliatedOrganization")}
              />
            </div>
            
            <div data-field="document">
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: 500,
                }}
              >
                Professional Document *
                <span
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    fontWeight: "normal",
                    marginTop: "0.25rem",
                  }}
                >
                  Upload veterinary certificate (<span style={{ color: "red", fontWeight: "bold" }}>PDF only</span>)
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    fontWeight: "normal",
                    marginTop: "0.25rem",
                  }}
                >
                  This certificate is required to verify your credentials as a licensed veterinarian and ensure authenticity of your profile.
                </span>
              </label>

              
              {document ? (
                <div style={{ 
                  padding: "1rem", 
                  backgroundColor: "#f9fafb", 
                  borderRadius: "0.5rem",
                  border: "1px solid #e5e7eb"
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    marginBottom: "0.5rem"
                  }}>
                    <span style={{ fontSize: "0.875rem" }}>{document.name}</span>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button 
                        type="button" 
                        onClick={() => openDocumentPreview(document)}
                        style={{ 
                          background: "none", 
                          border: "none", 
                          color: "#3b82f6", 
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem"
                        }}
                      >
                        <ZoomIn size={16} /> Preview
                      </button>
                      <button 
                        type="button" 
                        onClick={removeDocument}
                        style={{ 
                          background: "none", 
                          border: "none", 
                          color: "#ef4444", 
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  style={{ 
                    border: "2px dashed #d1d5db", 
                    borderRadius: "0.5rem", 
                    padding: "1.5rem", 
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    backgroundColor: "#fff",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseOver={(e) => e.target.style.borderColor = "#B8763E"}
                  onMouseOut={(e) => e.target.style.borderColor = "#d1d5db"}
                >
                  <Upload size={24} style={{ margin: "0 auto 0.5rem", color: "#9ca3af" }} />
                  <p style={{ color: "#6b7280", margin: 0 }}>Click to upload or drag and drop</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    accept=".pdf"
                    onChange={handleDocumentUpload}
                  />
                </div>
              )}
              
              {errors.document && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.5rem" }}>{errors.document}</p>}
            </div>
          </div>
        );
      case 4:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600, marginBottom: "0.5rem" }}>
              <User size={20} /> Profile Photo
            </h3>
            
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Upload Profile Photo <span style={{ fontWeight: 400, color: "#6b7280" }}>(Optional)</span>
              </label>
              
              {profilePreview ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                  <div style={{ position: "relative" }}>
                    <img 
                      src={profilePreview} 
                      alt="Profile preview" 
                      style={{ 
                        width: "150px", 
                        height: "150px", 
                        borderRadius: "50%", 
                        objectFit: "cover",
                        border: "3px solid #e5e7eb"
                      }} 
                    />
                    <button 
                      type="button" 
                      onClick={removeProfilePhoto}
                      style={{ 
                        position: "absolute", 
                        top: "-5px", 
                        right: "-5px", 
                        background: "#ef4444", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "50%", 
                        width: "24px", 
                        height: "24px", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "14px"
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>Click the X to remove photo</p>
                </div>
              ) : (
                <div 
                  style={{ 
                    border: "2px dashed #d1d5db", 
                    borderRadius: "0.5rem", 
                    padding: "2rem", 
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => profileInputRef.current?.click()}
                  onMouseOver={(e) => e.target.style.borderColor = "#B8763E"}
                  onMouseOut={(e) => e.target.style.borderColor = "#d1d5db"}
                >
                  <Upload size={32} style={{ margin: "0 auto 0.5rem", color: "##9ca3af" }} />
                  <p style={{ color: "#6b7280", margin: 0 }}>Click to upload a profile photo</p>
                  <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>JPG, PNG files only</p>
                  <input 
                    type="file" 
                    ref={profileInputRef} 
                    style={{ display: "none" }} 
                    accept="image/*"
                    onChange={handleProfilePhotoUpload}
                  />
                </div>
              )}
              
              {errors.profilePhoto && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.5rem" }}>{errors.profilePhoto}</p>}
            </div>
          </div>
        );
        
      case 5:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600, marginBottom: "0.5rem" }}>
              <Lock size={20} /> Set Login Credentials
            </h3>
            <div data-field="email">
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Email *</label>
              <input 
                style={getFieldStyle("email", touched.email && errors.email)} 
                type="email" 
                value={email} 
                onChange={e => { 
                  setEmail(e.target.value); 
                  setErrors(prev => ({ ...prev, email: "" })); 
                }} 
                placeholder="example@mail.com" 
                onFocus={() => handleFieldFocus("email")}
                onBlur={() => handleFieldBlur("email")}
              />
              {touched.email && errors.email && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.email}</p>}
            </div>
            <div data-field="password">
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Password *</label>
              <div style={{ position: "relative" }}>
                <input 
                  style={{ 
                    ...getFieldStyle("password", touched.password && errors.password),
                    paddingRight: "2.5rem"
                  }} 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => { 
                    setPassword(e.target.value); 
                    setErrors(prev => ({ ...prev, password: "" })); 
                  }} 
                  onFocus={() => handleFieldFocus("password")}
                  onBlur={() => handleFieldBlur("password")}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)} 
                  style={{ 
                    position: "absolute", 
                    right: "0.75rem", 
                    top: "50%", 
                    transform: "translateY(-50%)", 
                    background: "none", 
                    border: "none", 
                    cursor: "pointer", 
                    color: "#6b7280" 
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {touched.password && errors.password && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.password}</p>}
            </div>
            <div data-field="confirmPassword">
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Confirm Password *</label>
              <div style={{ position: "relative" }}>
                <input 
                  style={{ 
                    ...getFieldStyle("confirmPassword", touched.confirmPassword && errors.confirmPassword),
                    paddingRight: "2.5rem"
                  }} 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={e => { 
                    setConfirmPassword(e.target.value); 
                    setErrors(prev => ({ ...prev, confirmPassword: "" })); 
                  }} 
                  onFocus={() => handleFieldFocus("confirmPassword")}
                  onBlur={() => handleFieldBlur("confirmPassword")}
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)} 
                  style={{ 
                    position: "absolute", 
                    right: "0.75rem", 
                    top: "50%", 
                    transform: "translateY(-50%)", 
                    background: "none", 
                    border: "none", 
                    cursor: "pointer", 
                    color: "#6b7280" 
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.confirmPassword}</p>}
            </div>

            {/* Terms and Conditions Section */}
            <div data-field="terms">
              <div style={{ 
                backgroundColor: "#f8fafc", 
                borderRadius: "0.5rem", 
                padding: "1.5rem",
                border: errors.terms ? "1px solid #fecaca" : "1px solid #e2e8f0"
              }}>
                <Checkbox 
                  checked={acceptedTerms}
                  onChange={setAcceptedTerms}
                  label={
                    <span>
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#B8763E",
                          textDecoration: "underline",
                          cursor: "pointer",
                          fontWeight: "600"
                        }}
                      >
                        Terms and Conditions
                      </button>
                      {" "}of Echo Portal
                    </span>
                  }
                  hasError={!!errors.terms}
                />
                {errors.terms && (
                  <p style={{ 
                    color: "#ef4444", 
                    fontSize: "0.875rem", 
                    marginTop: "0.5rem",
                    marginLeft: "2rem"
                  }}>
                    {errors.terms}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f8f4f0 0%, #fdfbf8 50%, #f8f4f0 100%)", padding: "1rem", position: "relative", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  backgroundPattern: { position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 2px 2px, rgba(184, 118, 62, 0.15) 1.5px, transparent 0)", backgroundSize: "24px 24px", opacity: 0.4 },
  backLink: { position: "absolute", top: "1.5rem", left: "2rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", cursor: "pointer", fontSize: "0.95rem", transition: "all 0.2s ease", zIndex: 2, fontWeight: 500 },
  card: { backgroundColor: "white", borderRadius: "1rem", padding: "2.5rem", width: "100%", maxWidth: "650px", position: "relative", zIndex: 1, boxShadow: "0 20px 40px rgba(184, 118, 62, 0.12), 0 0 0 1px rgba(184, 118, 62, 0.05)" },
  button: { padding: "0.875rem", borderRadius: "0.5rem", cursor: "pointer", border: "none", transition: "all 0.2s ease", fontWeight: 500, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.5rem" },
  buttonPrev: { background: "#f3f4f6", color: "#374151" },
  buttonNext: { background: "#B8763E", color: "#fff" },
  progressContainer: { width: "100%", background: "#f3f4f6", borderRadius: "9999px", height: "0.5rem", marginBottom: "2rem", overflow: "hidden" },
  progressBar: { height: "100%", background: "linear-gradient(90deg, #B8763E 0%, #d89d6c 100%)", transition: "width 0.3s ease", borderRadius: "9999px" },
  stepIndicator: { display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", position: "relative" },
  step: { display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, flex: 1 },
  stepNumber: { width: "2rem", height: "2rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.5rem" },
  stepLine: { position: "absolute", top: "1rem", left: "0", right: "0", height: "2px", backgroundColor: "#e5e7eb", zIndex: 1 }
};

const DocumentPreviewModal = () => {
  if (!documentPreview) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
      padding: "2rem"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "0.5rem",
        padding: "1.5rem",
        width: "90%",
        height: "90%",
        maxWidth: "1200px",
        maxHeight: "800px",
        position: "relative"
      }}>
        <button 
          onClick={closeDocumentPreview}
          style={{
            position: "absolute",
            top: "-0.75rem",
            right: "-0.75rem",
            background: "#ef4444",
            color: "white", 
            border: "none",
            borderRadius: "50%",
            width: "2rem",
            height: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10
          }}
        >
          <X size={16} />
        </button>
        
        <div style={{
          flex: 1,
          height: "100%",
          overflow: "auto",
          border: "1px solid #e5e7eb",
          borderRadius: "0.375rem",
          padding: "1rem",
          backgroundColor: "#f9fafb"
        }}>
          <iframe 
            src={documentPreview} 
            style={{ 
              width: "100%", 
              height: "100%", 
              minHeight: "400px",
              border: "none",
              display: "block"
            }} 
            title="Document preview"
          />
        </div>
      </div>
    </div>
  );
};  

return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern}></div>
      <div style={styles.backLink} onClick={() => navigate("/login")}>
        <ArrowLeft size={18} /> Back to Login
      </div>
      
      <div style={styles.card}>
        <h1 style={{ color: "#1f2937", fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.5rem",textAlign: "center"}}>
          Veterinarian Registration
        </h1>
        <p style={{color: "#6b7280", textAlign: "center", marginBottom: "2rem",fontSize: "1.05rem"}}>
          Complete your professional profile in {totalSteps} simple steps
        </p>
        
        <div style={styles.stepIndicator}>
          <div style={styles.stepLine}></div>
          {[1, 2, 3, 4, 5].map(step => (
            <div key={step} style={styles.step}>
              <div style={{
                ...styles.stepNumber,
                backgroundColor: currentStep >= step ? "#B8763E" : "#e5e7eb",
                color: currentStep >= step ? "white" : "#9ca3af"
              }}>
                {step}
              </div>
              <span style={{fontSize: "0.75rem",color: currentStep >= step ? "#B8763E" : "#9ca3af",fontWeight: currentStep >= step ? 600 : 400}}>
                {step === 1 && "Personal"}
                {step === 2 && "Address"}
                {step === 3 && "Professional"}
                {step === 4 && "Profile Photo"}
                {step === 5 && "Credentials"}
              </span>
            </div>
          ))}
        </div>
        
        <div style={styles.progressContainer}>
          <div style={{ ...styles.progressBar, width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}></div>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Error Alert for submission errors */}
          <ErrorAlert />
          
          {renderStepContent()}
          
          <div style={{ display: "flex", justifyContent: currentStep > 1 ? "space-between" : "flex-end", marginTop: "2rem" }}>
            {currentStep > 1 && (
              <button 
                type="button" 
                style={{ ...styles.button, ...styles.buttonPrev }} 
                onClick={handlePrevious}
                disabled={isSubmitting}
              >
                <ArrowLeft size={18} /> Previous
              </button>
            )}
            
            {currentStep < totalSteps ? (
              <button 
                type="button" 
                style={{ ...styles.button, ...styles.buttonNext }} 
                onClick={handleNext}
                disabled={isSubmitting}
              >
                Next <ArrowLeft size={18} style={{ transform: "rotate(180deg)" }} />
              </button>
            ) : (
              <button 
                type="submit" 
                style={{ 
                  ...styles.button, 
                  ...styles.buttonNext,
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Complete Registration"}
              </button>
            )}
          </div>
        </form>
      </div>
      <DocumentPreviewModal />
      <TermsModal />
      <SuccessAlert />
    </div>
  );
}

export default SignUp;