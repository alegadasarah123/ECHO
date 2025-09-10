"use client"

// Enhanced Signup Component with Role Selection - No Username Required
import { useState } from "react"
import { useRouter } from "expo-router"
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Image,
  Platform,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import {
  launchImageLibrary,
  launchCamera,
  type ImagePickerResponse,
  type MediaType,
  type PhotoQuality,
} from "react-native-image-picker"

const { width, height } = Dimensions.get("window")

// Responsive scaling functions
const scale = (size: number) => (width / 375) * size
// const verticalScale = (size: number) => (height / 812) * size
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor

// Cebu Province cities and municipalities
const cebuCities = [
  "Cebu City",
  "Mandaue City",
  "Lapu-Lapu City",
  "Talisay City",
  "Toledo City",
  "Danao City",
  "Carcar City",
]

const cebuMunicipalities = [
  "Alcantara",
  "Alcoy",
  "Alegria",
  "Aloguinsan",
  "Argao",
  "Asturias",
  "Badian",
  "Balamban",
  "Bantayan",
  "Barili",
  "Bogo",
  "Boljoon",
  "Borbon",
  "Carmen",
  "Catmon",
  "Compostela",
  "Consolacion",
  "Cordova",
  "Daanbantayan",
  "Dalaguete",
  "Dumanjug",
  "Ginatilan",
  "Liloan",
  "Madridejos",
  "Malabuyoc",
  "Medellin",
  "Minglanilla",
  "Moalboal",
  "Oslob",
  "Pilar",
  "Pinamungajan",
  "Poro",
  "Ronda",
  "Samboan",
  "San Fernando",
  "San Francisco",
  "San Remigio",
  "Santa Fe",
  "Santander",
  "Sibonga",
  "Sogod",
  "Tabogon",
  "Tabuelan",
  "Tuburan",
  "Tudela",
]

// Combined list for city selection
const allCebuLocations = [...cebuCities, ...cebuMunicipalities].sort()

const municipalitiesByCity: { [key: string]: string[] } = {
  "Cebu City": ["Apas", "Lahug", "Capitol Site", "Guadalupe", "Mabolo", "Banilad", "Talamban", "Kasambagan"],
  "Mandaue City": ["Alang-alang", "Bakilid", "Banilad", "Basak", "Cabancalan", "Canduman", "Casuntingan"],
  "Lapu-Lapu City": ["Agus", "Babag", "Bankal", "Basak", "Buaya", "Calawisan", "Canjulao", "Caubian"],
  "Talisay City": ["Biasong", "Bulacao", "Cadulawan", "Camp Lapu-lapu", "Candulawan", "Cansojong"],
  "Toledo City": ["Awihao", "Bagakay", "Bato", "Biga", "Bulongan", "Calongcalong", "Cambang-ug"],
  "Danao City": ["Baliang", "Bayabas", "Binaliw", "Cabanawan", "Cabungahan", "Cagat-lamac"],
  "Carcar City": ["Bolinawan", "Buenavista", "Can-asujan", "Guadalupe", "Liburon", "Napo"],
}

const sexOptions = ["Male", "Female", "Other", "Prefer not to say"]

// Role options for the signup
const roleOptions = [
  {
    value: "Kutsero",
    label: "Kutsero",
    description: "Driver of horse-drawn vehicle",
    icon: "🐴",
  },
  {
    value: "Horse Operator", 
    label: "Horse Operator",
    description: "Owner/operator of horse business",
    icon: "🏇",
  },
]

const routeOptions = [
  "Route 1 - North Cebu",
  "Route 2 - South Cebu",
  "Route 3 - Metro Cebu",
  "Route 4 - Cebu City Center",
  "Route 5 - Mactan Island",
]

const toOptions = [
  "SM City Cebu",
  "Ayala Center Cebu",
  "Robinson's Galleria Cebu",
  "SM Seaside City Cebu",
  "IT Park",
  "Lahug",
  "Capitol Site",
  "Colon Street",
]

interface DropdownFieldProps {
  label: string
  value: string
  placeholder: string
  options: string[]
  onSelect: (value: string) => void
  disabled?: boolean
}

// Define proper types for profile picture
interface ProfilePicture {
  uri: string
  type?: string
  name?: string
}

// Updated API configuration
const API_CONFIG = {
  BASE_URL: 'http://172.20.10.2:8000/api/signup_mobile/',
  TIMEOUT: 60000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY: 3000,
}

