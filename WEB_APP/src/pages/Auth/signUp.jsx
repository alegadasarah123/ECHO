import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Briefcase, CheckCircle, Eye, EyeOff, Lock, MapPin, Stethoscope, Upload, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function SignUp() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({}) 

  // State for personal information
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState("")
  const [sex, setSex] = useState("") 
  const [phoneNumber, setPhoneNumber] = useState("")

  // State for address
  const [province, setProvince] = useState("") 
  const [city, setCity] = useState("") 
  const [barangay, setBarangay] = useState("")
  const [zipCode, setZipCode] = useState("")

  // State for professional information
  const [email, setEmail] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [yearsOfExperience, setYearsOfExperience] = useState("")
  const [specialization, setSpecialization] = useState("")
  const [affiliatedOrganization, setAffiliatedOrganization] = useState("")
  const [document, setDocument] = useState(null)

  // State for login credentials
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const totalSteps = 4
  const stepTitles = ["Personal Info", "Address Details", "Professional Info", "Set Up Login"]

  // Philippine provinces and cities data
  const philippineLocations = {
    metro_manila: ["Quezon City", "Manila", "Makati", "Taguig", "Pasig"],
    cebu: ["Cebu City", "Mandaue City", "Lapu-Lapu City", "Talisay City"],
    davao_del_sur: ["Davao City", "Digos City", "Santa Cruz", "Bansalan"]
  }

  const validateStep = () => {
    const newErrors = {}
    let isValid = true

    if (currentStep === 1) {
      if (!firstName.trim()) newErrors.firstName = "First name is required."
      if (!middleName.trim()) newErrors.middleName = "Middle name is required." 
      if (!lastName.trim()) newErrors.lastName = "Last name is required."
      if (!dob) newErrors.dob = "Date of Birth is required."
      if (!sex) newErrors.sex = "Sex is required."
      if (!phoneNumber.trim()) {
        newErrors.phoneNumber = "Phone number is required."
      } else if (!/^\+?\d{10,15}$/.test(phoneNumber)) {
        newErrors.phoneNumber = "Invalid phone number format."
      }
    } else if (currentStep === 2) {
      if (!province) newErrors.province = "Province is required."
      if (!city) newErrors.city = "City is required."
      if (!barangay.trim()) newErrors.barangay = "Barangay is required."
      if (!zipCode.trim()) {
        newErrors.zipCode = "ZIP Code is required."
      } else if (!/^\d{4}$/.test(zipCode)) {
        newErrors.zipCode = "Invalid ZIP Code format (e.g., 1000)."
      }
    } else if (currentStep === 3) {
      if (!licenseNumber.trim()) newErrors.licenseNumber = "License number is required."
      if (!yearsOfExperience.trim()) newErrors.yearsOfExperience = "Years of experience is required." 
      if (!document) newErrors.document = "Please upload a document." 
    } else if (currentStep === 4) {
      if (!email.trim()) {
        newErrors.email = "Email address is required."
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = "Invalid email address format."
      }
      if (!password) {
        newErrors.password = "Password is required."
      } else if (password.length < 8) {
        newErrors.password = "Password must be at least 8 characters."
      }
      if (!confirmPassword) {
        newErrors.confirmPassword = "Confirm password is required."
      }
      if (password && confirmPassword && password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match."
      }
    }

    setErrors(newErrors)
    isValid = Object.keys(newErrors).length === 0
    return isValid
  }

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setErrors({}) 
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

