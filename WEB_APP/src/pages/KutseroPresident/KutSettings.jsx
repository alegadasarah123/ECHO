import { useState, useEffect } from "react";
import Sidebar from "@/components/KutSidebar";
import { Bell, Edit2, Shield, User, HelpCircle, CheckCircle, Eye, EyeOff, Check, X, Lock, Key, AlertTriangle, RefreshCw } from "lucide-react";
import FloatingMessages from './KutMessages';

const API_BASE = "http://localhost:8000/api/kutsero_president";

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(false);
  const [profileExists, setProfileExists] = useState(false); 
  const [passwordErrors, setPasswordErrors] = useState({});
  const [profile, setProfile] = useState({
    pres_fname: "",
    pres_lname: "",
    pres_email: "",
    pres_phonenum: "",
  });

  // Store original profile data for cancel functionality
  const [originalProfile, setOriginalProfile] = useState({
    pres_fname: "",
    pres_lname: "",
    pres_email: "",
    pres_phonenum: "",
  });

  const [passwords, setPasswords] = useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password requirements state
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Tabs configuration
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "support", label: "Support", icon: HelpCircle }
  ];

  // Contact number validation function
  const validateContactNumber = (phoneNumber) => {
    const phoneRegex = /^(09|\+639)\d{9}$/;
    const cleanedNumber = phoneNumber.replace(/\s+/g, '').replace(/[-()]/g, '');
    
    // Check if empty
    if (!phoneNumber.trim()) {
      return { isValid: false, message: "Contact number is required" };
    }
    
    // Check if contains only numbers and allowed characters
    if (!/^[\d+\s-()]*$/.test(phoneNumber)) {
      return { isValid: false, message: "Contact number can only contain numbers, +, -, (, ) and spaces" };
    }
    
    // Check length (Philippine numbers: 09XXXXXXXXX or +639XXXXXXXXX)
    if (cleanedNumber.length < 11 || cleanedNumber.length > 13) {
      return { isValid: false, message: "Contact number must be 11-13 digits" };
    }
    
    // Check format (Philippine mobile numbers)
    if (!phoneRegex.test(cleanedNumber)) {
      return { isValid: false, message: "Please enter a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)" };
    }
    
    return { isValid: true, message: "" };
  };

  // Real-time contact number validation
  const handleContactNumberChange = (e) => {
    const { name, value } = e.target;
    
    // Format the number as user types (optional)
    let formattedValue = value;
    
    // Auto-format for better UX
    if (value.startsWith('09') && value.length === 11) {
      formattedValue = value.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
    } else if (value.startsWith('+639') && value.length === 13) {
      formattedValue = value.replace(/(\+639)(\d{3})(\d{4})/, '$1 $2 $3');
    }
    
    setProfile((prev) => ({ ...prev, [name]: formattedValue }));
    
    // Real-time validation
    const validation = validateContactNumber(value);
    if (!validation.isValid && value.trim() !== "") {
      setErrors(prev => ({ ...prev, [name]: validation.message }));
    } else {
      // Clear error if valid or empty
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Check password requirements
  const checkPasswordRequirements = (password) => {
    setPasswordRequirements({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*_]/.test(password),
    });
  };

  // Fetch profile 
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/get_president_profile/`, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          const data = await res.json();
          console.error("Failed to fetch profile:", data.error);
          return;
        }

        const data = await res.json();
        const profileData = {
          pres_fname: data.pres_fname || "",
          pres_lname: data.pres_lname || "",
          pres_email: data.pres_email || "",
          pres_phonenum: data.pres_phonenum || "",
        };
        
        setProfile(profileData);
        setOriginalProfile(profileData); // Store original data
        
        if (data.pres_fname || data.pres_lname || data.pres_phonenum) {
          setProfileExists(true);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, []);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Use special handler for contact number
    if (name === "pres_phonenum") {
      handleContactNumberChange(e);
      return;
    }
    
    setProfile((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Validate all fields before submission
  const validateForm = () => {
    const newErrors = {};
    
    // First name validation
    if (!profile.pres_fname.trim()) {
      newErrors.pres_fname = "First name is required";
    } else if (profile.pres_fname.trim().length < 2) {
      newErrors.pres_fname = "First name must be at least 2 characters";
    }
    
    // Last name validation
    if (!profile.pres_lname.trim()) {
      newErrors.pres_lname = "Last name is required";
    } else if (profile.pres_lname.trim().length < 2) {
      newErrors.pres_lname = "Last name must be at least 2 characters";
    }
    
    // Email validation
    if (!profile.pres_email.trim()) {
      newErrors.pres_email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.pres_email)) {
      newErrors.pres_email = "Please enter a valid email address";
    }
    
    // Contact number validation
    const phoneValidation = validateContactNumber(profile.pres_phonenum);
    if (!phoneValidation.isValid) {
      newErrors.pres_phonenum = phoneValidation.message;
    }
    
    return newErrors;
  };

  // Save first-time profile (no email changes)
  const handleSave = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/save_president_profile/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pres_fname: profile.pres_fname,
          pres_lname: profile.pres_lname,
          pres_phonenum: profile.pres_phonenum,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("Profile saved successfully!");
        setEditing(false);
        setProfileExists(true);
        setOriginalProfile(profile); // Update original data
      } else if (data.errors) {
        setErrors(data.errors);
      } else {
        setErrorMessage(data.error || "Failed to save profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  // Update profile (all fields editable)
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setErrors({});

    try {
      const res = await fetch(`${API_BASE}/update_president_profile/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pres_fname: profile.pres_fname,
          pres_lname: profile.pres_lname,
          pres_email: profile.pres_email,
          pres_phonenum: profile.pres_phonenum,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("Profile updated successfully!");
        setEditing(false);
        setOriginalProfile(profile); // Update original data
      } else if (data.errors) {
        setErrors(data.errors);
      } else {
        setErrorMessage(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  // Handle cancel editing - restore original data
  const handleCancel = () => {
    setProfile(originalProfile);
    setEditing(false);
    setErrors({});
    setErrorMessage("");
  };

  // Handle input changes for password fields
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
    if (name === "new_password") {
      checkPasswordRequirements(value);
    }
    
    // Clear password errors when user starts typing
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: "" }));
    }
    if (passwordErrors.general) {
      setPasswordErrors(prev => ({ ...prev, general: "" }));
    }
  };

  // Handle password update with specific error handling
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordErrors({});
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    // Frontend validation
    if (!passwords.current_password) {
      setPasswordErrors({ current_password: "Current password is required" });
      setIsLoading(false);
      return;
    }

    if (!passwords.new_password) {
      setPasswordErrors({ new_password: "New password is required" });
      setIsLoading(false);
      return;
    }

    if (passwords.new_password !== passwords.confirm_new_password) {
      setPasswordErrors({ confirm_new_password: "New passwords do not match" });
      setIsLoading(false);
      return;
    }

    // Check if all requirements are met
    if (!Object.values(passwordRequirements).every(req => req)) {
      setPasswordErrors({ new_password: "Please meet all password requirements" });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/change_password/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.pres_email, 
          current_password: passwords.current_password,
          new_password: passwords.new_password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("Password updated successfully! 🔒");
        setPasswords({ 
          current_password: "", 
          new_password: "", 
          confirm_new_password: "" 
        });
        setPasswordRequirements({
          minLength: false,
          hasUppercase: false,
          hasLowercase: false,
          hasNumber: false,
          hasSpecialChar: false,
        });
        setPasswordErrors({});
      } else if (data.errors) {
        // Handle specific backend validation errors
        setPasswordErrors(data.errors);
      } else if (data.error) {
        // Handle generic backend errors
        setPasswordErrors({ general: data.error });
      } else {
        setPasswordErrors({ general: "Failed to update password. Please try again." });
      }
    } catch (err) {
      console.error("Password update error:", err);
      setPasswordErrors({ general: "Network error. Please check your connection and try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role?.toLowerCase()) {
      case 'kutsero': return 'Kutsero';
      case 'horse_operator': return 'Horse Operator';
      default: return role;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 ">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Section */}
        <div className="bg-white px-8 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[#D2691E] m-0">Settings</h1>
            <p className="text-sm text-gray-600 m-0 font-normal">Manage your profile, security, and support options</p>
          </div>
        </div>

        {/* Tabs Section - Reduced spacing */}
        <div className="flex items-center space-x-4 ml-8 mt-4">
          <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-md rounded-xl p-1 border border-gray-200">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`cursor-pointer px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'bg-[#D2691E] text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Success Message Display */}
        {successMessage && (
          <div className="mx-8 mt-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-lg animate-in slide-in-from-top duration-500">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-green-800 font-medium text-sm">{successMessage}</p>
                </div>
                <button
                  onClick={() => setSuccessMessage("")}
                  className="flex-shrink-0 text-green-400 hover:text-green-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Message Display */}
        {errorMessage && (
          <div className="mx-8 mt-4">
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 shadow-lg animate-in slide-in-from-top duration-500">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-red-800 font-medium text-sm">{errorMessage}</p>
                </div>
                <button
                  onClick={() => setErrorMessage("")}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Section - Reduced spacing from tabs */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 m-0 mb-1">Personal Information</h2>
                <p className="text-gray-500 m-0 text-sm">Update your personal info and contact details here.</p>
              </div>
              
              <form onSubmit={profileExists ? handleUpdate : handleSave} className="max-w-2xl">
                <div className="flex gap-3 mb-3">
                  {["pres_fname", "pres_lname"].map((field) => {
                    const label = field === "pres_fname" ? "First Name" : "Last Name";
                    const isReadOnly = profileExists ? !editing : field === "pres_email";

                    return (
                      <div className="flex-1" key={field}>
                        <div className="mb-1 relative">
                          <label className="block font-medium text-gray-700 mb-1 text-sm">{label}</label>
                          <input
                            type="text"
                            name={field}
                            value={profile[field]}
                            onChange={handleChange}
                            readOnly={isReadOnly}
                            className={`w-full px-3 py-2 border rounded-lg text-sm transition-all duration-300 ${
                              isReadOnly 
                                ? "bg-gray-50 text-gray-500 cursor-not-allowed" 
                                : errors[field] 
                                  ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
                                  : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D2691E] focus:border-transparent"
                            }`}
                          />
                          {errors[field] && (
                            <div className="flex items-center space-x-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <p className="text-red-500 text-xs m-0">{errors[field]}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mb-3 relative">
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Email</label>
                  <input
                    type="email"
                    name="pres_email"
                    value={profile.pres_email}
                    onChange={handleChange}
                    readOnly={!profileExists || !editing}
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-all duration-300 ${
                      !profileExists || !editing
                        ? "bg-gray-50 text-gray-500 cursor-not-allowed" 
                        : errors.pres_email 
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
                          : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D2691E] focus:border-transparent"
                    }`}
                  />
                  {errors.pres_email && (
                    <div className="flex items-center space-x-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <p className="text-red-500 text-xs m-0">{errors.pres_email}</p>
                    </div>
                  )}
                </div>

                <div className="mb-3 relative">
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Contact Number</label>
                  <input
                    type="text"
                    name="pres_phonenum"
                    value={profile.pres_phonenum}
                    onChange={handleChange}
                    readOnly={profileExists ? !editing : false}
                    placeholder={profileExists && !editing ? "" : "09XXXXXXXXX or +639XXXXXXXXX"}
                    className={`w-full px-3 py-2 border rounded-lg text-sm transition-all duration-300 ${
                      profileExists && !editing
                        ? "bg-gray-50 text-gray-500 cursor-not-allowed" 
                        : errors.pres_phonenum 
                          ? "border-red-300 focus:ring-red-500 focus:border-red-500" 
                          : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D2691E] focus:border-transparent"
                    }`}
                  />
                  {errors.pres_phonenum && (
                    <div className="flex items-center space-x-1 mt-1">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <p className="text-red-500 text-xs m-0">{errors.pres_phonenum}</p>
                    </div>
                  )}
                  {/* Only show valid format message when user is editing the contact field */}
                  {!errors.pres_phonenum && profile.pres_phonenum && (editing || !profileExists) && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Check className="w-3 h-3 text-green-500" />
                      <p className="text-green-500 text-xs m-0">Valid contact number format</p>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                {!profileExists && (
                  <div className="flex gap-2 mt-4">
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-[#D2691E] text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all duration-300 hover:bg-[#b35917] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={Object.keys(validateForm()).length > 0}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-500 text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all duration-300 hover:bg-gray-600"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {profileExists && !editing && (
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-[#D2691E] text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all duration-300 hover:bg-[#b35917] mt-4"
                    onClick={() => setEditing(true)}
                  >
                    <Edit2 size={14} /> Edit Profile
                  </button>
                )}

                {editing && (
                  <div className="flex gap-2 mt-4">
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-[#D2691E] text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all duration-300 hover:bg-[#b35917] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={Object.keys(validateForm()).length > 0}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-gray-500 text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all duration-300 hover:bg-gray-600"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Password Section */}
              <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 p-5">
                <div className="flex items-center space-x-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Password Settings</h3>
                    <p className="text-gray-600 text-sm">Manage your account password and security</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordUpdate}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            name="current_password"
                            value={passwords.current_password}
                            onChange={handlePasswordChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm ${
                              passwordErrors.current_password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-[#D2691E]'
                            }`}
                            placeholder="Enter current password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordErrors.current_password && (
                          <div className="flex items-center space-x-1 mt-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <p className="text-red-500 text-xs">{passwordErrors.current_password}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            name="new_password"
                            value={passwords.new_password}
                            onChange={handlePasswordChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm ${
                              passwordErrors.new_password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-[#D2691E]'
                            }`}
                            placeholder="Enter new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordErrors.new_password && (
                          <div className="flex items-center space-x-1 mt-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <p className="text-red-500 text-xs">{passwordErrors.new_password}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            name="confirm_new_password"
                            value={passwords.confirm_new_password}
                            onChange={handlePasswordChange}
                            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white/50 backdrop-blur-sm ${
                              passwords.new_password !== passwords.confirm_new_password && passwords.confirm_new_password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200 focus:ring-[#D2691E]'
                            }`}
                            placeholder="Confirm new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwords.new_password !== passwords.confirm_new_password && passwords.confirm_new_password && (
                          <div className="flex items-center space-x-1 mt-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <p className="text-red-500 text-xs">Passwords do not match</p>
                          </div>
                        )}
                      </div>

                      {passwordErrors.general && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <p className="text-red-700 text-sm">{passwordErrors.general}</p>
                          </div>
                        </div>
                      )}

                      <button 
                        type="submit"
                        className="bg-gradient-to-r from-[#D2691E] to-[#b35917] text-white px-4 py-2 rounded-lg font-medium hover:from-[#b35917] hover:to-[#9a4a14] transition-all duration-200 shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full text-sm"
                        disabled={!Object.values(passwordRequirements).every(req => req) || passwords.new_password !== passwords.confirm_new_password || isLoading || !passwords.current_password}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            Updating Password...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </button>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200/50">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2 text-sm">
                        <Key className="w-4 h-4 text-[#D2691E]" />
                        <span>Password Requirements</span>
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          {passwordRequirements.minLength ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-600">At least 8 characters long</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordRequirements.hasUppercase ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-600">Contains uppercase letters</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordRequirements.hasLowercase ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-600">Contains lowercase letters</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordRequirements.hasNumber ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-600">Contains numbers</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {passwordRequirements.hasSpecialChar ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-600">Contains special characters</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
                          {passwords.new_password === passwords.confirm_new_password && passwords.confirm_new_password.length > 0 ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <X className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-600">Passwords match</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "support" && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800 m-0 mb-1">Contact Support</h2>
                <p className="text-gray-500 m-0 text-sm">Having issues? Our support team is here to help.</p>
              </div>
              
              <form className="max-w-2xl">
                <div className="mb-4">
                  <label className="block font-medium text-gray-700 mb-1 text-sm">Your Message</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your issue..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y min-h-24 bg-white focus:outline-none focus:ring-2 focus:ring-[#D2691E] focus:border-transparent transition-all duration-300"
                  />
                </div>
                <button type="submit" className="px-4 py-2 bg-[#D2691E] text-white border-none rounded-lg font-semibold text-sm cursor-pointer transition-all duration-300 hover:bg-[#b35917]">
                  Send Message
                </button>
              </form>
            </div>
          )}
          
          <FloatingMessages />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;