export default function Signup() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [dropdownVisible, setDropdownVisible] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Form data states - REMOVED username field, now only 5 steps
  const [formData, setFormData] = useState({
    // Step 1 - Personal Info
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: new Date(),
    sex: "",
    phoneNumber: "",

    // Step 2 - Role Selection
    role: "",

    // Step 3 - Location (Cebu only)
    city: "",
    municipality: "",
    barangay: "",
    zipCode: "",
    houseAddress: "",
    route: "",
    to: "",

    // Step 4 - Facebook Link
    facebook: "",

    // Step 5 -   l Login Credentials
    email: "",
    password: "",
    confirmPassword: "",

    // Step 6 - Profile Picture
    profilePicture: null as ProfilePicture | null,
  })

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Reset dependent fields when parent changes
      if (field === "city") {
        updated.municipality = ""
      }

      return updated
    })
  }

  const nextStep = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios")
    if (selectedDate) {
      updateFormData("dateOfBirth", selectedDate)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-CA") // YYYY-MM-DD format
  }

  const handleImagePicker = () => {
    Alert.alert("Select Profile Photo", "Choose how you'd like to add your profile picture", [
      {
        text: "Camera",
        onPress: () => openCamera(),
      },
      {
        text: "Photo Library",
        onPress: () => openImageLibrary(),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ])
  }

  // Updated camera function with proper null checks
  const openCamera = () => {
    const options = {
      mediaType: "photo" as MediaType,
      quality: 0.8 as PhotoQuality,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
      saveToPhotos: false,
    }

    launchCamera(options, (response: ImagePickerResponse) => {
      console.log('Camera response:', response)
      
      if (response.didCancel) {
        console.log('User cancelled camera')
        return
      }

      if (response.errorMessage) {
        console.log('Camera error:', response.errorMessage)
        Alert.alert('Camera Error', response.errorMessage)
        return
      }

      // Add proper null/undefined checks here
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0]
        
        // Check if uri exists before proceeding
        if (!asset.uri) {
          Alert.alert('Error', 'No image was captured')
          return
        }
        
        const imageUri = asset.uri
        
        console.log('Camera image selected:', imageUri)
        setSelectedImage(imageUri)
        
        const profilePictureData: ProfilePicture = {
          uri: imageUri, // Now guaranteed to be string
          type: asset.type || "image/jpeg",
          name: asset.fileName || "profile_camera.jpg",
        }
        
        updateFormData("profilePicture", profilePictureData)
      } else {
        Alert.alert('Error', 'No image was captured')
      }
    })
  }

  // Updated image library function with proper null checks
  const openImageLibrary = () => {
    const options = {
      mediaType: "photo" as MediaType,
      quality: 0.8 as PhotoQuality,
      maxWidth: 800,
      maxHeight: 800,
      includeBase64: false,
      selectionLimit: 1,
    }

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      console.log('Image library response:', response)
      
      if (response.didCancel) {
        console.log('User cancelled image picker')
        return
      }

      if (response.errorMessage) {
        console.log('Image picker error:', response.errorMessage)
        Alert.alert('Image Picker Error', response.errorMessage)
        return
      }

      // Add proper null/undefined checks here
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0]
        
        // Check if uri exists before proceeding
        if (!asset.uri) {
          Alert.alert('Error', 'No image was selected')
          return
        }
        
        const imageUri = asset.uri
        
        console.log('Gallery image selected:', imageUri)
        setSelectedImage(imageUri)
        
        const profilePictureData: ProfilePicture = {
          uri: imageUri, // Now guaranteed to be string
          type: asset.type || "image/jpeg",
          name: asset.fileName || "profile_gallery.jpg",
        }
        
        updateFormData("profilePicture", profilePictureData)
      } else {
        Alert.alert('Error', 'No image was selected')
      }
    })
  }

  const handleSignUp = async () => {
    if (isLoading) return

    // Validation - updated validation without username
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      Alert.alert("Error", "Please fill in all required fields")
      return
    }

    if (!formData.email.trim()) {
      Alert.alert("Error", "Email is required")
      return
    }

    if (!formData.email.includes('@')) {
      Alert.alert("Error", "Please enter a valid email address")
      return
    }

    if (!formData.role) {
      Alert.alert("Error", "Please select your role")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)

    try {
      // Create FormData for multipart upload
      const uploadData = new FormData()

      // Add all text form fields (removed username)
      const fieldsToAdd = {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        dob: formData.dateOfBirth.toISOString().split("T")[0],
        sex: formData.sex,
        phoneNumber: formData.phoneNumber,
        role: formData.role, // Include role in the data
        province: "Cebu",
        city: formData.city,
        municipality: formData.municipality,
        barangay: formData.barangay,
        zipCode: formData.zipCode,
        houseAddress: formData.houseAddress,
        route: formData.route,
        to: formData.to,
        email: formData.email, // Email is now the main identifier
        facebook: formData.facebook,
        password: formData.password,
      }

      // Add text fields to FormData
      Object.entries(fieldsToAdd).forEach(([key, value]) => {
        if (value !== null && value !== "") {
          uploadData.append(key, String(value))
        }
      })

      // Handle image upload properly for React Native
      if (formData.profilePicture && formData.profilePicture.uri) {
        const profilePic = formData.profilePicture

        // For React Native, we need to create the proper file object
        const imageFile = {
          uri: profilePic.uri,
          type: profilePic.type || "image/jpeg",
          name: profilePic.name || "profile.jpg",
        }

        console.log("Adding profile picture to FormData:", imageFile)
        uploadData.append("profilePicture", imageFile as any)
      }

      console.log("Sending request to:", API_CONFIG.BASE_URL)
      console.log("User selected role:", formData.role)
      console.log("User email:", formData.email)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)

      const response = await fetch(API_CONFIG.BASE_URL, {
        method: "POST",
        body: uploadData,
        headers: {
          // Don't set Content-Type header - let the browser/RN set it automatically for FormData
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log("Response status:", response.status)

      if (response.ok) {
        const result = await response.json()
        console.log("Signup successful:", result)
        console.log("Backend returned role:", result.role)

        Alert.alert(
          "Success!",
          "Your account has been created successfully. Please check your email for verification and wait for admin approval.",
          [
            {
              text: "OK",
              onPress: () => {
                // Get the user role to determine navigation
                const userRole = formData.role
                console.log("Navigating based on user role:", userRole)
                
                // Reset form
                setFormData({
                  firstName: "",
                  middleName: "",
                  lastName: "",
                  dateOfBirth: new Date(),
                  sex: "",
                  phoneNumber: "",
                  role: "",
                  city: "",
                  municipality: "",
                  barangay: "",
                  zipCode: "",
                  houseAddress: "",
                  route: "",
                  to: "",
                  facebook: "",
                  email: "",
                  password: "",
                  confirmPassword: "",
                  profilePicture: null,
                })
                setSelectedImage(null)
                setCurrentStep(1)
                
                // Navigate to login page - let users log in with email/password
                console.log("✅ Redirecting to Login")
                router.replace("/auth/login")

                // FIXED: Navigate to appropriate dashboard based on role
                if (userRole === "Horse Oerator") {
                  console.log("✅ Redirecting to Horse Operator dashboard")
                  router.replace("/HORSE_OPERATOR/home")
                } else if (userRole === "Kutsero") {
                  console.log("✅ Redirecting to Kutsero dashboard")
                  router.replace("/KUTSERO/dashboard")
                } else {
                  console.log("⚠️ Unknown role, redirecting to login")
                  router.replace("/auth/login")
                }
              },
            },
          ],
        )
      } else {
        const errorText = await response.text()
        console.log("Signup error response:", errorText)

        try {
          const errorData = JSON.parse(errorText)
          Alert.alert("Error", errorData.message || "Failed to create account. Please try again.")
        } catch {
          Alert.alert("Error", `Server error (${response.status}). Please try again.`)
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error)

      if (error.name === "AbortError") {
        Alert.alert("Error", "Request timed out. Please check your connection and try again.")
      } else if (error.message.includes("Network")) {
        Alert.alert("Error", "Network error. Please check your connection and try again.")
      } else {
        Alert.alert("Error", "An unexpected error occurred. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.replace("/auth/login")
  }

  const DropdownField = ({ label, value, placeholder, options, onSelect, disabled = false }: DropdownFieldProps) => {
    const dropdownKey = label.toLowerCase().replace(/\s+/g, "")

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity
          style={[styles.dropdownContainer, disabled && styles.disabledDropdown]}
          onPress={() => !disabled && setDropdownVisible(dropdownKey)}
          disabled={disabled}
        >
          <Text style={[styles.dropdownText, !value && styles.placeholderText]}>{value || placeholder}</Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={dropdownVisible === dropdownKey}
          transparent
          animationType="fade"
          onRequestClose={() => setDropdownVisible(null)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(null)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <FlatList
                data={options}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={() => {
                      onSelect(item)
                      setDropdownVisible(null)
                    }}
                  >
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                style={styles.optionsList}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    )
  }

  const renderStep1 = () => {
    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Tell us about yourself</Text>
        <Text style={styles.stepSubtitle}>Please complete the information below</Text>

        <Text style={styles.sectionTitle}>Your Name</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={formData.firstName}
            onChangeText={(value) => updateFormData("firstName", value)}
            placeholder="First Name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={formData.middleName}
            onChangeText={(value) => updateFormData("middleName", value)}
            placeholder="Middle Name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={formData.lastName}
            onChangeText={(value) => updateFormData("lastName", value)}
            placeholder="Last Name"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Date of Birth</Text>
          <TouchableOpacity style={styles.dateInputContainer} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>{formatDate(formData.dateOfBirth)}</Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={formData.dateOfBirth}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        <DropdownField
          label="Sex"
          value={formData.sex}
          placeholder="Please Select"
          options={sexOptions}
          onSelect={(value) => updateFormData("sex", value)}
        />

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.textInput}
            value={formData.phoneNumber}
            onChangeText={(value) => updateFormData("phoneNumber", value)}
            placeholder="Your Contact Number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.signInLinkContainer}>
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <TouchableOpacity onPress={handleBackToLogin} style={styles.signInTouchable}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </Text>
        </View>
      </ScrollView>
    )
  }

  // Role Selection Step
  const renderStep2 = () => {
    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Select Your Role</Text>
        <Text style={styles.stepSubtitle}>Choose what describes you best</Text>

        <View style={styles.roleSelectionContainer}>
          {roleOptions.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[
                styles.roleCard,
                formData.role === role.value && styles.roleCardSelected,
              ]}
              onPress={() => updateFormData("role", role.value)}
            >
              <View style={styles.roleIconContainer}>
                <Text style={styles.roleIcon}>{role.icon}</Text>
              </View>
              <View style={styles.roleContent}>
                <Text style={[
                  styles.roleLabel,
                  formData.role === role.value && styles.roleLabelSelected,
                ]}>
                  {role.label}
                </Text>
                <Text style={[
                  styles.roleDescription,
                  formData.role === role.value && styles.roleDescriptionSelected,
                ]}>
                  {role.description}
                </Text>
              </View>
              <View style={styles.roleRadio}>
                <View style={[
                  styles.radioOuter,
                  formData.role === role.value && styles.radioOuterSelected,
                ]}>
                  {formData.role === role.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.prevButton} onPress={prevStep}>
            <Text style={styles.prevButtonText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Link */}
        <View style={styles.signInLinkContainer}>
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <TouchableOpacity onPress={handleBackToLogin} style={styles.signInTouchable}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </Text>
        </View>
      </ScrollView>
    )
  }

  const renderStep3 = () => {
    const availableMunicipalities = formData.city ? municipalitiesByCity[formData.city] || [] : []

    return (
      <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepTitle}>Tell us about yourself</Text>
        <Text style={styles.stepSubtitle}>Please complete the information below</Text>

        <Text style={styles.sectionTitle}>ADDRESS IN CEBU PROVINCE</Text>
        <DropdownField
          label="City/Municipality"
          value={formData.city}
          placeholder="Select City or Municipality in Cebu"
          options={allCebuLocations}
          onSelect={(value) => updateFormData("city", value)}
        />

        {availableMunicipalities.length > 0 && (
          <DropdownField
            label="Barangay/District"
            value={formData.municipality}
            placeholder="Please Select"
            options={availableMunicipalities}
            onSelect={(value) => updateFormData("municipality", value)}
            disabled={!formData.city}
          />
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Barangay</Text>
          <TextInput
            style={styles.textInput}
            value={formData.barangay}
            onChangeText={(value) => updateFormData("barangay", value)}
            placeholder="Enter your barangay"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Zip Code</Text>
          <TextInput
            style={styles.textInput}
            value={formData.zipCode}
            onChangeText={(value) => updateFormData("zipCode", value)}
            placeholder="Enter zip code"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>House Number or Street Address</Text>
          <TextInput
            style={styles.textInput}
            value={formData.houseAddress}
            onChangeText={(value) => updateFormData("houseAddress", value)}
            placeholder="Enter your address"
            placeholderTextColor="#999"
          />
        </View>

        <DropdownField
          label="Route"
          value={formData.route}
          placeholder="Please Select"
          options={routeOptions}
          onSelect={(value) => updateFormData("route", value)}
        />

        <DropdownField
          label="To"
          value={formData.to}
          placeholder="Please Select"
          options={toOptions}
          onSelect={(value) => updateFormData("to", value)}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.prevButton} onPress={prevStep}>
            <Text style={styles.prevButtonText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Link */}
        <View style={styles.signInLinkContainer}>
          <Text style={styles.signInText}>
            Already have an account?{" "}
            <TouchableOpacity onPress={handleBackToLogin} style={styles.signInTouchable}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </Text>
        </View>
      </ScrollView>
    )
  }

  const renderStep4 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>Please complete the information below</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Facebook Link</Text>
        <TextInput
          style={styles.textInput}
          value={formData.facebook}
          onChangeText={(value) => updateFormData("facebook", value)}
          placeholder="Your Facebook Link (optional)"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.prevButton} onPress={prevStep}>
          <Text style={styles.prevButtonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={nextStep}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Link */}
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>
          Already have an account?{" "}
          <TouchableOpacity onPress={handleBackToLogin} style={styles.signInTouchable}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </Text>
      </View>
    </ScrollView>
  )

  const renderStep5 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Login Credentials</Text>
      <Text style={styles.stepSubtitle}>Create your login information</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={styles.textInput}
          value={formData.email}
          onChangeText={(value) => updateFormData("email", value)}
          placeholder="Your Email Address"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={styles.passwordInput}
            value={formData.password}
            onChangeText={(value) => updateFormData("password", value)}
            placeholder="Create a password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            editable={!isLoading}
          />
          <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setShowPassword(!showPassword)}>
            <View style={styles.eyeIcon}>
              {showPassword ? (
                <View style={styles.eyeOpen}>
                  <View style={styles.eyeball} />
                </View>
              ) : (
                <View style={styles.eyeClosed}>
                  <View style={styles.eyeball} />
                  <View style={styles.eyeLine} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.helperText}>Must be at least 8 characters</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={styles.passwordInputContainer}>
          <TextInput
            style={styles.passwordInput}
            value={formData.confirmPassword}
            onChangeText={(value) => updateFormData("confirmPassword", value)}
            placeholder="Confirm your password"
            placeholderTextColor="#999"
            secureTextEntry={!showConfirmPassword}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeIconContainer}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <View style={styles.eyeIcon}>
              {showConfirmPassword ? (
                <View style={styles.eyeOpen}>
                  <View style={styles.eyeball} />
                </View>
              ) : (
                <View style={styles.eyeClosed}>
                  <View style={styles.eyeball} />
                  <View style={styles.eyeLine} />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.prevButton, isLoading && styles.disabledButton]}
          onPress={prevStep}
          disabled={isLoading}
        >
          <Text style={styles.prevButtonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, isLoading && styles.disabledButton]}
          onPress={nextStep}
          disabled={isLoading}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Link */}
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>
          Already have an account?{" "}
          <TouchableOpacity onPress={handleBackToLogin} style={styles.signInTouchable}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </Text>
      </View>
    </ScrollView>
  )

  const renderStep6 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Set Your Profile Picture</Text>
      <Text style={styles.stepSubtitle}>Upload or capture a photo for your profile</Text>

      <View style={styles.profilePictureContainer}>
        <View style={styles.profilePicturePlaceholder}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileIcon}>
              <View style={styles.profileHead} />
              <View style={styles.profileBody} />
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.photoButton} onPress={handleImagePicker} disabled={isLoading}>
        <Text style={styles.photoButtonText}>📷 {selectedImage ? "Change Profile Photo" : "Add Profile Photo"}</Text>
      </TouchableOpacity>

      {selectedImage && (
        <TouchableOpacity
          style={styles.removePhotoButton}
          onPress={() => {
            setSelectedImage(null)
            updateFormData("profilePicture", null)
          }}
          disabled={isLoading}
        >
          <Text style={styles.removePhotoButtonText}>🗑️ Remove Photo</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.optionalText}>Profile photo is optional. You can skip this step and add it later.</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.prevButton, isLoading && styles.disabledButton]}
          onPress={prevStep}
          disabled={isLoading}
        >
          <Text style={styles.prevButtonText}>Previous</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.signUpButton, isLoading && styles.disabledButton]}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          <Text style={styles.signUpButtonText}>{isLoading ? "Creating Account..." : "Sign Up"}</Text>
        </TouchableOpacity>
      </View>

      {/* Sign In Link */}
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>
          Already have an account?{" "}
          <TouchableOpacity onPress={handleBackToLogin} style={styles.signInTouchable}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </Text>
      </View>
    </ScrollView>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2() // Role selection step
      case 3:
        return renderStep3()
      case 4:
        return renderStep4() // Email & contact
      case 5:
        return renderStep5() // Password only
      case 6:
        return renderStep6()
      default:
        return renderStep1()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />

      {/* Orange Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign Up</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Progress Indicator - Shows 6 steps */}
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <View key={step} style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  currentStep >= step && styles.progressCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.progressText,
                    currentStep >= step && styles.progressTextActive,
                  ]}
                >
                  {step}
                </Text>
              </View>
              {step < 6 && (
                <View
                  style={[
                    styles.progressLine,
                    currentStep > step && styles.progressLineActive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* White Content Section */}
      <View style={styles.contentSection}>
        {renderCurrentStep()}
      </View>
    </SafeAreaView>
  )
}

// StyleSheet - Enhanced with role selection styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#B8763E",
  },
  headerSection: {
    backgroundColor: "#B8763E",
    paddingTop: moderateScale(10),
    paddingBottom: moderateScale(20),
    paddingHorizontal: moderateScale(20),
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: moderateScale(20),
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(18),
    fontWeight: "bold",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: moderateScale(20),
    fontWeight: "bold",
  },
  placeholder: {
    width: moderateScale(40),
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressCircle: {
    width: moderateScale(25),
    height: moderateScale(25),
    borderRadius: moderateScale(12.5),
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  progressCircleActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  progressText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: moderateScale(10),
    fontWeight: "bold",
  },
  progressTextActive: {
    color: "#B8763E",
  },
  progressLine: {
    width: moderateScale(20),
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  progressLineActive: {
    backgroundColor: "#FFFFFF",
  },
  contentSection: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: moderateScale(25),
    borderTopRightRadius: moderateScale(25),
    marginTop: moderateScale(-10),
    paddingTop: moderateScale(20),
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: moderateScale(20),
  },
  stepTitle: {
    fontSize: moderateScale(24),
    fontWeight: "bold",
    color: "#333333",
    textAlign: "center",
    marginBottom: moderateScale(8),
  },
  stepSubtitle: {
    fontSize: moderateScale(14),
    color: "#666666",
    textAlign: "center",
    marginBottom: moderateScale(30),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#333333",
    marginBottom: moderateScale(15),
    marginTop: moderateScale(10),
  },
  
  // Role selection styles
  roleSelectionContainer: {
    marginBottom: moderateScale(30),
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: moderateScale(12),
    padding: moderateScale(20),
    marginBottom: moderateScale(15),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  roleCardSelected: {
    borderColor: "#B8763E",
    backgroundColor: "#FFF8F5",
  },
  roleIconContainer: {
    marginRight: moderateScale(15),
  },
  roleIcon: {
    fontSize: moderateScale(32),
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#333333",
    marginBottom: moderateScale(4),
  },
  roleLabelSelected: {
    color: "#B8763E",
  },
  roleDescription: {
    fontSize: moderateScale(14),
    color: "#666666",
    lineHeight: moderateScale(20),
  },
  roleDescriptionSelected: {
    color: "#8B5A2B",
  },
  roleRadio: {
    marginLeft: moderateScale(10),
  },
  radioOuter: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    borderWidth: 2,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  radioOuterSelected: {
    borderColor: "#B8763E",
  },
  radioInner: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: "#B8763E",
  },
  
  // Rest of the existing styles...
  inputContainer: {
    marginBottom: moderateScale(15),
  },
  inputLabel: {
    fontSize: moderateScale(14),
    fontWeight: "500",
    color: "#333333",
    marginBottom: moderateScale(5),
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(15),
    paddingVertical: moderateScale(12),
    fontSize: moderateScale(16),
    backgroundColor: "#FFFFFF",
    color: "#333333",
  },
  helperText: {
    fontSize: moderateScale(12),
    color: "#666666",
    marginTop: moderateScale(5),
  },
  dateInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(15),
    paddingVertical: moderateScale(12),
    backgroundColor: "#FFFFFF",
  },
  dateText: {
    fontSize: moderateScale(16),
    color: "#333333",
  },
  calendarIcon: {
    fontSize: moderateScale(18),
  },
  dropdownContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(15),
    paddingVertical: moderateScale(12),
    backgroundColor: "#FFFFFF",
  },
  disabledDropdown: {
    backgroundColor: "#F5F5F5",
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: moderateScale(16),
    color: "#333333",
  },
  placeholderText: {
    color: "#999999",
  },
  dropdownArrow: {
    fontSize: moderateScale(12),
    color: "#666666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: moderateScale(10),
    padding: moderateScale(20),
    width: width * 0.8,
    maxHeight: height * 0.6,
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: "bold",
    color: "#333333",
    textAlign: "center",
    marginBottom: moderateScale(15),
  },
  optionsList: {
    maxHeight: height * 0.4,
  },
  optionItem: {
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionText: {
    fontSize: moderateScale(16),
    color: "#333333",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: moderateScale(8),
    backgroundColor: "#FFFFFF",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: moderateScale(15),
    paddingVertical: moderateScale(12),
    fontSize: moderateScale(16),
    color: "#333333",
  },
  eyeIconContainer: {
    paddingHorizontal: moderateScale(15),
    paddingVertical: moderateScale(12),
  },
  eyeIcon: {
    width: moderateScale(20),
    height: moderateScale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  eyeOpen: {
    width: moderateScale(16),
    height: moderateScale(12),
    borderWidth: 2,
    borderColor: "#666666",
    borderRadius: moderateScale(8),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eyeClosed: {
    width: moderateScale(16),
    height: moderateScale(12),
    borderWidth: 2,
    borderColor: "#666666",
    borderRadius: moderateScale(8),
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  eyeball: {
    width: moderateScale(6),
    height: moderateScale(6),
    backgroundColor: "#666666",
    borderRadius: moderateScale(3),
  },
  eyeLine: {
    position: "absolute",
    width: moderateScale(18),
    height: 2,
    backgroundColor: "#666666",
    transform: [{ rotate: "45deg" }],
  },
  profilePictureContainer: {
    alignItems: "center",
    marginVertical: moderateScale(30),
  },
  profilePicturePlaceholder: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  profileImage: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
  },
  profileIcon: {
    alignItems: "center",
  },
  profileHead: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    backgroundColor: "#CCCCCC",
    marginBottom: moderateScale(5),
  },
  profileBody: {
    width: moderateScale(45),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    backgroundColor: "#CCCCCC",
  },
  photoButton: {
    backgroundColor: "#B8763E",
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(20),
    borderRadius: moderateScale(8),
    alignItems: "center",
    marginHorizontal: moderateScale(20),
    marginBottom: moderateScale(10),
  },
  photoButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  removePhotoButton: {
    backgroundColor: "#FF4444",
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(20),
    borderRadius: moderateScale(8),
    alignItems: "center",
    marginHorizontal: moderateScale(20),
    marginBottom: moderateScale(15),
  },
  removePhotoButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  optionalText: {
    fontSize: moderateScale(12),
    color: "#999999",
    textAlign: "center",
    marginHorizontal: moderateScale(20),
    marginBottom: moderateScale(20),
    lineHeight: moderateScale(18),
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: moderateScale(0),
    marginTop: moderateScale(30),
    marginBottom: moderateScale(20),
  },
  prevButton: {
    backgroundColor: "#F0F0F0",
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(30),
    borderRadius: moderateScale(8),
    flex: 0.45,
    alignItems: "center",
  },
  prevButtonText: {
    color: "#666666",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#B8763E",
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(30),
    borderRadius: moderateScale(8),
    flex: 0.45,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  signUpButton: {
    backgroundColor: "#B8763E",
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(30),
    borderRadius: moderateScale(8),
    flex: 0.45,
    alignItems: "center",
  },
  signUpButtonText: {
    color: "#FFFFFF",
    fontSize: moderateScale(16),
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Sign In Link styles
  signInLinkContainer: {
    alignItems: "center",
    marginTop: moderateScale(20),
    marginBottom: moderateScale(30),
  },
  signInText: {
    fontSize: moderateScale(14),
    color: "#666666",
    textAlign: "center",
  },
  signInTouchable: {
    marginLeft: moderateScale(2),
  },
  signInLink: {
    fontSize: moderateScale(14),
    color: "#B8763E",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
})