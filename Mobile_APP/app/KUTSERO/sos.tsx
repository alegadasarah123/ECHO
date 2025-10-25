import { useRouter } from 'expo-router'
import { useState, useEffect } from "react"
import {
    Alert,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image
} from "react-native"
import * as Location from "expo-location"
import * as ImagePicker from "expo-image-picker"
import * as SecureStore from "expo-secure-store"

const { width, height } = Dimensions.get("window")

// Enhanced responsive scaling functions
const scale = (size: number) => {
    const scaleFactor = width / 375
    const scaledSize = size * scaleFactor
    return Math.max(Math.min(scaledSize, size * 1.2), size * 0.8)
}

const verticalScale = (size: number) => {
    const scaleFactor = height / 812
    const scaledSize = size * scaleFactor
    return Math.max(Math.min(scaledSize, size * 1.15), size * 0.85)
}

const moderateScale = (size: number, factor = 0.5) => {
    const scaledSize = size + (scale(size) - size) * factor
    return Math.max(Math.min(scaledSize, size * 1.1), size * 0.9)
}

const getSafeAreaPadding = () => {
    const statusBarHeight = StatusBar.currentHeight || 0
    return {
        top: Math.max(statusBarHeight, 20),
        bottom: height > 800 ? 34 : 20,
    }
}

interface SOSEmergencyProps {
    onBack: () => void
    kutseroId?: string
}

interface SOSImage {
    uri: string
    type?: string
    name?: string
}

