// Enhanced Signup Component with Role Selection, Membership, and Document Upload
import { useState, useEffect, useRef } from "react"
import { useRouter } from "expo-router"
import {
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
  ActivityIndicator,
  Animated,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from 'expo-file-system/legacy'
import { Ionicons } from '@expo/vector-icons'

const { width, height } = Dimensions.get("window")

// Responsive scaling functions
const scale = (size: number) => (width / 375) * size
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor
const verticalScale = (size: number) => (height / 812) * size

// Toast Message Component
const ToastMessage = ({ message, type, visible, onHide, fieldName }: { message: string; type: 'success' | 'error' | 'info'; visible: boolean; onHide: () => void; fieldName?: string }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start()

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: -20, duration: 300, useNativeDriver: true }),
        ]).start(() => onHide())
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [visible])

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#4CAF50'
      case 'error': return '#FF4444'
      default: return '#B8763E'
    }
  }

  if (!visible) return null

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  )
}

// Custom hook for Philippine locations
const usePhilippinesLocations = () => {
  const [provinces, setProvinces] = useState<string[]>([])
  const [citiesCache, setCitiesCache] = useState<{[key: string]: string[]}>({})
  const [barangaysCache, setBarangaysCache] = useState<{[key: string]: string[]}>({})
  const [apiAvailable, setApiAvailable] = useState(true)
  const [loadingProvinces, setLoadingProvinces] = useState(true)

  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const response = await fetch('https://psgc.gitlab.io/api/provinces/', { method: 'GET', headers: { 'Accept': 'application/json' } })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        const data = await response.json()
        const provincesList = data.map((province: any) => province.name).sort()
        setProvinces(provincesList)
        setApiAvailable(true)
      } catch (error) {
        const fallbackProvinces = ["Abra", "Agusan del Norte", "Agusan del Sur", "Aklan", "Albay", "Antique", "Apayao", "Aurora", "Basilan", "Bataan", "Batanes", "Batangas", "Benguet", "Biliran", "Bohol", "Bukidnon", "Bulacan", "Cagayan", "Camarines Norte", "Camarines Sur", "Camiguin", "Capiz", "Catanduanes", "Cavite", "Cebu", "Cotabato", "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental", "Dinagat Islands", "Eastern Samar", "Guimaras", "Ifugao", "Ilocos Norte", "Ilocos Sur", "Iloilo", "Isabela", "Kalinga", "La Union", "Laguna", "Lanao del Norte", "Lanao del Sur", "Leyte", "Maguindanao del Norte", "Maguindanao del Sur", "Marinduque", "Masbate", "Metro Manila", "Misamis Occidental", "Misamis Oriental", "Mountain Province", "Negros Occidental", "Negros Oriental", "Northern Samar", "Nueva Ecija", "Nueva Vizcaya", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Pampanga", "Pangasinan", "Quezon", "Quirino", "Rizal", "Romblon", "Samar", "Sarangani", "Siquijor", "Sorsogon", "South Cotabato", "Southern Leyte", "Sultan Kudarat", "Sulu", "Surigao del Norte", "Surigao del Sur", "Tarlac", "Tawi-Tawi", "Zambales", "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"]
        setProvinces(fallbackProvinces)
        setApiAvailable(false)
      } finally {
        setLoadingProvinces(false)
      }
    }
    loadProvinces()
  }, [])

  const getCities = async (provinceName: string): Promise<string[]> => {
    if (!provinceName) return []
    if (citiesCache[provinceName]) return citiesCache[provinceName]
    try {
      const provincesResponse = await fetch('https://psgc.gitlab.io/api/provinces/')
      if (!provincesResponse.ok) throw new Error('Failed to fetch provinces list')
      const provincesData = await provincesResponse.json()
      const province = provincesData.find((p: any) => p.name === provinceName)
      if (!province) throw new Error('Province not found')
      const citiesResponse = await fetch(`https://psgc.gitlab.io/api/provinces/${province.code}/cities-municipalities/`)
      if (!citiesResponse.ok) throw new Error(`HTTP error! status: ${citiesResponse.status}`)
      const citiesData = await citiesResponse.json()
      const cities = citiesData.map((city: any) => city.name).sort()
      setCitiesCache(prev => ({ ...prev, [provinceName]: cities }))
      return cities
    } catch (error) {
      const fallbackCities: {[key: string]: string[]} = {
        "Metro Manila": ["Caloocan City", "Las Piñas City", "Makati City", "Malabon City", "Mandaluyong City", "Manila City", "Marikina City", "Muntinlupa City", "Navotas City", "Parañaque City", "Pasay City", "Pasig City", "Pateros", "Quezon City", "San Juan City", "Taguig City", "Valenzuela City"],
        "Cavite": ["Alfonso", "Amadeo", "Bacoor City", "Carmona", "Cavite City", "Dasmariñas City", "General Trias City", "Imus City", "Kawit", "Naic", "Rosario", "Silang", "Tagaytay City", "Tanza", "Trece Martires City"],
        "Laguna": ["Alaminos", "Bay", "Biñan City", "Cabuyao City", "Calamba City", "Calauan", "Los Baños", "Nagcarlan", "San Pablo City", "San Pedro City", "Santa Cruz", "Santa Rosa City", "Victoria"],
        "Bulacan": ["Angat", "Balagtas", "Baliuag", "Bocaue", "Bulacan", "Guiguinto", "Hagonoy", "Malolos City", "Marilao", "Meycauayan City", "Norzagaray", "Plaridel", "Pulilan", "San Jose del Monte City", "Santa Maria"],
        "Cebu": ["Bogo City", "Carcar City", "Cebu City", "Danao City", "Lapu-Lapu City", "Mandaue City", "Naga City", "Talisay City", "Toledo City"],
        "Pampanga": ["Angeles City", "Apalit", "Arayat", "Bacolor", "Floridablanca", "Guagua", "Lubao", "Mabalacat City", "Mexico", "Porac", "San Fernando City", "San Luis", "Santa Ana", "Santo Tomas"],
        "Rizal": ["Angono", "Antipolo City", "Baras", "Binangonan", "Cainta", "Cardona", "Morong", "Pililla", "Rodriguez", "San Mateo", "Tanay", "Taytay", "Teresa"],
        "Batangas": ["Batangas City", "Bauan", "Calaca", "Ibaan", "Laurel", "Lemery", "Lipa City", "Nasugbu", "Rosario", "San Juan", "San Luis", "Santo Tomas", "Tanauan City", "Taal"]
      }
      const cities = fallbackCities[provinceName] || [`${provinceName} City`, `Central ${provinceName}`, `North ${provinceName}`, `South ${provinceName}`, `East ${provinceName}`, `West ${provinceName}`]
      setCitiesCache(prev => ({ ...prev, [provinceName]: cities }))
      return cities
    }
  }

  const getBarangays = async (provinceName: string, cityName: string): Promise<string[]> => {
    if (!provinceName || !cityName) return []
    const cacheKey = `${provinceName}-${cityName}`
    if (barangaysCache[cacheKey]) return barangaysCache[cacheKey]
    try {
      const citiesResponse = await fetch('https://psgc.gitlab.io/api/cities-municipalities/')
      if (!citiesResponse.ok) throw new Error('Failed to fetch cities list')
      const citiesData = await citiesResponse.json()
      const city = citiesData.find((c: any) => c.name === cityName)
      if (!city) throw new Error('City not found')
      const barangaysResponse = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${city.code}/barangays/`)
      if (!barangaysResponse.ok) throw new Error(`HTTP error! status: ${barangaysResponse.status}`)
      const barangaysData = await barangaysResponse.json()
      const barangays = barangaysData.map((brgy: any) => brgy.name).sort()
      setBarangaysCache(prev => ({ ...prev, [cacheKey]: barangays }))
      return barangays
    } catch (error) {
      const commonBarangays = ["Poblacion", "Bagong Silang", "San Roque", "San Isidro", "San Jose", "Santo Niño", "San Antonio", "San Vicente", "Santa Cruz", "Santa Maria", "Santo Cristo", "San Miguel", "San Juan", "San Pedro", "San Nicolas", "Santa Ana", "Santa Lucia", "Santo Domingo", "San Rafael", "San Fernando"]
      setBarangaysCache(prev => ({ ...prev, [cacheKey]: commonBarangays }))
      return commonBarangays
    }
  }

  return { provinces, getCities, getBarangays, apiAvailable, loadingProvinces }
}

const sexOptions = ["Male", "Female", "Other", "Prefer not to say"]
const roleOptions = [
  { value: "kutsero", label: "Kutsero", description: "Driver of horse-drawn vehicle", icon: "🐴" },
  { value: "horse_operator", label: "Horse Operator", description: "Owner/operator of horse business", icon: "🏇" },
]
const membershipOptions = [
  { value: "yes", label: "Yes, I am a member" },
  { value: "no", label: "No, but I want to apply" },
  { value: "no_interest", label: "No, not interested" },
]

interface DropdownFieldProps { label: string; value: string; placeholder: string; options: string[]; onSelect: (value: string) => void; disabled?: boolean; error?: string; loading?: boolean }
interface ProfilePicture { uri: string; type?: string; name?: string }
interface DocumentFile { uri: string; name: string; type: string; size: number; base64?: string | null }

const API_CONFIG = { BASE_URL: "https://echo-ebl8.onrender.com/api/signup_mobile/", TIMEOUT: 60000, RETRY_ATTEMPTS: 2, RETRY_DELAY: 3000 }

interface FormData {
  firstName: string; lastName: string; middleName: string; email: string; password: string; confirmPassword: string;
  phoneNumber: string; birthDate: string; dateOfBirth: Date; profilePicture: ProfilePicture | null; sex: string;
  role: string; province: string; city: string; municipality: string; barangay: string; zipCode: string;
  termsAccepted: boolean; isMember: string; membershipDocument: DocumentFile | null; yearsExperience: string;
  applyingForMembership: boolean; membershipStatus: string; membershipNotes: string;
}

const calculatePasswordStrength = (password: string): { strength: string; score: number; color: string } => {
  let score = 0
  if (password.length === 0) return { strength: "", score: 0, color: "#E0E0E0" }
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  if (score <= 2) return { strength: "Weak", score, color: "#FF4444" }
  else if (score <= 4) return { strength: "Medium", score, color: "#FFA500" }
  else return { strength: "Strong", score, color: "#4CAF50" }
}

const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const isValidPhoneNumber = (phone: string): boolean => /^(\+639|09)\d{9}$/.test(phone.replace(/\s/g, ""))
const getInitials = (firstName: string, lastName: string): string => `${firstName.trim().charAt(0).toUpperCase()}${lastName.trim().charAt(0).toUpperCase()}`
const getAvatarColor = (firstName: string, lastName: string): string => {
  const colors = ["#D97706", "#DC2626", "#059669", "#2563EB", "#7C3AED", "#DB2777", "#0891B2", "#EA580C"]
  const nameString = `${firstName}${lastName}`.toLowerCase()
  let hash = 0
  for (let i = 0; i < nameString.length; i++) hash = nameString.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function Signup() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [dropdownVisible, setDropdownVisible] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [membershipDocument, setMembershipDocument] = useState<DocumentFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" as 'success' | 'error' | 'info', fieldName: "" })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [passwordStrength, setPasswordStrength] = useState({ strength: "", score: 0, color: "#E0E0E0" })

  const { provinces, getCities, getBarangays, loadingProvinces } = usePhilippinesLocations()
  const [cities, setCities] = useState<string[]>([])
  const [barangays, setBarangays] = useState<string[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingBarangays, setLoadingBarangays] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', fieldName: string = "") => {
    setToast({ visible: true, message, type, fieldName })
  }

  const hideToast = () => setToast(prev => ({ ...prev, visible: false }))

  const [formData, setFormData] = useState<FormData>({
    firstName: "", lastName: "", middleName: "", email: "", password: "", confirmPassword: "", phoneNumber: "",
    birthDate: "", dateOfBirth: new Date(), profilePicture: null, sex: "", role: "", province: "", city: "",
    municipality: "", barangay: "", zipCode: "", termsAccepted: false, isMember: "", membershipDocument: null,
    yearsExperience: "", applyingForMembership: false, membershipStatus: "pending", membershipNotes: "",
  })

  useEffect(() => {
    const loadCities = async () => {
      if (formData.province) {
        setLoadingCities(true)
        const citiesData = await getCities(formData.province)
        setCities(citiesData)
        setLoadingCities(false)
        updateFormData("city", "")
        updateFormData("barangay", "")
      } else { setCities([]); setBarangays([]) }
    }
    loadCities()
  }, [formData.province])

  useEffect(() => {
    const loadBarangays = async () => {
      if (formData.province && formData.city) {
        setLoadingBarangays(true)
        const barangaysData = await getBarangays(formData.province, formData.city)
        setBarangays(barangaysData)
        setLoadingBarangays(false)
        updateFormData("barangay", "")
      } else setBarangays([])
    }
    loadBarangays()
  }, [formData.province, formData.city])

  useEffect(() => {
    if (formData.isMember === "no") updateFormData("applyingForMembership", true)
    else updateFormData("applyingForMembership", false)
  }, [formData.isMember])

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === "province") { updated.city = ""; updated.barangay = "" }
      else if (field === "city") updated.barangay = ""
      return updated
    })
    if (errors[field]) setErrors((prev) => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors })
    if (field === "password") setPasswordStrength(calculatePasswordStrength(value))
  }

  const calculateAge = (birthDate: Date): number => {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--
    return age
  }

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {}
    switch (step) {
      case 1:
        if (!formData.role) { newErrors.role = "Please select your role"; showToast("Please select your role to continue", "error", "role") }
        break
      case 2:
        if (!formData.firstName.trim()) { newErrors.firstName = "First name is required"; showToast("First name is required", "error", "firstName") }
        if (!formData.lastName.trim()) { newErrors.lastName = "Last name is required"; showToast("Last name is required", "error", "lastName") }
        if (!formData.sex) { newErrors.sex = "Please select your sex"; showToast("Please select your sex", "error", "sex") }
        if (!formData.phoneNumber.trim()) { newErrors.phoneNumber = "Phone number is required"; showToast("Phone number is required", "error", "phoneNumber") }
        else if (!isValidPhoneNumber(formData.phoneNumber)) { newErrors.phoneNumber = "Invalid phone number format (use 09xxxxxxxxx)"; showToast("Invalid phone number format. Use 09xxxxxxxxx", "error", "phoneNumber") }
        const age = calculateAge(formData.dateOfBirth)
        if (age < 18) { newErrors.dateOfBirth = "You must be at least 18 years old"; showToast("You must be at least 18 years old to register", "error", "dateOfBirth") }
        break
      case 3:
        if (!formData.province) { newErrors.province = "Province is required"; showToast("Please select your province", "error", "province") }
        if (!formData.city) { newErrors.city = "City/Municipality is required"; showToast("Please select your city or municipality", "error", "city") }
        if (!formData.barangay.trim()) { newErrors.barangay = "Barangay is required"; showToast("Please enter your barangay", "error", "barangay") }
        if (!formData.zipCode.trim()) { newErrors.zipCode = "Zip code is required"; showToast("Zip code is required", "error", "zipCode") }
        else if (!/^\d{4}$/.test(formData.zipCode)) { newErrors.zipCode = "Zip code must be 4 digits"; showToast("Zip code must be 4 digits", "error", "zipCode") }
        break
      case 4:
        if (!formData.isMember) { newErrors.isMember = "Please select your membership status"; showToast("Please select your membership status", "error", "isMember") }
        if (formData.isMember === "no" && !membershipDocument) { newErrors.membershipDocument = "Please upload a document for membership application"; showToast("Please upload a document for membership application", "error", "membershipDocument") }
        else if (formData.isMember === "yes" && !membershipDocument) { newErrors.membershipDocument = "Please upload your membership document for verification"; showToast("Please upload your membership document for verification", "error", "membershipDocument") }
        if (!formData.yearsExperience) { newErrors.yearsExperience = "Years of experience is required"; showToast("Years of experience is required", "error", "yearsExperience") }
        else if (!/^\d+$/.test(formData.yearsExperience)) { newErrors.yearsExperience = "Please enter a valid number"; showToast("Please enter a valid number", "error", "yearsExperience") }
        else if (parseInt(formData.yearsExperience) > 60) { newErrors.yearsExperience = "Please enter a realistic number of years"; showToast("Please enter a realistic number of years", "error", "yearsExperience") }
        break
      case 5:
        if (!formData.email.trim()) { newErrors.email = "Email is required"; showToast("Email is required", "error", "email") }
        else if (!isValidEmail(formData.email)) { newErrors.email = "Please enter a valid email address"; showToast("Please enter a valid email address", "error", "email") }
        if (!formData.password) { newErrors.password = "Password is required"; showToast("Password is required", "error", "password") }
        else if (formData.password.length < 8) { newErrors.password = "Password must be at least 8 characters"; showToast("Password must be at least 8 characters", "error", "password") }
        if (!formData.confirmPassword) { newErrors.confirmPassword = "Please confirm your password"; showToast("Please confirm your password", "error", "confirmPassword") }
        else if (formData.password !== formData.confirmPassword) { newErrors.confirmPassword = "Passwords do not match"; showToast("Passwords do not match", "error", "confirmPassword") }
        break
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => { if (validateStep(currentStep) && currentStep < 7) setCurrentStep(currentStep + 1) }
  const prevStep = () => { if (currentStep > 1) setCurrentStep(currentStep - 1) }
  const handleBackToLogin = () => router.back()
  const handleDateChange = (event: any, selectedDate?: Date) => { setShowDatePicker(Platform.OS === "ios"); if (selectedDate) updateFormData("dateOfBirth", selectedDate) }
  const formatDate = (date: Date) => date.toLocaleDateString("en-CA")

  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== "granted") { showToast("Camera permission is required to take photos.", "error"); return }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        setSelectedImage(asset.uri)
        updateFormData("profilePicture", { uri: asset.uri, type: "image/jpeg", name: "profile_camera.jpg" })
        showToast("Profile photo added successfully!", "success")
      }
    } catch (error) { showToast("Failed to open camera. Please try again.", "error") }
  }

  const openImageLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") { showToast("Photo library permission is required to select photos.", "error"); return }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        setSelectedImage(asset.uri)
        updateFormData("profilePicture", { uri: asset.uri, type: "image/jpeg", name: "profile_gallery.jpg" })
        showToast("Profile photo added successfully!", "success")
      }
    } catch (error) { showToast("Failed to open photo library. Please try again.", "error") }
  }

  const handleDocumentPicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8, base64: true })
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        let extension = 'jpg'
        if (asset.uri.toLowerCase().includes('.png')) extension = 'png'
        if (asset.uri.toLowerCase().includes('.jpeg')) extension = 'jpeg'
        if (asset.uri.toLowerCase().includes('.jpg')) extension = 'jpg'
        const documentData: DocumentFile = { uri: asset.uri, name: `membership_${Date.now()}.${extension}`, type: `image/${extension}`, size: asset.fileSize || 0, base64: asset.base64 }
        setMembershipDocument(documentData)
        updateFormData("membershipDocument", documentData)
        showToast("Document uploaded successfully!", "success")
      }
    } catch (error) { showToast("Failed to upload document. Please try again.", "error") }
  }

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' })
      let mimeType = 'image/jpeg'
      if (uri.toLowerCase().includes('.png')) mimeType = 'image/png'
      if (uri.toLowerCase().includes('.jpeg')) mimeType = 'image/jpeg'
      if (uri.toLowerCase().includes('.jpg')) mimeType = 'image/jpeg'
      return `data:${mimeType};base64,${base64}`
    } catch (error) { throw error }
  }

  const convertFileToBase64 = async (file: DocumentFile): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' })
      const mimeType = file.type || 'image/jpeg'
      return `data:${mimeType};base64,${base64}`
    } catch (error) { throw error }
  }

  const handleSignUp = async () => {
    if (isLoading) return
    if (!formData.termsAccepted) { showToast("Please accept the Terms and Conditions to continue", "error"); return }
    
    const validationErrors: { [key: string]: string } = {}
    if (!formData.firstName.trim()) validationErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) validationErrors.lastName = "Last name is required"
    if (!formData.email.trim()) validationErrors.email = "Email is required"
    else if (!isValidEmail(formData.email)) validationErrors.email = "Invalid email format"
    if (!formData.password) validationErrors.password = "Password is required"
    else if (formData.password.length < 8) validationErrors.password = "Password must be at least 8 characters"
    if (formData.password !== formData.confirmPassword) validationErrors.confirmPassword = "Passwords do not match"
    if (!formData.role) validationErrors.role = "Role is required"
    if (!formData.phoneNumber.trim()) validationErrors.phoneNumber = "Phone number is required"
    else if (!isValidPhoneNumber(formData.phoneNumber)) validationErrors.phoneNumber = "Invalid phone number format"
    if (!formData.isMember) validationErrors.isMember = "Membership status is required"
    if (!formData.yearsExperience) validationErrors.yearsExperience = "Years of experience is required"
    if (formData.isMember === "no" || formData.isMember === "yes") { if (!membershipDocument) validationErrors.membershipDocument = "Document upload is required" }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      const firstError = Object.values(validationErrors)[0]
      showToast(firstError, "error")
      return
    }
    
    setIsLoading(true)
    try {
      let profileImageBase64 = null
      if (formData.profilePicture && formData.profilePicture.uri) {
        try { profileImageBase64 = await convertImageToBase64(formData.profilePicture.uri) } 
        catch (error) { showToast("Failed to process profile picture. Please try again.", "error"); setIsLoading(false); return }
      }
      let membershipDocumentBase64 = null
      if (membershipDocument) {
        try { membershipDocumentBase64 = await convertFileToBase64(membershipDocument) } 
        catch (error) { showToast("Failed to process membership document. Please try again.", "error"); setIsLoading(false); return }
      }
      
      const bodyData = {
        firstName: formData.firstName, middleName: formData.middleName, lastName: formData.lastName,
        dob: formData.dateOfBirth.toISOString().split("T")[0], sex: formData.sex, phoneNumber: formData.phoneNumber,
        role: formData.role, province: formData.province, city: formData.city, municipality: formData.municipality,
        barangay: formData.barangay, zipCode: formData.zipCode, email: formData.email, password: formData.password,
        profilePicture: profileImageBase64, isMember: formData.isMember, membershipDocument: membershipDocumentBase64,
        membershipDocumentName: membershipDocument?.name || null, membershipDocumentType: membershipDocument?.type || null,
        yearsExperience: formData.yearsExperience, applyingForMembership: formData.isMember === "no",
        membershipStatus: formData.isMember === "yes" ? "pending_verification" : formData.isMember === "no" ? "applied" : "not_interested",
      }
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)
      const response = await fetch(API_CONFIG.BASE_URL, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(bodyData), credentials: "include", signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      if (response.ok) {
        showToast("Account created successfully! Please check your email for verification.", "success")
        setTimeout(() => router.replace("/auth/login"), 2000)
      } else {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.message && errorData.message.toLowerCase().includes("email")) {
            if (errorData.message.toLowerCase().includes("already") || errorData.message.toLowerCase().includes("exists")) {
              showToast("A user with that email already exists.", "error")
              setErrors({ email: "A user with that email already exists" })
              setCurrentStep(5)
              return
            }
          }
          showToast(errorData.message || "Failed to create account. Please try again.", "error")
        } catch {
          let errorMessage = "Failed to create account. Please try again."
          if (response.status === 409) errorMessage = "A user with that email already exists."
          else if (response.status === 400) errorMessage = "Invalid information provided. Please check your details."
          else if (response.status === 500) errorMessage = "Server error. Please try again later."
          showToast(errorMessage, "error")
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") showToast("The request took too long. Please check your connection and try again.", "error")
      else if (error.message.includes("Network")) showToast("Unable to connect to the server. Please check your internet connection.", "error")
      else showToast("Something went wrong. Please try again later.", "error")
    } finally { setIsLoading(false) }
  }

  const DropdownField = ({ label, value, placeholder, options, onSelect, disabled = false, error, loading = false }: DropdownFieldProps & { error?: string; loading?: boolean }) => {
    const dropdownKey = label.toLowerCase().replace(/\s+/g, "")
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity
          style={[styles.dropdownContainer, disabled && styles.disabledDropdown, error && styles.inputError]}
          onPress={() => !disabled && setDropdownVisible(dropdownKey)}
          disabled={disabled || loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="small" color="#666" /><Text style={styles.loadingText}>Loading...</Text></View>
          ) : (
            <>
              <Text style={[styles.dropdownText, !value && styles.placeholderText]}>{value || placeholder}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </>
          )}
        </TouchableOpacity>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Modal visible={dropdownVisible === dropdownKey} transparent animationType="fade" onRequestClose={() => setDropdownVisible(null)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(null)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select {label}</Text>
              <FlatList data={options} keyExtractor={(item) => item} renderItem={({ item }) => (
                <TouchableOpacity style={styles.optionItem} onPress={() => { onSelect(item); setDropdownVisible(null) }}>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              )} style={styles.optionsList} />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    )
  }

  const renderStep1 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Select Your Role</Text>
      <Text style={styles.stepSubtitle}>Choose what describes you best</Text>
      <View style={styles.roleSelectionContainer}>
        {roleOptions.map((role) => (
          <TouchableOpacity key={role.value} style={[styles.roleCard, formData.role === role.value && styles.roleCardSelected]} onPress={() => updateFormData("role", role.value)}>
            <View style={styles.roleIconContainer}><Text style={styles.roleIcon}>{role.icon}</Text></View>
            <View style={styles.roleContent}>
              <Text style={[styles.roleLabel, formData.role === role.value && styles.roleLabelSelected]}>{role.label}</Text>
              <Text style={[styles.roleDescription, formData.role === role.value && styles.roleDescriptionSelected]}>{role.description}</Text>
            </View>
            <View style={styles.roleRadio}>
              <View style={[styles.radioOuter, formData.role === role.value && styles.radioOuterSelected]}>
                {formData.role === role.value && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={nextStep}><Text style={styles.nextButtonText}>Next</Text></TouchableOpacity>
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleBackToLogin}><Text style={styles.signInLink}>Sign in</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>Please complete the information below</Text>
      <Text style={styles.sectionTitle}>Your Name</Text>
      <View style={styles.inputContainer}>
        <TextInput style={[styles.textInput, errors.firstName && styles.inputError]} value={formData.firstName} onChangeText={(value) => updateFormData("firstName", value)} placeholder="First Name" placeholderTextColor="#999" />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <TextInput style={styles.textInput} value={formData.middleName} onChangeText={(value) => updateFormData("middleName", value)} placeholder="Middle Name" placeholderTextColor="#999" />
      </View>
      <View style={styles.inputContainer}>
        <TextInput style={[styles.textInput, errors.lastName && styles.inputError]} value={formData.lastName} onChangeText={(value) => updateFormData("lastName", value)} placeholder="Last Name" placeholderTextColor="#999" />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Date of Birth</Text>
        <TouchableOpacity style={[styles.dateInputContainer, errors.dateOfBirth && styles.inputError]} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{formatDate(formData.dateOfBirth)}</Text>
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>
        {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
        {showDatePicker && <DateTimePicker value={formData.dateOfBirth} mode="date" display="default" onChange={handleDateChange} maximumDate={new Date()} />}
      </View>
      <DropdownField label="Sex" value={formData.sex} placeholder="Please Select" options={sexOptions} onSelect={(value) => updateFormData("sex", value)} error={errors.sex} />
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput style={[styles.textInput, errors.phoneNumber && styles.inputError]} value={formData.phoneNumber} onChangeText={(value) => updateFormData("phoneNumber", value)} placeholder="09XXXXXXXXX" placeholderTextColor="#999" keyboardType="phone-pad" />
        {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.prevButton} onPress={prevStep}><Text style={styles.prevButtonText}>Previous</Text></TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={nextStep}><Text style={styles.nextButtonText}>Next</Text></TouchableOpacity>
      </View>
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleBackToLogin}><Text style={styles.signInLink}>Sign in</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Address Information</Text>
      <Text style={styles.stepSubtitle}>Please provide your complete address</Text>
      <Text style={styles.sectionTitle}>ADDRESS IN THE PHILIPPINES</Text>
      <DropdownField label="Province" value={formData.province} placeholder="Select Province" options={provinces} onSelect={(value) => updateFormData("province", value)} error={errors.province} loading={loadingProvinces} />
      <DropdownField label="City/Municipality" value={formData.city} placeholder="Select City or Municipality" options={cities} onSelect={(value) => updateFormData("city", value)} disabled={!formData.province} error={errors.city} loading={loadingCities} />
      {barangays.length > 0 && <DropdownField label="Barangay" value={formData.barangay} placeholder="Select Barangay" options={barangays} onSelect={(value) => updateFormData("barangay", value)} disabled={!formData.city} error={errors.barangay} loading={loadingBarangays} />}
      {formData.city && barangays.length === 0 && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Barangay</Text>
          <TextInput style={[styles.textInput, errors.barangay && styles.inputError]} value={formData.barangay} onChangeText={(value) => updateFormData("barangay", value)} placeholder="Enter your barangay" placeholderTextColor="#999" />
          {errors.barangay && <Text style={styles.errorText}>{errors.barangay}</Text>}
        </View>
      )}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Zip Code</Text>
        <TextInput style={[styles.textInput, errors.zipCode && styles.inputError]} value={formData.zipCode} onChangeText={(value) => updateFormData("zipCode", value)} placeholder="Enter zip code (4 digits)" placeholderTextColor="#999" keyboardType="numeric" maxLength={4} />
        {errors.zipCode && <Text style={styles.errorText}>{errors.zipCode}</Text>}
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.prevButton} onPress={prevStep}><Text style={styles.prevButtonText}>Previous</Text></TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={nextStep}><Text style={styles.nextButtonText}>Next</Text></TouchableOpacity>
      </View>
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleBackToLogin}><Text style={styles.signInLink}>Sign in</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderStep4 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Membership & Experience</Text>
      <Text style={styles.stepSubtitle}>Tell us about your experience and membership status</Text>
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Membership Status</Text>
        <Text style={styles.sectionDescription}>Are you currently a member of any horse operators association or kutsero group?</Text>
        <View style={styles.membershipOptionsContainer}>
          {membershipOptions.map((option) => (
            <TouchableOpacity key={option.value} style={[styles.membershipOption, formData.isMember === option.value && styles.membershipOptionSelected, errors.isMember && styles.inputError]} onPress={() => updateFormData("isMember", option.value)}>
              <View style={styles.membershipRadio}>
                <View style={[styles.membershipRadioOuter, formData.isMember === option.value && styles.membershipRadioOuterSelected]}>
                  {formData.isMember === option.value && <View style={styles.membershipRadioInner} />}
                </View>
              </View>
              <Text style={[styles.membershipOptionText, formData.isMember === option.value && styles.membershipOptionTextSelected]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.isMember && <Text style={styles.errorText}>{errors.isMember}</Text>}
      </View>
      {(formData.isMember === "yes" || formData.isMember === "no") && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{formData.isMember === "yes" ? "Membership Verification" : "Membership Application"}</Text>
          <Text style={styles.sectionDescription}>{formData.isMember === "yes" ? "Please upload your membership ID or certificate for verification" : "Please upload any supporting document for your membership application"}</Text>
          <TouchableOpacity style={[styles.documentUploadButton, errors.membershipDocument && styles.inputError]} onPress={handleDocumentPicker}>
            <Text style={styles.documentUploadIcon}>📎</Text>
            <View style={styles.documentUploadTextContainer}>
              <Text style={styles.documentUploadTitle}>{membershipDocument ? "Document Uploaded" : "Upload Document"}</Text>
              <Text style={styles.documentUploadSubtitle}>{membershipDocument ? membershipDocument.name : "JPG, PNG (Max 10MB)"}</Text>
            </View>
            {membershipDocument && <View style={styles.documentCheckmark}><Text style={styles.checkmarkText}>✓</Text></View>}
          </TouchableOpacity>
          {membershipDocument && membershipDocument.uri && (
            <View style={styles.documentPreviewContainer}>
              <Image source={{ uri: membershipDocument.uri }} style={styles.documentPreview} resizeMode="contain" />
              <Text style={styles.documentPreviewText}>Preview of uploaded document</Text>
            </View>
          )}
          {membershipDocument && (
            <TouchableOpacity style={styles.removeDocumentButton} onPress={() => { setMembershipDocument(null); updateFormData("membershipDocument", null) }}>
              <Text style={styles.removeDocumentText}>🗑️ Remove Document</Text>
            </TouchableOpacity>
          )}
          {errors.membershipDocument && <Text style={styles.errorText}>{errors.membershipDocument}</Text>}
        </View>
      )}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Years of Experience</Text>
        <Text style={styles.sectionDescription}>How many years of experience do you have as a {formData.role === "kutsero" ? "kutsero" : "horse operator"}?</Text>
        <View style={styles.inputContainer}>
          <TextInput style={[styles.textInput, styles.experienceInput, errors.yearsExperience && styles.inputError]} value={formData.yearsExperience} onChangeText={(value) => updateFormData("yearsExperience", value)} placeholder="Enter number of years" placeholderTextColor="#999" keyboardType="numeric" />
          <Text style={styles.experienceLabel}>years</Text>
        </View>
        {errors.yearsExperience && <Text style={styles.errorText}>{errors.yearsExperience}</Text>}
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.prevButton} onPress={prevStep}><Text style={styles.prevButtonText}>Previous</Text></TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={nextStep}><Text style={styles.nextButtonText}>Next</Text></TouchableOpacity>
      </View>
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleBackToLogin}><Text style={styles.signInLink}>Sign in</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderStep5 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Login Credentials</Text>
      <Text style={styles.stepSubtitle}>Create your login information</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput style={[styles.textInput, errors.email && styles.inputError]} value={formData.email} onChangeText={(value) => updateFormData("email", value)} placeholder="Your Email Address" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={[styles.passwordInputContainer, errors.password && styles.inputError]}>
          <TextInput style={styles.passwordInput} value={formData.password} onChangeText={(value) => updateFormData("password", value)} placeholder="Create a password" placeholderTextColor="#999" secureTextEntry={!showPassword} editable={!isLoading} />
          <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={moderateScale(20)} color="#666" />
          </TouchableOpacity>
        </View>
        {formData.password.length > 0 && (
          <View style={styles.passwordStrengthContainer}>
            <View style={styles.passwordStrengthBar}><View style={[styles.passwordStrengthFill, { width: `${(passwordStrength.score / 6) * 100}%`, backgroundColor: passwordStrength.color }]} /></View>
            <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>{passwordStrength.strength}</Text>
          </View>
        )}
        <Text style={styles.helperText}>Must be at least 8 characters. Use uppercase, lowercase, numbers, and symbols for a stronger password.</Text>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={[styles.passwordInputContainer, errors.confirmPassword && styles.inputError]}>
          <TextInput style={styles.passwordInput} value={formData.confirmPassword} onChangeText={(value) => updateFormData("confirmPassword", value)} placeholder="Confirm your password" placeholderTextColor="#999" secureTextEntry={!showConfirmPassword} editable={!isLoading} />
          <TouchableOpacity style={styles.eyeIconContainer} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={moderateScale(20)} color="#666" />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.prevButton, isLoading && styles.disabledButton]} onPress={prevStep} disabled={isLoading}><Text style={styles.prevButtonText}>Previous</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.nextButton, isLoading && styles.disabledButton]} onPress={nextStep} disabled={isLoading}><Text style={styles.nextButtonText}>Next</Text></TouchableOpacity>
      </View>
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleBackToLogin}><Text style={styles.signInLink}>Sign in</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderStep6 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Set Your Profile Picture</Text>
      <Text style={styles.stepSubtitle}>Upload or capture a photo for your profile</Text>
      <View style={styles.profilePictureContainer}>
        <View style={styles.profilePicturePlaceholder}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.profileImage} />
          ) : formData.firstName && formData.lastName ? (
            <View style={[styles.initialsAvatar, { backgroundColor: getAvatarColor(formData.firstName, formData.lastName) }]}>
              <Text style={styles.initialsText}>{getInitials(formData.firstName, formData.lastName)}</Text>
            </View>
          ) : (
            <View style={styles.profileIcon}><View style={styles.profileHead} /><View style={styles.profileBody} /></View>
          )}
        </View>
      </View>
      <View style={styles.photoButtonsContainer}>
        <TouchableOpacity style={styles.photoButton} onPress={openCamera} disabled={isLoading}>
          <Ionicons name="camera" size={moderateScale(20)} color="#FFF" />
          <Text style={styles.photoButtonText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={openImageLibrary} disabled={isLoading}>
          <Ionicons name="images" size={moderateScale(20)} color="#FFF" />
          <Text style={styles.photoButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>
      {selectedImage && (
        <TouchableOpacity style={styles.removePhotoButton} onPress={() => { setSelectedImage(null); updateFormData("profilePicture", null) }} disabled={isLoading}>
          <Ionicons name="trash" size={moderateScale(18)} color="#FFF" />
          <Text style={styles.removePhotoButtonText}>Remove Photo</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.optionalText}>Profile photo is optional. You can skip this step and add it later.</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.prevButton, isLoading && styles.disabledButton]} onPress={prevStep} disabled={isLoading}><Text style={styles.prevButtonText}>Previous</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.nextButton, isLoading && styles.disabledButton]} onPress={nextStep} disabled={isLoading}><Text style={styles.nextButtonText}>Next</Text></TouchableOpacity>
      </View>
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleBackToLogin}><Text style={styles.signInLink}>Sign in</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderStep7 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Terms & Conditions</Text>
      <Text style={styles.stepSubtitle}>Please read and accept our terms to continue</Text>
      <View style={styles.termsScrollView}>
        <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.termsContent}>
          <Text style={styles.termsMainTitle}>ECHO Mobile Application Terms and Conditions</Text>
          <Text style={styles.termsSectionTitle}>1. Introduction</Text>
          <Text style={styles.termsText}>Welcome to the ECHO Mobile Application (Equine Care and Health Optimization).</Text>
          <Text style={styles.termsText}>By registering and using this app, you agree to comply with and be bound by these Terms and Conditions.</Text>
          <Text style={styles.termsText}>The ECHO App is developed to support the Tartanilla Horse Health Management Program under the Department of Veterinary Medicine and Fisheries (DVMF) and the Cebu Technological University (CTU).</Text>
          <Text style={styles.termsSectionTitle}>2. User Responsibilities</Text>
          <Text style={styles.termsText}>a. Horse Operator (Owner)</Text>
          <Text style={styles.termsText}>• You must provide complete and accurate information regarding your identity and your horse's details during registration.</Text>
          <Text style={styles.termsText}>• You are responsible for ensuring your horse receives regular veterinary checkups.</Text>
          <Text style={styles.termsText}>• You shall coordinate with assigned veterinarians for health updates, appointments, and record submissions.</Text>
          <Text style={styles.termsSectionTitle}>3. Data Privacy and Protection</Text>
          <Text style={styles.termsText}>• The ECHO App collects personal and animal health information necessary for communication and monitoring within the Tartanilla Program.</Text>
          <Text style={styles.termsText}>• All collected data will be handled responsibly and in accordance with the principles of the Data Privacy Act of 2012 (Republic Act No. 10173).</Text>
          <Text style={styles.termsSectionTitle}>4. Account and Security</Text>
          <Text style={styles.termsText}>• You are solely responsible for maintaining the confidentiality of your login credentials.</Text>
          <Text style={styles.termsText}>• Any actions performed under your account will be considered your responsibility.</Text>
          <Text style={styles.termsSectionTitle}>5. Acceptable Use</Text>
          <Text style={styles.termsText}>• You agree to use the ECHO App only for legitimate and lawful purposes connected to the Tartanilla Program.</Text>
          <Text style={styles.termsSectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.termsText}>• The ECHO App serves as a digital tool to assist in horse health tracking and communication; it does not replace physical veterinary consultations.</Text>
          <Text style={styles.termsSectionTitle}>7. Modifications to the Terms</Text>
          <Text style={styles.termsText}>• The ECHO Team may modify or update these Terms and Conditions at any time.</Text>
          <Text style={styles.termsSectionTitle}>8. Contact and Support</Text>
          <Text style={styles.termsText}>For any questions, assistance, or technical concerns, please contact: echosys.ph@gmail.com</Text>
          <Text style={styles.termsText}>✅ By selecting "I Agree" and proceeding with registration, you confirm that you have read, understood, and accepted these Terms and Conditions.</Text>
        </ScrollView>
      </View>
      <TouchableOpacity style={styles.checkboxContainer} onPress={() => updateFormData("termsAccepted", !formData.termsAccepted)}>
        <View style={[styles.checkbox, formData.termsAccepted && styles.checkboxChecked]}>{formData.termsAccepted && <Text style={styles.checkmark}>✓</Text>}</View>
        <Text style={styles.checkboxLabel}>I have read and agree to the Terms & Conditions</Text>
      </TouchableOpacity>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.prevButton, isLoading && styles.disabledButton]} onPress={prevStep} disabled={isLoading}><Text style={styles.prevButtonText}>Previous</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.signUpButton, (isLoading || !formData.termsAccepted) && styles.disabledButton]} onPress={handleSignUp} disabled={isLoading || !formData.termsAccepted}>
          <Text style={styles.signUpButtonText}>{isLoading ? "Creating Account..." : "Sign Up"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.signInLinkContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleBackToLogin}><Text style={styles.signInLink}>Sign in</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      case 6: return renderStep6()
      case 7: return renderStep7()
      default: return renderStep1()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B8763E" />
      <ToastMessage message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
            <Ionicons name="arrow-back" size={moderateScale(24)} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign Up</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <View key={step} style={styles.progressStep}>
              <View style={[styles.progressCircle, currentStep >= step && styles.progressCircleActive]}>
                <Text style={[styles.progressText, currentStep >= step && styles.progressTextActive]}>{step}</Text>
              </View>
              {step < 7 && <View style={[styles.progressLine, currentStep > step && styles.progressLineActive]} />}
            </View>
          ))}
        </View>
      </View>
      <View style={styles.contentSection}>{renderCurrentStep()}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#B8763E" },
  headerSection: { backgroundColor: "#B8763E", paddingTop: verticalScale(Platform.OS === 'ios' ? 10 : 20), paddingBottom: verticalScale(20), paddingHorizontal: moderateScale(20) },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: verticalScale(20) },
  backButton: { width: moderateScale(44), height: moderateScale(44), borderRadius: moderateScale(22), backgroundColor: "rgba(255, 255, 255, 0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: moderateScale(20), fontWeight: "bold" },
  placeholder: { width: moderateScale(44) },
  progressContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  progressStep: { flexDirection: "row", alignItems: "center" },
  progressCircle: { width: moderateScale(28), height: moderateScale(28), borderRadius: moderateScale(14), backgroundColor: "rgba(255, 255, 255, 0.3)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255, 255, 255, 0.5)" },
  progressCircleActive: { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  progressText: { color: "rgba(255, 255, 255, 0.8)", fontSize: moderateScale(12), fontWeight: "bold" },
  progressTextActive: { color: "#B8763E" },
  progressLine: { width: moderateScale(25), height: 2, backgroundColor: "rgba(255, 255, 255, 0.3)" },
  progressLineActive: { backgroundColor: "#FFFFFF" },
  contentSection: { flex: 1, backgroundColor: "#FFFFFF", borderTopLeftRadius: moderateScale(25), borderTopRightRadius: moderateScale(25), paddingTop: verticalScale(20) },
  stepContainer: { flex: 1, paddingHorizontal: moderateScale(20) },
  scrollContent: { paddingBottom: verticalScale(40) },
  stepTitle: { fontSize: moderateScale(24), fontWeight: "bold", color: "#333333", textAlign: "center", marginBottom: moderateScale(8) },
  stepSubtitle: { fontSize: moderateScale(14), color: "#666666", textAlign: "center", marginBottom: moderateScale(30) },
  sectionContainer: { marginBottom: moderateScale(25) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: "600", color: "#333333", marginBottom: moderateScale(8) },
  sectionDescription: { fontSize: moderateScale(14), color: "#666666", lineHeight: verticalScale(20), marginBottom: moderateScale(15) },
  roleSelectionContainer: { marginBottom: moderateScale(30) },
  roleCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#E0E0E0", borderRadius: moderateScale(12), padding: moderateScale(16), marginBottom: moderateScale(15), elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84 },
  roleCardSelected: { borderColor: "#B8763E", backgroundColor: "#FFF8F5" },
  roleIconContainer: { marginRight: moderateScale(15) },
  roleIcon: { fontSize: moderateScale(32) },
  roleContent: { flex: 1 },
  roleLabel: { fontSize: moderateScale(18), fontWeight: "bold", color: "#333333", marginBottom: moderateScale(4) },
  roleLabelSelected: { color: "#B8763E" },
  roleDescription: { fontSize: moderateScale(14), color: "#666666", lineHeight: verticalScale(20) },
  roleDescriptionSelected: { color: "#8B5A2B" },
  roleRadio: { marginLeft: moderateScale(10) },
  radioOuter: { width: moderateScale(22), height: moderateScale(22), borderRadius: moderateScale(11), borderWidth: 2, borderColor: "#E0E0E0", justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  radioOuterSelected: { borderColor: "#B8763E" },
  radioInner: { width: moderateScale(12), height: moderateScale(12), borderRadius: moderateScale(6), backgroundColor: "#B8763E" },
  membershipOptionsContainer: { marginBottom: moderateScale(10) },
  membershipOption: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9F9F9", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: moderateScale(8), padding: moderateScale(15), marginBottom: moderateScale(10) },
  membershipOptionSelected: { backgroundColor: "#FFF8F5", borderColor: "#B8763E" },
  membershipRadio: { marginRight: moderateScale(12) },
  membershipRadioOuter: { width: moderateScale(22), height: moderateScale(22), borderRadius: moderateScale(11), borderWidth: 2, borderColor: "#CCCCCC", justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  membershipRadioOuterSelected: { borderColor: "#B8763E" },
  membershipRadioInner: { width: moderateScale(12), height: moderateScale(12), borderRadius: moderateScale(6), backgroundColor: "#B8763E" },
  membershipOptionText: { fontSize: moderateScale(16), color: "#333333", flex: 1 },
  membershipOptionTextSelected: { color: "#B8763E", fontWeight: "500" },
  documentUploadButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9F9F9", borderWidth: 2, borderColor: "#E0E0E0", borderRadius: moderateScale(8), padding: moderateScale(15), borderStyle: "dashed" },
  documentUploadIcon: { fontSize: moderateScale(24), marginRight: moderateScale(12) },
  documentUploadTextContainer: { flex: 1 },
  documentUploadTitle: { fontSize: moderateScale(16), fontWeight: "500", color: "#333333", marginBottom: moderateScale(4) },
  documentUploadSubtitle: { fontSize: moderateScale(12), color: "#666666" },
  documentCheckmark: { width: moderateScale(24), height: moderateScale(24), borderRadius: moderateScale(12), backgroundColor: "#4CAF50", justifyContent: "center", alignItems: "center" },
  checkmarkText: { color: "#FFFFFF", fontSize: moderateScale(14), fontWeight: "bold" },
  documentPreviewContainer: { marginTop: moderateScale(10), alignItems: 'center' },
  documentPreview: { width: '100%', height: moderateScale(200), borderRadius: moderateScale(8), borderWidth: 1, borderColor: '#E0E0E0' },
  documentPreviewText: { fontSize: moderateScale(12), color: '#666', marginTop: moderateScale(5) },
  removeDocumentButton: { marginTop: moderateScale(10), padding: moderateScale(10), alignItems: "center" },
  removeDocumentText: { color: "#FF4444", fontSize: moderateScale(14) },
  experienceInput: { paddingRight: moderateScale(70) },
  experienceLabel: { position: "absolute", right: moderateScale(15), top: moderateScale(12), fontSize: moderateScale(16), color: "#666666" },
  inputContainer: { marginBottom: moderateScale(15), position: 'relative' },
  inputLabel: { fontSize: moderateScale(14), fontWeight: "500", color: "#333333", marginBottom: moderateScale(5) },
  textInput: { borderWidth: 1, borderColor: "#E0E0E0", borderRadius: moderateScale(8), paddingHorizontal: moderateScale(15), paddingVertical: moderateScale(12), fontSize: moderateScale(16), backgroundColor: "#FFFFFF", color: "#333333" },
  helperText: { fontSize: moderateScale(12), color: "#666666", marginTop: moderateScale(5) },
  dateInputContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: moderateScale(8), paddingHorizontal: moderateScale(15), paddingVertical: moderateScale(12), backgroundColor: "#FFFFFF" },
  dateText: { fontSize: moderateScale(16), color: "#333333" },
  calendarIcon: { fontSize: moderateScale(18) },
  dropdownContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: moderateScale(8), paddingHorizontal: moderateScale(15), paddingVertical: moderateScale(12), backgroundColor: "#FFFFFF" },
  disabledDropdown: { backgroundColor: "#F5F5F5", opacity: 0.6 },
  dropdownText: { fontSize: moderateScale(16), color: "#333333" },
  placeholderText: { color: "#999999" },
  dropdownArrow: { fontSize: moderateScale(12), color: "#666666" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: moderateScale(10), padding: moderateScale(20), width: width * 0.85, maxHeight: height * 0.6 },
  modalTitle: { fontSize: moderateScale(18), fontWeight: "bold", color: "#333333", textAlign: "center", marginBottom: moderateScale(15) },
  optionsList: { maxHeight: height * 0.4 },
  optionItem: { paddingVertical: moderateScale(12), paddingHorizontal: moderateScale(10), borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  optionText: { fontSize: moderateScale(16), color: "#333333" },
  passwordInputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#E0E0E0", borderRadius: moderateScale(8), backgroundColor: "#FFFFFF" },
  passwordInput: { flex: 1, paddingHorizontal: moderateScale(15), paddingVertical: moderateScale(12), fontSize: moderateScale(16), color: "#333333" },
  eyeIconContainer: { paddingHorizontal: moderateScale(15), paddingVertical: moderateScale(12) },
  profilePictureContainer: { alignItems: "center", marginVertical: verticalScale(30) },
  profilePicturePlaceholder: { width: moderateScale(120), height: moderateScale(120), borderRadius: moderateScale(60), backgroundColor: "#E5E7EB", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  profileImage: { width: "100%", height: "100%" },
  initialsAvatar: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  initialsText: { fontSize: moderateScale(48), fontWeight: "bold", color: "#FFFFFF" },
  profileIcon: { alignItems: "center" },
  profileHead: { width: moderateScale(30), height: moderateScale(30), borderRadius: moderateScale(15), backgroundColor: "#CCCCCC", marginBottom: moderateScale(5) },
  profileBody: { width: moderateScale(45), height: moderateScale(30), borderRadius: moderateScale(15), backgroundColor: "#CCCCCC" },
  photoButtonsContainer: { flexDirection: "row", justifyContent: "center", gap: moderateScale(15), marginHorizontal: moderateScale(20), marginBottom: moderateScale(10) },
  photoButton: { backgroundColor: "#B8763E", paddingVertical: moderateScale(12), paddingHorizontal: moderateScale(20), borderRadius: moderateScale(8), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: moderateScale(8), flex: 1 },
  photoButtonText: { color: "#FFFFFF", fontSize: moderateScale(14), fontWeight: "600" },
  removePhotoButton: { backgroundColor: "#FF4444", paddingVertical: moderateScale(10), paddingHorizontal: moderateScale(20), borderRadius: moderateScale(8), alignItems: "center", flexDirection: "row", justifyContent: "center", gap: moderateScale(8), marginHorizontal: moderateScale(20), marginBottom: moderateScale(15) },
  removePhotoButtonText: { color: "#FFFFFF", fontSize: moderateScale(14), fontWeight: "500" },
  optionalText: { fontSize: moderateScale(12), color: "#999999", textAlign: "center", marginHorizontal: moderateScale(20), marginBottom: verticalScale(20), lineHeight: verticalScale(18) },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", gap: moderateScale(15), marginTop: verticalScale(30), marginBottom: verticalScale(20) },
  prevButton: { backgroundColor: "#F0F0F0", paddingVertical: moderateScale(12), borderRadius: moderateScale(8), flex: 1, alignItems: "center" },
  prevButtonText: { color: "#666666", fontSize: moderateScale(16), fontWeight: "600" },
  nextButton: { backgroundColor: "#B8763E", paddingVertical: moderateScale(12), borderRadius: moderateScale(8), flex: 1, alignItems: "center" },
  nextButtonText: { color: "#FFFFFF", fontSize: moderateScale(16), fontWeight: "600" },
  signUpButton: { backgroundColor: "#B8763E", paddingVertical: moderateScale(12), borderRadius: moderateScale(8), flex: 1, alignItems: "center" },
  signUpButtonText: { color: "#FFFFFF", fontSize: moderateScale(16), fontWeight: "600" },
  disabledButton: { opacity: 0.6 },
  signInLinkContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: verticalScale(20), marginBottom: verticalScale(30), flexWrap: "wrap" },
  signInText: { fontSize: moderateScale(14), color: "#666666" },
  signInLink: { fontSize: moderateScale(14), color: "#B8763E", fontWeight: "600", textDecorationLine: "underline" },
  termsScrollView: { flex: 1, backgroundColor: "#F9F9F9", borderRadius: moderateScale(10), marginBottom: moderateScale(15), maxHeight: height * 0.45 },
  termsContent: { padding: moderateScale(20) },
  termsMainTitle: { fontSize: moderateScale(20), fontWeight: "bold", color: "#B8763E", marginBottom: moderateScale(10), textAlign: "center" },
  termsSectionTitle: { fontSize: moderateScale(16), fontWeight: "bold", color: "#333333", marginTop: moderateScale(15), marginBottom: moderateScale(8) },
  termsText: { fontSize: moderateScale(13), color: "#555555", lineHeight: verticalScale(20), marginBottom: moderateScale(6), textAlign: "justify" },
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginVertical: moderateScale(15), paddingHorizontal: moderateScale(5) },
  checkbox: { width: moderateScale(24), height: moderateScale(24), borderWidth: 2, borderColor: "#B8763E", borderRadius: moderateScale(4), marginRight: moderateScale(12), justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" },
  checkboxChecked: { backgroundColor: "#B8763E" },
  checkmark: { color: "#FFFFFF", fontSize: moderateScale(16), fontWeight: "bold" },
  checkboxLabel: { flex: 1, fontSize: moderateScale(14), color: "#333333", lineHeight: verticalScale(20) },
  inputError: { borderColor: "#FF4444", borderWidth: 2 },
  errorText: { color: "#FF4444", fontSize: moderateScale(12), marginTop: moderateScale(4), marginLeft: moderateScale(2) },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: moderateScale(12), color: '#666', marginLeft: moderateScale(8) },
  passwordStrengthContainer: { marginTop: moderateScale(8), marginBottom: moderateScale(4) },
  passwordStrengthBar: { height: moderateScale(6), backgroundColor: "#E0E0E0", borderRadius: moderateScale(3), overflow: "hidden", marginBottom: moderateScale(6) },
  passwordStrengthFill: { height: "100%", borderRadius: moderateScale(3) },
  passwordStrengthText: { fontSize: moderateScale(12), fontWeight: "600", textAlign: "right" },
  toastContainer: { position: 'absolute', bottom: verticalScale(20), left: moderateScale(20), right: moderateScale(20), padding: moderateScale(12), borderRadius: moderateScale(8), zIndex: 1000, elevation: 1000, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  toastText: { color: "#FFFFFF", fontSize: moderateScale(14), textAlign: "center", fontWeight: "500" },
})