// Handle form submission
const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validateStep()) return;

  const payload = {
    firstName,
    middleName,
    lastName,
    dob,
    sex,
    phoneNumber,
    province,
    city,
    barangay,
    zipCode,
    email,
    licenseNumber,
    yearsOfExperience,
    specialization: specialization || "",
    affiliatedOrganization: affiliatedOrganization || "",
    document: document || "", 
    password,
    password_confirmation: confirmPassword,
  };

  try {
    const response = await fetch("http://127.0.0.1:8000/api/signup/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      alert("Sign up successful!");
      console.log("Signup response:", data);
      navigate("/login");
    } else {
      if (data.errors) {
        setErrors(data.errors);
      } else {
        alert("Sign up failed: " + (data.error || "Unknown error"));
      }
    }
  } catch (error) {
    console.error("Error during sign up:", error);
    alert("Sign up failed due to network error.");
  }
};


  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <User className="h-5 w-5 text-[#10B981]" /> Personal & Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    setErrors((prev) => ({ ...prev, firstName: "" }))
                  }}
                  placeholder="First Name"
                  className={errors.firstName ? "border-red-500" : ""}
                  required
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  placeholder="Middle Name"
                  className={errors.middleName ? "border-red-500" : ""}
                />
                {errors.middleName && <p className="text-red-500 text-xs mt-1">{errors.middleName}</p>}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    setErrors((prev) => ({ ...prev, lastName: "" }))
                  }}
                  placeholder="Last Name"
                  className={errors.lastName ? "border-red-500" : ""}
                  required
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dob">Date Of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value)
                    setErrors((prev) => ({ ...prev, dob: "" }))
                  }}
                  placeholder="YYYY-MM-DD"
                  className={errors.dob ? "border-red-500" : ""}
                  required
                />
                {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
              </div>
              <div>
                <Label htmlFor="sex">Sex</Label>
                <Select
                  onValueChange={(value) => {
                    setSex(value)
                    setErrors((prev) => ({ ...prev, sex: "" }))
                  }}
                  value={sex}
                  required
                >
                  <SelectTrigger id="sex" className={errors.sex ? "border-red-500 bg-white" : "bg-white"}>
                    <SelectValue placeholder="Please Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sex && <p className="text-red-500 text-xs mt-1">{errors.sex}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value)
                  setErrors((prev) => ({ ...prev, phoneNumber: "" }))
                }}
                placeholder="e.g., +639123456789"
                className={errors.phoneNumber ? "border-red-500" : ""}
                required
              />
              {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#10B981]" /> Address in the Philippines
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="province">Province</Label>
                <Select
                  onValueChange={(value) => {
                    setProvince(value)
                    setCity("") // Reset city when province changes
                    setErrors((prev) => ({ ...prev, province: "", city: "" }))
                  }}
                  value={province}
                  required
                >
                  <SelectTrigger id="province" className={errors.province ? "border-red-500 bg-white" : "bg-white"}>
                    <SelectValue placeholder="Please Select" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="metro_manila">Metro Manila</SelectItem>
                    <SelectItem value="cebu">Cebu</SelectItem>
                    <SelectItem value="davao_del_sur">Davao del Sur</SelectItem>
                  </SelectContent>
                </Select>
                {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province}</p>}
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Select
                  onValueChange={(value) => {
                    setCity(value)
                    setErrors((prev) => ({ ...prev, city: "" }))
                  }}
                  value={city}
                  disabled={!province}
                  required
                >
                  <SelectTrigger id="city" className={errors.city ? "border-red-500 bg-white" : "bg-white"}>
                    <SelectValue placeholder={province ? "Select City" : "Select Province First"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {province && philippineLocations[province]?.map((cityName) => (
                      <SelectItem 
                        key={cityName} 
                        value={cityName.toLowerCase().replace(/\s+/g, '_')}
                      >
                        {cityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="barangay">Barangay</Label>
                <Input
                  id="barangay"
                  value={barangay}
                  onChange={(e) => {
                    setBarangay(e.target.value)
                    setErrors((prev) => ({ ...prev, barangay: "" }))
                  }}
                  placeholder="Enter Barangay"
                  className={errors.barangay ? "border-red-500" : ""}
                  required
                />
                {errors.barangay && <p className="text-red-500 text-xs mt-1">{errors.barangay}</p>}
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  value={zipCode}
                  onChange={(e) => {
                    setZipCode(e.target.value)
                    setErrors((prev) => ({ ...prev, zipCode: "" }))
                  }}
                  placeholder="e.g., 1000"
                  className={errors.zipCode ? "border-red-500" : ""}
                  required
                />
                {errors.zipCode && <p className="text-red-500 text-xs mt-1">{errors.zipCode}</p>}
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-[#10B981]" /> Professional Information
            </h3>
            <div>
              <Label htmlFor="licenseNumber">License Number (PRC or Veterinary License)</Label>
              <Input
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => {
                  setLicenseNumber(e.target.value)
                  setErrors((prev) => ({ ...prev, licenseNumber: "" }))
                }}
                placeholder="Enter license number"
                className={errors.licenseNumber ? "border-red-500" : ""}
                required
              />
              {errors.licenseNumber && <p className="text-red-500 text-xs mt-1">{errors.licenseNumber}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                <Input
                id="yearsOfExperience"
                type="number"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                placeholder="e.g., 5"
                className={errors.yearsOfExperience ? "border-red-500" : ""}
              />
              {errors.yearsOfExperience && <p className="text-red-500 text-xs mt-1">{errors.yearsOfExperience}</p>}

              </div>
              <div>
                <Label htmlFor="specialization">Specialization (Optional)</Label>
                <Input
                  id="specialization"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g., Equine, Large Animals"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="affiliatedOrganization">Affiliated Organization (Optional)</Label>
              <Input
                id="affiliatedOrganization"
                value={affiliatedOrganization}
                onChange={(e) => setAffiliatedOrganization(e.target.value)}
                placeholder="e.g., Philippine Veterinary Medical Association"
              />
            </div>

            {/* Document Uploads */}
            <div className="space-y-4 mt-6">
              <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
                <Upload className="h-5 w-5 text-[#10B981]" /> Document Uploads
              </h3>
              <div className="flex items-center space-x-2">
                <Label
                  htmlFor="documentUpload"
                  className="cursor-pointer flex items-center gap-2 text-[#10B981] hover:text-[#0e9f71]"
                >
                  <Upload className="h-4 w-4" />
                  Upload your professional documents (e.g., License, Certifications)
                </Label>
                <Input
                  id="documentUpload"
                  type="file"
                  onChange={(e) => setDocument(e.target.files ? e.target.files[0] : null)}
                  className="hidden"
              />
                {document && <span className="text-sm text-gray-500">{document.name}</span>}
              </div>
              {errors.document && <p className="text-red-500 text-xs mt-1">{errors.document}</p>}

              <p className="text-sm text-gray-500">
                Note: Actual file upload functionality requires backend integration. This is a placeholder.
              </p>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#10B981]" /> Set up your login
            </h3>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors((prev) => ({ ...prev, email: "" }))
                }}
                placeholder="your.email@example.com"
                className={errors.email ? "border-red-500" : ""}
                required
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              <p className="text-xs text-gray-500 mt-1">
                This will be your login email address.
              </p>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors((prev) => ({ ...prev, password: "" }))
                  }}
                  placeholder="Enter your password"
                  className={errors.password ? "border-red-500" : ""}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }))
                  }}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? "border-red-500" : ""}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl relative">
        {/* Back to Login Link */}
        <div className="mb-6 animate-in slide-in-from-top duration-500">
          <button className="inline-flex items-center text-sm text-gray-600 hover:text-[#10B981] transition-colors group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to Login
          </button>
        </div>

        {/* Sign Up Card */}
        <Card className="shadow-xl border border-gray-100 bg-white/90 backdrop-blur-sm animate-in slide-in-from-bottom duration-700">
          <CardHeader className="text-center space-y-2 pb-6 border-b border-gray-100">
            <div className="flex items-center justify-center mb-2">
              <Stethoscope className="h-8 w-8 text-[#10B981]" />
              <span className="text-3xl font-bold text-gray-900 ml-2">Echo</span>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">Create Your Veterinarian Account</CardTitle>
            <CardDescription className="text-gray-600">
              Join Echo to streamline your practice management.
            </CardDescription>
            {/* Progress Indicator */}
            <div className="flex flex-col items-center mt-6">
              <div className="flex justify-center items-center space-x-2 w-full max-w-md">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      currentStep >= index + 1 ? "bg-[#10B981] shadow-sm" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between w-full max-w-md mt-2 text-xs font-medium text-gray-500">
                {stepTitles.map((title, index) => (
                  <span
                    key={index}
                    className={`flex-1 text-center transition-colors duration-300 ${
                      currentStep >= index + 1 ? "text-[#10B981]" : "text-gray-400"
                    }`}
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 p-6 md:p-8">
            <div className="space-y-6">
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevious}
                    className="hover:scale-105 transition-all duration-200 hover:shadow-md bg-transparent text-gray-700 border-gray-300"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                )}
                {currentStep < totalSteps && (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="ml-auto bg-[#10B981] hover:bg-[#0e9f71] text-white hover:scale-[1.02] transition-all duration-200 hover:shadow-lg"
                  >
                    Next
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                )}
                {currentStep === totalSteps && (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full bg-[#10B981] hover:bg-[#0e9f71] text-white py-3 text-base font-medium hover:scale-[1.02] transition-all duration-200 hover:shadow-lg"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" /> Create Account
                  </Button>
                )}
              </div>
            </div>

            {/* Already have an account link */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <button className="text-[#10B981] hover:text-[#0e9f71] font-medium hover:underline transition-colors">
                  Sign in
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500 animate-in fade-in duration-500 delay-1400">
          <p>© 2025 Echo - Veterinarian. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <a href="#" className="hover:text-[#10B981] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[#10B981] transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-[#10B981] transition-colors">
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp