// KUTSERO Terms & Conditions Screen

"use client"
import { useState } from "react"
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View, 
} from "react-native"

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

// Mobile-optimized spacing
const dynamicSpacing = (baseSize: number) => {
  if (width < 350) return verticalScale(baseSize * 0.7)
  if (width < 400) return verticalScale(baseSize * 0.85)
  if (width > 450) return verticalScale(baseSize * 1.05)
  return verticalScale(baseSize)
}

// Safe area calculations
const getSafeAreaPadding = () => {
  const statusBarHeight = StatusBar.currentHeight || 0
  return {
    top: Math.max(statusBarHeight, 20),
    bottom: height > 800 ? 34 : 20,
  }
}

interface TermsPoliciesProps {
  onBack: () => void
}

export default function TermsPolicies({ onBack }: TermsPoliciesProps) {
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({})
  const safeArea = getSafeAreaPadding()

  const BackIcon = () => (
    <View style={styles.backIconContainer}>
      <View style={styles.backArrow} />
    </View>
  )

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }))
  }

  const ExpandableSection = ({ 
    title, 
    children, 
    sectionKey 
  }: { 
    title: string
    children: React.ReactNode
    sectionKey: string 
  }) => {
    const isExpanded = expandedSections[sectionKey]
    
    return (
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={[
            styles.expandIcon,
            isExpanded && styles.expandIconRotated
          ]}>
            <View style={styles.expandArrow} />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.sectionContent}>
            {children}
          </View>
        )}
      </View>
    )
  }

  const BulletPoint = ({ children }: { children: string }) => (
    <View style={styles.bulletContainer}>
      <View style={styles.bullet} />
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  )

  const SubSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <View style={styles.subSection}>
      <Text style={styles.subSectionTitle}>{title}</Text>
      {children}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#C17A47" translucent={false} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeArea.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: safeArea.bottom + dynamicSpacing(20) }
        ]}
      >
        {/* Introduction Section */}
        <ExpandableSection title="1. Introduction" sectionKey="introduction">
          <Text style={styles.welcomeText}>
            Welcome to the ECHO Mobile Application (Equine Care and Health Optimization). By registering and using this app, you agree to comply with and be bound by these Terms and Conditions.
          </Text>
          <Text style={styles.welcomeText}>
            The ECHO App is developed to support the Tartanilla Horse Health Management Program under the Department of Veterinary Medicine and Fisheries (DVMF) and the Cebu Technological University (CTU). These terms apply to all Horse Operators (owners) and Kutseros (drivers) using the mobile application to manage and monitor horse health records.
          </Text>
        </ExpandableSection>

        {/* User Responsibilities */}
        <ExpandableSection title="2. User Responsibilities" sectionKey="responsibilities">
          <SubSection title="a. Horse Operator (Owner)">
            <BulletPoint>You must provide complete and accurate information regarding your identity and your horse's details during registration.</BulletPoint>
            <BulletPoint>You are responsible for ensuring your horse receives regular veterinary checkups.</BulletPoint>
            <BulletPoint>You shall coordinate with assigned veterinarians for health updates, appointments, and record submissions.</BulletPoint>
            <BulletPoint>You must ensure that all data you enter into the system is truthful and up to date.</BulletPoint>
            <BulletPoint>You are responsible for maintaining the security and confidentiality of your account.</BulletPoint>
          </SubSection>

          <SubSection title="b. Kutsero (Driver)">
            <BulletPoint>You are responsible for safely handling and operating the horse during daily Tartanilla activities.</BulletPoint>
            <BulletPoint>You must cooperate with the horse operator in monitoring the horse's health status.</BulletPoint>
            <BulletPoint>You agree to report any observed injuries, illnesses, or unusual behavior of the horse through the app or directly to the operator.</BulletPoint>
            <BulletPoint>You shall use the app responsibly and avoid misuse, misinformation, or unauthorized access.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Data Privacy and Protection */}
        <ExpandableSection title="3. Data Privacy and Protection" sectionKey="privacy">
          <BulletPoint>The ECHO App collects personal and animal health information necessary for communication and monitoring within the Tartanilla Program.</BulletPoint>
          <BulletPoint>All collected data will be handled responsibly and in accordance with the principles of the Data Privacy Act of 2012 (Republic Act No. 10173).</BulletPoint>
          <BulletPoint>Your data may be shared only with authorized DVMF and CTU personnel for official and program-related purposes.</BulletPoint>
          <BulletPoint>The ECHO Team implements reasonable safeguards to protect your information from unauthorized use or disclosure.</BulletPoint>
        </ExpandableSection>

        {/* Account and Security */}
        <ExpandableSection title="4. Account and Security" sectionKey="security">
          <BulletPoint>You are solely responsible for maintaining the confidentiality of your login credentials.</BulletPoint>
          <BulletPoint>Any actions performed under your account will be considered your responsibility.</BulletPoint>
          <BulletPoint>You must immediately report any unauthorized use or suspected security breach to the ECHO Support Team.</BulletPoint>
          <BulletPoint>The administrators reserve the right to suspend or deactivate accounts found to be in violation of these terms.</BulletPoint>
        </ExpandableSection>

        {/* Acceptable Use */}
        <ExpandableSection title="5. Acceptable Use" sectionKey="use">
          <BulletPoint>You agree to use the ECHO App only for legitimate and lawful purposes connected to the Tartanilla Program.</BulletPoint>
          <BulletPoint>You must not tamper with the system, upload false information, or access other users' data without authorization.</BulletPoint>
          <BulletPoint>Misuse of the app, including fraudulent or inappropriate activities, may result in permanent account termination.</BulletPoint>
        </ExpandableSection>

        {/* Limitation of Liability */}
        <ExpandableSection title="6. Limitation of Liability" sectionKey="liability">
          <BulletPoint>The ECHO App serves as a digital tool to assist in horse health tracking and communication; it does not replace physical veterinary consultations.</BulletPoint>
          <BulletPoint>The developers, administrators, and partner institutions are not liable for any loss, injury, or damage caused by misuse of the app, inaccurate data, or user negligence.</BulletPoint>
          <BulletPoint>Users are responsible for ensuring that all information entered into the system is correct and updated.</BulletPoint>
        </ExpandableSection>

        {/* Modifications to the Terms */}
        <ExpandableSection title="7. Modifications to the Terms" sectionKey="modifications">
          <BulletPoint>The ECHO Team may modify or update these Terms and Conditions at any time.</BulletPoint>
          <BulletPoint>Users will be notified of significant changes through the mobile app.</BulletPoint>
          <BulletPoint>Continued use of the application after updates constitutes your acceptance of the revised terms.</BulletPoint>
        </ExpandableSection>

        {/* Contact and Support */}
        <ExpandableSection title="8. Contact and Support" sectionKey="support">
          <Text style={styles.supportText}>
            For any questions, assistance, or technical concerns, please contact:
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>📧 echosys.ph@gmail.com</Text>
          </View>
        </ExpandableSection>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#C17A47",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: dynamicSpacing(12),
    minHeight: verticalScale(60),
  },
  backButton: {
    padding: scale(8),
  },
  backIconContainer: {
    width: scale(20),
    height: scale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    width: scale(12),
    height: scale(12),
    borderLeftWidth: scale(2),
    borderTopWidth: scale(2),
    borderColor: "white",
    transform: [{ rotate: "-45deg" }],
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: "600",
    color: "white",
  },
  headerRight: {
    width: scale(36),
  },
  content: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollContent: {
    flexGrow: 1,
  },
  welcomeText: {
    fontSize: moderateScale(14),
    color: "#333",
    lineHeight: moderateScale(20),
    textAlign: "justify",
    marginBottom: verticalScale(10),
  },
  sectionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: dynamicSpacing(16),
    backgroundColor: "white",
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: "600",
    color: "#C17A47",
    flex: 1,
    lineHeight: moderateScale(20),
  },
  expandIcon: {
    width: scale(20),
    height: scale(20),
    justifyContent: "center",
    alignItems: "center",
  },
  expandIconRotated: {
    transform: [{ rotate: "90deg" }],
  },
  expandArrow: {
    width: scale(8),
    height: scale(8),
    borderRightWidth: scale(2),
    borderTopWidth: scale(2),
    borderColor: "#C17A47",
    transform: [{ rotate: "45deg" }],
  },
  sectionContent: {
    paddingHorizontal: scale(20),
    paddingVertical: dynamicSpacing(16),
    backgroundColor: "#FAFAFA",
  },
  subSection: {
    marginBottom: verticalScale(16),
  },
  subSectionTitle: {
    fontSize: moderateScale(15),
    fontWeight: "600",
    color: "#333",
    marginBottom: verticalScale(8),
  },
  bulletContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: verticalScale(12),
  },
  bullet: {
    width: scale(4),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: "#C17A47",
    marginTop: verticalScale(8),
    marginRight: scale(8),
    flexShrink: 0,
  },
  bulletText: {
    fontSize: moderateScale(14),
    color: "#333",
    lineHeight: moderateScale(20),
    flex: 1,
    textAlign: "justify",
  },
  supportText: {
    fontSize: moderateScale(14),
    color: "#333",
    lineHeight: moderateScale(20),
    marginBottom: verticalScale(12),
  },
  contactInfo: {
    marginLeft: scale(12),
    marginTop: verticalScale(8),
  },
  contactText: {
    fontSize: moderateScale(14),
    color: "#C17A47",
    fontWeight: "500",
    marginBottom: verticalScale(4),
  },
})