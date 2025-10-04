import { useRouter } from 'expo-router'
import { useState } from "react"
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
    View
} from "react-native"
import * as Location from "expo-location"

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
}

export default function SOSEmergencyScreen({ onBack }: SOSEmergencyProps) {
    const router = useRouter()
    const [contactNumber, setContactNumber] = useState("")
    const [additionalInfo, setAdditionalInfo] = useState("")
    const [emergencyType, setEmergencyType] = useState("Injury/Trauma")
    const [horseStatus, setHorseStatus] = useState<string[]>([])
    const [description, setDescription] = useState("")
    const [currentLocation, setCurrentLocation] = useState("Tap to get current location")
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [showEmergencyTypeModal, setShowEmergencyTypeModal] = useState(false)
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

    const handleSendSOS = async () => {
        if (!contactNumber.trim()) {
            Alert.alert("Error", "Please enter a contact number")
            return
        }

        const sosData = {
            user_id: "example_user_id_123",
            contact_number: contactNumber,
            additional_info: additionalInfo,
            emergency_type: emergencyType,
            horse_status: horseStatus,
            description,
            location_text: currentLocation,
            latitude,
            longitude,
        }

        try {
            const response = await fetch("http://192.168.1.8:8000/api/kutsero/sos/create/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(sosData),
            })

            if (response.ok) {
                setShowSuccessModal(true)
                // Clear form after successful submission
                setTimeout(() => {
                    setShowSuccessModal(false)
                    // Reset all form fields
                    setContactNumber("")
                    setAdditionalInfo("")
                    setEmergencyType("Injury/Trauma")
                    setHorseStatus([])
                    setDescription("")
                    setCurrentLocation("Tap to get current location")
                    setLatitude(null)
                    setLongitude(null)
                }, 3000)
            } else {
                const errorData = await response.json()
                console.error("SOS Request Error:", errorData)
                Alert.alert("Error", `Failed to send SOS alert. Status: ${response.status}`)
            }
        } catch (error) {
            console.error("Network Error:", error)
            Alert.alert("Error", "An error occurred while sending the request.")
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
                        <TextInput
                            style={styles.textInput}
                            value={contactNumber}
                            onChangeText={setContactNumber}
                            placeholder="Enter emergency contact number"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Horse Emergency Type</Text>
                        <TouchableOpacity 
                            style={styles.dropdownContainer}
                            onPress={() => setShowEmergencyTypeModal(true)}
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
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Your Current Location</Text>
                        <TouchableOpacity style={styles.locationContainer} onPress={getCurrentLocation}>
                            <View style={styles.locationPin}>
                                <View style={styles.locationDot} />
                            </View>
                            <Text style={styles.locationText}>{currentLocation}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Upload Photos (Optional)</Text>
                        <TouchableOpacity style={styles.uploadContainer}>
                            <View style={styles.cameraIcon}>
                                <View style={styles.cameraBody} />
                                <View style={styles.cameraLens} />
                            </View>
                            <Text style={styles.uploadText}>Add Photos</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Send SOS Button */}
            <View style={[styles.bottomContainer, { paddingBottom: safeArea.bottom }]}>
                <TouchableOpacity
                    style={styles.sosButton}
                    onPress={handleSendSOS}
                    activeOpacity={0.8}
                >
                    <Text style={styles.sosButtonText}>Send SOS Alert</Text>
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