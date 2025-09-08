import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, MapPin, Briefcase, Lock, Eye, EyeOff, Stethoscope } from "lucide-react";

function SignUp() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

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
  const [zipCode, setZipCode] = useState("");

  // Step 3 - Professional Info
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [affiliatedOrganization, setAffiliatedOrganization] = useState("");

  // Step 4 - Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const totalSteps = 4;

  const philippineLocations = {
    Metro_Manila: ["Quezon City", "Manila", "Makati", "Taguig", "Pasig"],
    Cebu: ["Cebu City", "Mandaue City", "Lapu-Lapu City", "Talisay City"],
    Davao_Del_Sur: ["Davao City", "Digos City", "Santa Cruz", "Bansalan"]
  };

  const handleNext = () => { if (validateStep()) setCurrentStep(prev => Math.min(prev + 1, totalSteps)); };
  const handlePrevious = () => { setErrors({}); setCurrentStep(prev => Math.max(prev - 1, 1)); };

  const validateStep = () => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!firstName.trim()) newErrors.firstName = "First name is required.";
      if (!lastName.trim()) newErrors.lastName = "Last name is required.";
      if (!dob) newErrors.dob = "Date of Birth is required.";
      if (!sex) newErrors.sex = "Sex is required.";
      if (!phoneNumber.trim()) newErrors.phoneNumber = "Phone number is required.";
      else if (!/^\+?\d{10,15}$/.test(phoneNumber)) newErrors.phoneNumber = "Invalid phone number.";
    } else if (currentStep === 2) {
      if (!province) newErrors.province = "Province is required.";
      if (!city) newErrors.city = "City is required.";
      if (!barangay.trim()) newErrors.barangay = "Barangay is required.";
      if (!zipCode.trim()) newErrors.zipCode = "ZIP Code is required.";
      else if (!/^\d{4}$/.test(zipCode)) newErrors.zipCode = "Invalid ZIP Code.";
    } else if (currentStep === 3) {
      if (!licenseNumber.trim()) newErrors.licenseNumber = "License number is required.";
      if (!yearsOfExperience.trim()) newErrors.yearsOfExperience = "Years of experience is required.";
    } else if (currentStep === 4) {
      if (!email.trim()) newErrors.email = "Email address is required.";
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid email address.";
      if (!password) newErrors.password = "Password is required.";
      else if (password.length < 8) newErrors.password = "Password must be at least 8 characters.";
      if (!confirmPassword) newErrors.confirmPassword = "Confirm password is required.";
      if (password && confirmPassword && password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  // Generate username if needed (not saved in DB, just fallback)
  let username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  if (!firstName || !lastName) username = email.split('@')[0];

  const payload = {
    email: email || "",
    password: password || "",
    username: username || "",
    firstName: firstName || "",
    middleName: middleName || "",
    lastName: lastName || "",
    dob: dob || "0000-01-01",
    sex: sex || "N/A",
    phoneNumber: phoneNumber || "",
    province: province || "",
    city: city || "",
    barangay: barangay || "",
    zipCode: zipCode || "",
    licenseNumber: licenseNumber || "",
    yearsOfExperience: yearsOfExperience || "0",
    specialization: specialization || "",
    affiliatedOrganization: affiliatedOrganization || ""
  };

  console.log("DEBUG payload being sent:", payload);

  try {
    const response = await fetch("http://127.0.0.1:8000/api/signup_vet/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("DEBUG response from backend:", data);

    if (response.ok) {
      alert("Signup successful! Status: pending");
      navigate("/login");
    } else {
      // Display detailed backend error
      let errorMsg = data.error || "Unknown error";
      if (data.details) {
        if (typeof data.details === "string") {
          errorMsg += `\nDetails: ${data.details}`;
        } else {
          errorMsg += `\nDetails: ${JSON.stringify(data.details)}`;
        }
      }
      alert("Signup failed:\n" + errorMsg);
    }
  } catch (err) {
    console.error("Signup error:", err);
    alert("Signup error: " + err.message);
  }
};

  const fieldStyle = { padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", width: "100%", outline: "none" };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600 }}><User /> Personal & Contact Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              <div>
                <label>First Name</label>
                <input style={fieldStyle} type="text" value={firstName} onChange={e => { setFirstName(e.target.value); setErrors(prev => ({ ...prev, firstName: "" })); }} />
                {errors.firstName && <p style={{ color: "#ef4444" }}>{errors.firstName}</p>}
              </div>
              <div>
                <label>Middle Name</label>
                <input style={fieldStyle} type="text" value={middleName} onChange={e => setMiddleName(e.target.value)} />
              </div>
              <div>
                <label>Last Name</label>
                <input style={fieldStyle} type="text" value={lastName} onChange={e => { setLastName(e.target.value); setErrors(prev => ({ ...prev, lastName: "" })); }} />
                {errors.lastName && <p style={{ color: "#ef4444" }}>{errors.lastName}</p>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1rem" }}>
              <div>
                <label>Date Of Birth</label>
                <input style={fieldStyle} type="date" value={dob} onChange={e => { setDob(e.target.value); setErrors(prev => ({ ...prev, dob: "" })); }} />
                {errors.dob && <p style={{ color: "#ef4444" }}>{errors.dob}</p>}
              </div>
              <div>
                <label>Sex</label>
                <select style={fieldStyle} value={sex} onChange={e => { setSex(e.target.value); setErrors(prev => ({ ...prev, sex: "" })); }}>
                  <option value="">Please select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                {errors.sex && <p style={{ color: "#ef4444" }}>{errors.sex}</p>}
              </div>
            </div>
            <div>
              <label>Phone Number</label>
              <input style={fieldStyle} type="tel" value={phoneNumber} onChange={e => { setPhoneNumber(e.target.value); setErrors(prev => ({ ...prev, phoneNumber: "" })); }} placeholder="e.g., +639123456789"/>
              {errors.phoneNumber && <p style={{ color: "#ef4444" }}>{errors.phoneNumber}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600 }}><MapPin /> Address</h3>
            <div>
              <label>Province</label>
              <select style={fieldStyle} value={province} onChange={e => { setProvince(e.target.value); setCity(""); setErrors(prev => ({ ...prev, province: "", city: "" })); }}>
                <option value="">Select Province</option>
                {Object.keys(philippineLocations).map(p => <option key={p} value={p}>{p.replace("_"," ")}</option>)}
              </select>
              {errors.province && <p style={{ color: "#ef4444" }}>{errors.province}</p>}
            </div>
            <div>
              <label>City</label>
              <select style={fieldStyle} value={city} onChange={e => { setCity(e.target.value); setErrors(prev => ({ ...prev, city: "" })); }} disabled={!province}>
                <option value="">Select City</option>
                {province && philippineLocations[province].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.city && <p style={{ color: "#ef4444" }}>{errors.city}</p>}
            </div>
            <div>
              <label>Barangay</label>
              <input style={fieldStyle} type="text" value={barangay} onChange={e => { setBarangay(e.target.value); setErrors(prev => ({ ...prev, barangay: "" })); }} />
              {errors.barangay && <p style={{ color: "#ef4444" }}>{errors.barangay}</p>}
            </div>
            <div>
              <label>ZIP Code</label>
              <input style={fieldStyle} type="text" value={zipCode} onChange={e => { setZipCode(e.target.value); setErrors(prev => ({ ...prev, zipCode: "" })); }} />
              {errors.zipCode && <p style={{ color: "#ef4444" }}>{errors.zipCode}</p>}
            </div>
          </div>
        );
      case 3:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600 }}><Stethoscope /> Professional Info</h3>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div>
                <label>License Number</label>
                <input style={fieldStyle} type="text" value={licenseNumber} onChange={e => { setLicenseNumber(e.target.value); setErrors(prev => ({ ...prev, licenseNumber: "" })); }} />
                {errors.licenseNumber && <p style={{ color: "#ef4444" }}>{errors.licenseNumber}</p>}
              </div>
              <div>
                <label>Years of Experience</label>
                <input style={{ ...fieldStyle, padding: "0.25rem" }} type="number" value={yearsOfExperience} onChange={e => { setYearsOfExperience(e.target.value); setErrors(prev => ({ ...prev, yearsOfExperience: "" })); }} />
                {errors.yearsOfExperience && <p style={{ color: "#ef4444" }}>{errors.yearsOfExperience}</p>}
              </div>
            </div>
            <div>
              <label>Specialization <span style={{ fontWeight: 400, color: "#6b7280" }}>(Optional)</span></label>
              <input style={fieldStyle} type="text" value={specialization} onChange={e => setSpecialization(e.target.value)} />
            </div>
            <div>
              <label>Affiliated Organization <span style={{ fontWeight: 400, color: "#6b7280" }}>(Optional)</span></label>
              <input style={fieldStyle} type="text" value={affiliatedOrganization} onChange={e => setAffiliatedOrganization(e.target.value)} />
            </div>
          </div>
        );
      case 4:
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#B8763E", fontWeight: 600 }}><Lock /> Set Login Credentials</h3>
            <div>
              <label>Email</label>
              <input style={fieldStyle} type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })); }} placeholder="example@mail.com" />
              {errors.email && <p style={{ color: "#ef4444" }}>{errors.email}</p>}
            </div>
            <div>
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input style={{ ...fieldStyle, paddingRight: "2.5rem" }} type={showPassword ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: "" })); }} />
                <span onClick={() => setShowPassword(prev => !prev)} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#6b7280" }}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </span>
              </div>
              {errors.password && <p style={{ color: "#ef4444" }}>{errors.password}</p>}
            </div>
            <div>
              <label>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input style={{ ...fieldStyle, paddingRight: "2.5rem" }} type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: "" })); }} />
                <span onClick={() => setShowConfirmPassword(prev => !prev)} style={{ position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#6b7280" }}>
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </span>
              </div>
              {errors.confirmPassword && <p style={{ color: "#ef4444" }}>{errors.confirmPassword}</p>}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const styles = {
    container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fdf8f6 0%, #ffffff 50%, #fdf8f6 100%)", padding: "1rem", position: "relative" },
    backgroundPattern: { position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(184, 118, 62, 0.1) 1px, transparent 0)", backgroundSize: "20px 20px", opacity: 0.3 },
    backLink: { position: "absolute", top: "1rem", left: "2rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "#6b7280", cursor: "pointer", fontSize: "0.875rem", transition: "all 0.2s ease", zIndex: 2 },
    card: { backgroundColor: "white", borderRadius: "1rem", padding: "2rem", width: "100%", maxWidth: "600px", position: "relative", zIndex: 1, boxShadow: "0 25px 50px rgba(184, 118, 62, 0.1), 0 0 0 1px rgba(184, 118, 62, 0.05)" },
    button: { padding: "0.75rem 1rem", borderRadius: "0.5rem", cursor: "pointer", border: "none", transition: "background 0.2s ease" },
    buttonPrev: { background: "#f3f4f6", color: "#111827" },
    buttonNext: { background: "#B8763E", color: "#fff" },
    progressContainer: { width: "100%", background: "#e5e7eb", borderRadius: "9999px", height: "0.5rem", marginBottom: "1rem", overflow: "hidden" },
    progressBar: { height: "100%", background: "#B8763E", transition: "width 0.3s ease" },
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern}></div>
      <div style={styles.backLink} onClick={() => navigate("/login")}><ArrowLeft size={16}/> Back to Login</div>
      <div style={styles.card}>
        <div style={styles.progressContainer}><div style={{ ...styles.progressBar, width: `${(currentStep / totalSteps) * 100}%` }}></div></div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {renderStepContent()}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem" }}>
            {currentStep > 1 && <button type="button" style={{ ...styles.button, ...styles.buttonPrev }} onClick={handlePrevious}>Previous</button>}
            {currentStep < totalSteps && <button type="button" style={{ ...styles.button, ...styles.buttonNext }} onClick={handleNext}>Next</button>}
            {currentStep === totalSteps && <button type="submit" style={{ ...styles.button, ...styles.buttonNext }}>Submit</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default SignUp;