export default function SOSEmergencyScreen({ onBack, kutseroId: propKutseroId }: SOSEmergencyProps) {
    const router = useRouter()
    const [contactNumber, setContactNumber] = useState("")
    const [userName, setUserName] = useState("")
    const [kutseroId, setKutseroId] = useState<string | null>(propKutseroId || null)
    const [kutseroProfileId, setKutseroProfileId] = useState("")
    const [additionalInfo, setAdditionalInfo] = useState("")
    const [emergencyType, setEmergencyType] = useState("Injury/Trauma")
    const [horseStatus, setHorseStatus] = useState<string[]>([])
    const [description, setDescription] = useState("")
    const [currentLocation, setCurrentLocation] = useState("Tap to get current location")
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [showEmergencyTypeModal, setShowEmergencyTypeModal] = useState(false)
    const [sosImages, setSOSImages] = useState<SOSImage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingProfile, setIsLoadingProfile] = useState(false)
    const safeArea = getSafeAreaPadding()

    const emergencyTypes = [
        "Injury/Trauma",
        "Colic",
        "Lameness",
        "Respiratory Distress",
        "Eye Injury",
        "Wound/Bleeding",
        "Neurological Issue",
        "Poisoning/Toxicity",
        "Foaling Emergency",
        "Behavioral/Aggressive",
        "Heatstroke/Exhaustion",
        "Other Horse Emergency"
    ]

    const horseStatusOptions: string[] = [
        "Conscious",
        "Unconscious",
        "Injured",
        "Bleeding",
        "Limping",
        "Showing Colic Signs"
    ]

    // Load kutseroId from SecureStore if not provided as prop
    useEffect(() => {
        const loadKutseroId = async () => {
            if (propKutseroId) {
                console.log("[DEBUG] Using kutseroId from props:", propKutseroId)
                setKutseroId(propKutseroId)
                return
            }

            try {
                console.log("[DEBUG] Attempting to load user data from SecureStore...")
                
                // Get the stored user data from SecureStore
                const storedUserData = await SecureStore.getItemAsync("user_data")
                
                if (!storedUserData) {
                    console.log("[DEBUG] ❌ No user data found in SecureStore")
                    Alert.alert("Error", "User data not found. Please login again.")
                    return
                }

                const parsedUserData = JSON.parse(storedUserData)
                console.log("[DEBUG] Parsed user data:", parsedUserData)
                
                // Try to get kutsero_id from multiple sources
                let extractedKutseroId: string | null = null
                
                if (parsedUserData.profile?.kutsero_id) {
                    extractedKutseroId = parsedUserData.profile.kutsero_id
                    console.log("[DEBUG] ✅ Found kutsero_id in profile:", extractedKutseroId)
                } else if (parsedUserData.kutsero_id) {
                    extractedKutseroId = parsedUserData.kutsero_id
                    console.log("[DEBUG] ✅ Found kutsero_id at root level:", extractedKutseroId)
                } else if (parsedUserData.id) {
                    extractedKutseroId = parsedUserData.id
                    console.log("[DEBUG] ✅ Found id at root level:", extractedKutseroId)
                }
                
                if (extractedKutseroId) {
                    setKutseroId(extractedKutseroId)
                    console.log("[DEBUG] ✅ Successfully loaded kutseroId:", extractedKutseroId)
                } else {
                    console.log("[DEBUG] ❌ No kutsero_id found in user data")
                    console.log("[DEBUG] User data structure:", JSON.stringify(parsedUserData, null, 2))
                    Alert.alert("Error", "User ID not found. Please login again.")
                }
            } catch (error) {
                console.error("[ERROR] Failed to load user data from SecureStore:", error)
                Alert.alert("Error", "Failed to load user information")
            }
        }

        loadKutseroId()
    }, [propKutseroId])

    // Fetch kutsero profile to display contact number
    useEffect(() => {
        const fetchKutseroProfile = async () => {
            if (!kutseroId) {
                console.log("[DEBUG] Skipping profile fetch - No kutseroId available yet")
                return
            }

            console.log("[DEBUG] Fetching profile for kutseroId:", kutseroId)
            setIsLoadingProfile(true)
            
            // Set kutseroProfileId immediately as a fallback
            setKutseroProfileId(kutseroId)
            console.log("[DEBUG] ⚠️ Pre-set kutseroProfileId to:", kutseroId)
            
            try {
                const url = `http://192.168.1.9:8000/api/kutsero/profile/${kutseroId}/`
                console.log("[DEBUG] Fetching from URL:", url)
                
                // Create a timeout promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout')), 10000)
                })
                
                // Race between fetch and timeout
                const fetchPromise = fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
                
                const response = await Promise.race([fetchPromise, timeoutPromise]) as Response

                console.log("[DEBUG] Response status:", response.status)
                console.log("[DEBUG] Response ok:", response.ok)

                if (!response.ok) {
                    // If response is not ok, we'll still use the kutseroId we already set
                    console.log("[DEBUG] ⚠️ Profile fetch failed, but using pre-set kutseroId")
                    
                    // Try to parse error
                    try {
                        const errorText = await response.text()
                        console.log("[DEBUG] Error response:", errorText)
                    } catch (e) {
                        console.log("[DEBUG] Could not read error response")
                    }
                    
                    // Don't show alert, just continue with what we have
                    return
                }

                const responseText = await response.text()
                console.log("[DEBUG] Response length:", responseText.length, "bytes")

                let result
                try {
                    result = JSON.parse(responseText)
                } catch (parseError) {
                    console.error("[ERROR] Failed to parse JSON:", parseError)
                    console.log("[DEBUG] ⚠️ JSON parse failed, but continuing with pre-set kutseroId")
                    return
                }

                console.log("[DEBUG] Parsed result success:", result.success)

                if (result.success && result.data) {
                    const profile = result.data
                    console.log("[DEBUG] Profile data received (keys):", Object.keys(profile))

                    // Update kutseroProfileId if we got a different ID from the profile
                    if (profile.id && profile.id !== kutseroId) {
                        setKutseroProfileId(profile.id)
                        console.log("[DEBUG] ✅ Updated kutsero_profile UUID:", profile.id)
                    } else {
                        console.log("[DEBUG] ✅ Keeping kutseroProfileId as:", kutseroProfileId)
                    }

                    // Auto-fill contact number for display
                    const phone = profile.phoneNumber || profile.kutsero_phone_num || profile.phone_number || profile.phone
                    if (phone) {
                        setContactNumber(phone)
                        console.log("[DEBUG] ✅ Auto-filled contact number:", phone)
                    } else {
                        console.log("[DEBUG] ❌ No phone number found in profile")
                        console.log("[DEBUG] Available profile fields:", Object.keys(profile))
                    }

                    // Auto-fill user name for display
                    const firstName = profile.firstName || profile.kutsero_fname || profile.first_name || ""
                    const lastName = profile.lastName || profile.kutsero_lname || profile.last_name || ""
                    const fullName = `${firstName} ${lastName}`.trim()
                    
                    if (fullName) {
                        setUserName(fullName)
                        console.log("[DEBUG] ✅ Auto-filled user name:", fullName)
                    } else {
                        console.log("[DEBUG] ❌ No name found in profile")
                    }
                } else {
                    console.log("[DEBUG] ⚠️ Invalid response structure, but continuing with pre-set kutseroId")
                }
            } catch (error) {
                console.error("[ERROR] Error fetching profile:", error)
                const errorMessage = error instanceof Error ? error.message : "Unknown error"
                console.log("[DEBUG] ⚠️ Error occurred:", errorMessage)
                console.log("[DEBUG] ⚠️ Continuing with pre-set kutseroId:", kutseroProfileId)
                
                // Don't show alert if we already have kutseroId set
                // The user can still send SOS even without fetching full profile
            } finally {
                setIsLoadingProfile(false)
                console.log("[DEBUG] Profile loading finished. Final kutseroProfileId:", kutseroProfileId)
            }
        }

        fetchKutseroProfile()
    }, [kutseroId])

    const toggleHorseStatus = (status: string) => {
        setHorseStatus(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        )
    }

    const getCurrentLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== "granted") {
                Alert.alert("Permission Denied", "Location permission is required to send your SOS.")
                return
            }

            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            })

            const { latitude: lat, longitude: long } = location.coords

            let [address] = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: long,
            })

            let addressString = `${address.name || ""} ${address.street || ""}, ${address.city || ""}, ${address.region || ""}`

            setCurrentLocation(
                `${addressString} - (Lat: ${lat.toFixed(4)}, Long: ${long.toFixed(4)})`
            )
            setLatitude(lat)
            setLongitude(long)
        } catch (error) {
            console.error(error)
            Alert.alert("Error", "Unable to fetch your location.")
        }
    }

    const handleImagePicker = async () => {
        if (sosImages.length >= 5) {
            Alert.alert("Maximum Images", "You can upload up to 5 images only.")
            return
        }

        Alert.alert("Select Photos", "Choose how you'd like to add photos of the emergency", [
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

    const openCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync()

            if (status !== "granted") {
                Alert.alert("Permission Denied", "Camera permission is required to take photos.")
                return
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            })

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0]
                const imageUri = asset.uri

                console.log("Camera image selected:", imageUri)

                const imageData: SOSImage = {
                    uri: imageUri,
                    type: "image/jpeg",
                    name: `sos_camera_${Date.now()}.jpg`,
                }

                setSOSImages(prev => [...prev, imageData])
            }
        } catch (error) {
            console.error("Camera error:", error)
            Alert.alert("Error", "Failed to open camera. Please try again.")
        }
    }

    const openImageLibrary = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()

            if (status !== "granted") {
                Alert.alert("Permission Denied", "Photo library permission is required to select photos.")
                return
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
                allowsMultipleSelection: false,
            })

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0]
                const imageUri = asset.uri

                console.log("Gallery image selected:", imageUri)

                const imageData: SOSImage = {
                    uri: imageUri,
                    type: "image/jpeg",
                    name: `sos_gallery_${Date.now()}.jpg`,
                }

                setSOSImages(prev => [...prev, imageData])
            }
        } catch (error) {
            console.error("Image picker error:", error)
            Alert.alert("Error", "Failed to open photo library. Please try again.")
        }
    }

    const removeImage = (index: number) => {
        setSOSImages(prev => prev.filter((_, i) => i !== index))
    }

    const convertImageToBase64 = async (uri: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            fetch(uri)
                .then((response) => response.blob())
                .then((blob) => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                        resolve(reader.result as string)
                    }
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })
                .catch(reject)
        })
    }

    const handleSendSOS = async () => {
        if (isLoading) return

        // Validate that we have the kutsero profile ID
        if (!kutseroProfileId) {
            console.error("[ERROR] No kutseroProfileId available")
            console.log("[DEBUG] Current state:", {
                kutseroId,
                kutseroProfileId,
                contactNumber,
                userName
            })
            Alert.alert("Error", "Profile information not loaded. Please wait a moment and try again.")
            return
        }

        console.log("[DEBUG] Sending SOS with kutsero_profile:", kutseroProfileId)

        setIsLoading(true)

        try {
            // Convert images to base64
            let imagesBase64: string[] = []
            if (sosImages.length > 0) {
                console.log(`Converting ${sosImages.length} images to base64...`)
                for (const image of sosImages) {
                    try {
                        const base64 = await convertImageToBase64(image.uri)
                        imagesBase64.push(base64)
                    } catch (error) {
                        console.error("Error converting image:", error)
                    }
                }
                console.log(`Successfully converted ${imagesBase64.length} images`)
            }

            const sosData = {
                kutsero_profile: kutseroProfileId,
                contact_number: contactNumber,
                user_name: userName,
                additional_info: additionalInfo,
                emergency_type: emergencyType,
                horse_status: horseStatus,
                description,
                location_text: currentLocation,
                latitude,
                longitude,
                images: imagesBase64,
            }

            console.log("[DEBUG] Sending SOS data:", {
                ...sosData,
                images: `${imagesBase64.length} images`,
                kutsero_profile: sosData.kutsero_profile
            })

            const response = await fetch("http://192.168.1.9:8000/api/kutsero/sos/create/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(sosData),
            })

            console.log("[DEBUG] SOS Response status:", response.status)

            if (response.ok) {
                setShowSuccessModal(true)
                setTimeout(() => {
                    setShowSuccessModal(false)
                    setAdditionalInfo("")
                    setEmergencyType("Injury/Trauma")
                    setHorseStatus([])
                    setDescription("")
                    setCurrentLocation("Tap to get current location")
                    setLatitude(null)
                    setLongitude(null)
                    setSOSImages([])
                }, 3000)
            } else {
                const errorData = await response.json()
                console.error("SOS Request Error:", errorData)
                Alert.alert("Error", `Failed to send SOS alert: ${errorData.message || response.status}`)
            }
        } catch (error) {
            console.error("Network Error:", error)
            Alert.alert("Error", "An error occurred while sending the request.")
        } finally {
            setIsLoading(false)
        }
    }

    const BackIcon = () => (
        <View style={styles.backIconContainer}>
            <View style={styles.backArrow} />
        </View>
    )

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#E53E3E" translucent={false} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: safeArea.top }]}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <BackIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SOS Emergency Alert</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.formContainer}>
                    <View style={styles.importantNotice}>
                        <Text style={styles.importantText}>
                            Important: This form sends an emergency alert to DVME and CTU Vermed. Please provide accurate information about your emergency situation.
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Contact Number *</Text>
                        <View style={styles.readOnlyInputContainer}>
                            <TextInput
                                style={[styles.textInput, styles.readOnlyInput]}
                                value={isLoadingProfile ? "Loading..." : contactNumber}
                                placeholder={isLoadingProfile ? "Loading contact number..." : "Contact number"}
                                placeholderTextColor="#999"
                                editable={false}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Horse Emergency Type</Text>
                        <TouchableOpacity 
                            style={styles.dropdownContainer}
                            onPress={() => setShowEmergencyTypeModal(true)}
                            disabled={isLoading}
                        >
                            <Text style={styles.dropdownValue}>{emergencyType}</Text>
                            <View style={styles.dropdownArrow} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Horse Status</Text>
                        <View style={styles.statusButtonsContainer}>
                            {horseStatusOptions.map((status: string) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.statusButton,
                                        horseStatus.includes(status) && styles.statusButtonActive
                                    ]}
                                    onPress={() => toggleHorseStatus(status)}
                                    disabled={isLoading}
                                >
                                    <Text style={[
                                        styles.statusButtonText,
                                        horseStatus.includes(status) && styles.statusButtonTextActive
                                    ]}>
                                        {status}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Describe What Happened</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Provide detailed description of the emergency..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            editable={!isLoading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Additional Information (Optional)</Text>
                        <TextInput
                            style={[styles.textInput, styles.textArea]}
                            value={additionalInfo}
                            onChangeText={setAdditionalInfo}
                            placeholder="Any other relevant information..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            editable={!isLoading}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Your Current Location</Text>
                        <TouchableOpacity 
                            style={styles.locationContainer} 
                            onPress={getCurrentLocation}
                            disabled={isLoading}
                        >
                            <View style={styles.locationPin}>
                                <View style={styles.locationDot} />
                            </View>
                            <Text style={styles.locationText}>{currentLocation}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Upload Photos (Optional - Max 5)</Text>
                        <TouchableOpacity 
                            style={styles.uploadContainer} 
                            onPress={handleImagePicker}
                            disabled={isLoading || sosImages.length >= 5}
                        >
                            <View style={styles.cameraIcon}>
                                <View style={styles.cameraBody} />
                                <View style={styles.cameraLens} />
                            </View>
                            <Text style={styles.uploadText}>
                                {sosImages.length > 0 ? `${sosImages.length} photo(s) added` : "Add Photos"}
                            </Text>
                        </TouchableOpacity>

                        {sosImages.length > 0 && (
                            <View style={styles.imagePreviewContainer}>
                                {sosImages.map((image, index) => (
                                    <View key={index} style={styles.imagePreviewWrapper}>
                                        <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                                        <TouchableOpacity
                                            style={styles.removeImageButton}
                                            onPress={() => removeImage(index)}
                                            disabled={isLoading}
                                        >
                                            <Text style={styles.removeImageText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Send SOS Button */}
            <View style={[styles.bottomContainer, { paddingBottom: safeArea.bottom }]}>
                <TouchableOpacity
                    style={[styles.sosButton, (isLoading || isLoadingProfile) && styles.sosButtonDisabled]}
                    onPress={handleSendSOS}
                    activeOpacity={0.8}
                    disabled={isLoading || isLoadingProfile}
                >
                    <Text style={styles.sosButtonText}>
                        {isLoading ? "Sending SOS Alert..." : isLoadingProfile ? "Loading..." : "Send SOS Alert"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Success Modal */}
            <Modal
                visible={showSuccessModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.successIcon}>
                            <View style={styles.checkmark} />
                        </View>
                        <Text style={styles.modalTitle}>SOS Alert Sent!</Text>
                        <Text style={styles.modalMessage}>
                            Your emergency alert has been sent to DVME and CTU Vermed. Help is on the way.
                        </Text>
                        <Text style={styles.modalInstruction}>
                            Please stay where you are.
                        </Text>
                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => setShowSuccessModal(false)}
                        >
                            <Text style={styles.modalButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Emergency Type Selection Modal */}
            <Modal
                visible={showEmergencyTypeModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowEmergencyTypeModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.pickerModalContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>Select Horse Emergency Type</Text>
                            <TouchableOpacity
                                onPress={() => setShowEmergencyTypeModal(false)}
                                style={styles.closeButton}
                            >
                                <Text style={styles.closeButtonText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerScrollView}>
                            {emergencyTypes.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[
                                        styles.pickerOption,
                                        emergencyType === type && styles.pickerOptionSelected
                                    ]}
                                    onPress={() => {
                                        setEmergencyType(type)
                                        setShowEmergencyTypeModal(false)
                                    }}
                                >
                                    <Text style={[
                                        styles.pickerOptionText,
                                        emergencyType === type && styles.pickerOptionTextSelected
                                    ]}>
                                        {type}
                                    </Text>
                                    {emergencyType === type && (
                                        <View style={styles.checkIcon}>
                                            <View style={styles.checkIconMark} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F5F5" },
    header: {
        backgroundColor: "#E53E3E",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: scale(16),
        paddingBottom: verticalScale(16),
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    backButton: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(16),
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    backIconContainer: {
        width: scale(16),
        height: scale(16),
        justifyContent: "center",
        alignItems: "center",
    },
    backArrow: {
        width: scale(8),
        height: scale(8),
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: "white",
        transform: [{ rotate: "45deg" }],
    },
    headerTitle: {
        flex: 1,
        fontSize: moderateScale(18),
        fontWeight: "bold",
        color: "white",
        textAlign: "center",
        marginHorizontal: scale(16),
    },
    headerSpacer: { width: scale(32) },
    content: { flex: 1 },
    scrollContent: { paddingBottom: verticalScale(20) },
    formContainer: {
        backgroundColor: "white",
        margin: scale(16),
        borderRadius: scale(12),
        padding: scale(16),
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,
    },
    importantNotice: {
        backgroundColor: "#FFF3CD",
        borderColor: "#FFEAA7",
        borderWidth: 1,
        borderRadius: scale(8),
        padding: scale(12),
        marginBottom: verticalScale(16),
    },
    importantText: {
        fontSize: moderateScale(12),
        color: "#856404",
        lineHeight: moderateScale(16),
    },
    inputGroup: { marginBottom: verticalScale(16) },
    inputLabel: {
        fontSize: moderateScale(14),
        fontWeight: "600",
        color: "#333",
        marginBottom: verticalScale(8),
    },
    textInput: {
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: scale(8),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(12),
        fontSize: moderateScale(14),
        color: "#333",
        backgroundColor: "white",
    },
    readOnlyInputContainer: {
        position: "relative",
    },
    readOnlyInput: {
        backgroundColor: "#F8F9FA",
        color: "#555",
        fontWeight: "500",
    },
    autoFillBadge: {
        position: "absolute",
        right: scale(12),
        top: "50%",
        transform: [{ translateY: -scale(10) }],
        backgroundColor: "#48BB78",
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(12),
    },
    autoFillText: {
        fontSize: moderateScale(10),
        color: "white",
        fontWeight: "600",
    },
    textArea: { height: verticalScale(80), textAlignVertical: "top" },
    dropdownContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: scale(8),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(12),
        backgroundColor: "white",
    },
    dropdownValue: { fontSize: moderateScale(14), color: "#333" },
    dropdownArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 5,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: "#666",
    },
    statusButtonsContainer: { flexDirection: "row", flexWrap: "wrap", gap: scale(8) },
    statusButton: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
        borderRadius: scale(20),
        borderWidth: 1,
        borderColor: "#E0E0E0",
        backgroundColor: "white",
    },
    statusButtonActive: { backgroundColor: "#E53E3E", borderColor: "#E53E3E" },
    statusButtonText: { fontSize: moderateScale(12), color: "#666", fontWeight: "500" },
    statusButtonTextActive: { color: "white" },
    locationContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E0E0E0",
        borderRadius: scale(8),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(12),
        backgroundColor: "#F8F9FA",
    },
    locationPin: {
        width: scale(16),
        height: scale(16),
        justifyContent: "center",
        alignItems: "center",
        marginRight: scale(8),
    },
    locationDot: { width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: "#E53E3E" },
    locationText: { flex: 1, fontSize: moderateScale(12), color: "#666" },
    uploadContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#E0E0E0",
        borderStyle: "dashed",
        borderRadius: scale(8),
        paddingVertical: verticalScale(20),
        backgroundColor: "#FAFAFA",
    },
    cameraIcon: { width: scale(24), height: scale(24), marginRight: scale(8), position: "relative" },
    cameraBody: {
        width: scale(20),
        height: scale(16),
        backgroundColor: "#666",
        borderRadius: scale(2),
        position: "absolute",
        top: scale(4),
        left: scale(2),
    },
    cameraLens: {
        width: scale(8),
        height: scale(8),
        backgroundColor: "#333",
        borderRadius: scale(4),
        position: "absolute",
        top: scale(8),
        left: scale(8),
    },
    uploadText: { fontSize: moderateScale(14), color: "#666", fontWeight: "500" },
    imagePreviewContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: scale(8),
        marginTop: verticalScale(12),
    },
    imagePreviewWrapper: {
        position: "relative",
        width: scale(80),
        height: scale(80),
    },
    imagePreview: {
        width: "100%",
        height: "100%",
        borderRadius: scale(8),
        backgroundColor: "#F0F0F0",
    },
    removeImageButton: {
        position: "absolute",
        top: -scale(8),
        right: -scale(8),
        width: scale(24),
        height: scale(24),
        borderRadius: scale(12),
        backgroundColor: "#E53E3E",
        justifyContent: "center",
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    removeImageText: {
        color: "white",
        fontSize: moderateScale(14),
        fontWeight: "bold",
    },
    bottomContainer: {
        backgroundColor: "white",
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(16),
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
    },
    sosButton: {
        backgroundColor: "#E53E3E",
        borderRadius: scale(12),
        paddingVertical: verticalScale(16),
        alignItems: "center",
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    sosButtonDisabled: {
        backgroundColor: "#CCC",
        opacity: 0.6,
    },
    sosButtonText: { fontSize: moderateScale(16), fontWeight: "bold", color: "white" },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        backgroundColor: "white",
        borderRadius: scale(12),
        padding: scale(24),
        alignItems: "center",
        maxWidth: "85%",
    },
    successIcon: {
        width: scale(64),
        height: scale(64),
        borderRadius: scale(32),
        backgroundColor: "#48BB78",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: verticalScale(16),
    },
    checkmark: {
        width: scale(24),
        height: scale(12),
        borderLeftWidth: 3,
        borderBottomWidth: 3,
        borderColor: "white",
        transform: [{ rotate: "-45deg" }],
    },
    modalTitle: { fontSize: moderateScale(18), fontWeight: "bold", color: "#333", marginBottom: verticalScale(8) },
    modalMessage: { fontSize: moderateScale(14), color: "#666", textAlign: "center", marginBottom: verticalScale(12) },
    modalInstruction: { fontSize: moderateScale(12), color: "#999", textAlign: "center", marginBottom: verticalScale(20) },
    modalButton: {
        backgroundColor: "#E53E3E",
        borderRadius: scale(8),
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(10),
    },
    modalButtonText: { fontSize: moderateScale(14), fontWeight: "bold", color: "white" },
    pickerModalContainer: {
        backgroundColor: "white",
        borderTopLeftRadius: scale(20),
        borderTopRightRadius: scale(20),
        maxHeight: "70%",
        width: "100%",
        position: "absolute",
        bottom: 0,
    },
    pickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(16),
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
    },
    pickerTitle: {
        fontSize: moderateScale(18),
        fontWeight: "bold",
        color: "#333",
    },
    closeButton: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(16),
        backgroundColor: "#F5F5F5",
        justifyContent: "center",
        alignItems: "center",
    },
    closeButtonText: {
        fontSize: moderateScale(20),
        color: "#666",
    },
    pickerScrollView: {
        maxHeight: "100%",
    },
    pickerOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(16),
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
    },
    pickerOptionSelected: {
        backgroundColor: "#FFF5F5",
    },
    pickerOptionText: {
        fontSize: moderateScale(16),
        color: "#333",
    },
    pickerOptionTextSelected: {
        color: "#E53E3E",
        fontWeight: "600",
    },
    checkIcon: {
        width: scale(20),
        height: scale(20),
        borderRadius: scale(10),
        backgroundColor: "#E53E3E",
        justifyContent: "center",
        alignItems: "center",
    },
    checkIconMark: {
        width: scale(10),
        height: scale(5),
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: "white",
        transform: [{ rotate: "-45deg" }],
    },
})