// HORSE OPERATOR Terms and Policies Screen

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
import { useRouter } from 'expo-router'

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
  onBack?: () => void
}

export default function TermsPolicies({ onBack }: TermsPoliciesProps) {
  const router = useRouter()
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

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
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
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Terms & Policies</Text>
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
          <SubSection title="About ECHO">
            <Text style={styles.welcomeText}>
              Welcome to ECHO, a digital platform designed to monitor, manage, and improve the health and welfare 
              of farm animals in real-time. By accessing or using the platform, users agree to adhere to these Terms and Policies.
            </Text>
          </SubSection>
          <SubSection title="Platform Purpose">
            <Text style={styles.welcomeText}>
              The ECHO platform is developed to support animal health management under the Department of Veterinary 
              Medicine and Fisheries (DVMF) and partner institutions. These terms apply to all users including horse 
              operators, veterinarians, and DVMF officials.
            </Text>
          </SubSection>
        </ExpandableSection>

        {/* User Eligibility */}
        <ExpandableSection title="2. User Eligibility" sectionKey="eligibility">
          <SubSection title="User Requirements">
            <BulletPoint>Users include horse operators (caretakers), veterinarians, and DVMF officials aged 18 or older.</BulletPoint>
            <BulletPoint>Users must register with accurate information and keep login details confidential.</BulletPoint>
            <BulletPoint>You must provide complete and accurate information regarding your identity and your horse&#39;s details during registration.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* User Responsibilities */}
        <ExpandableSection title="3. User Responsibilities" sectionKey="responsibilities">
          <SubSection title="General Responsibilities">
            <BulletPoint>Use the system solely for authorized purposes related to horse health and welfare.</BulletPoint>
            <BulletPoint>Ensure all data entered (horse details, health info) are correct and respectful of privacy.</BulletPoint>
            <BulletPoint>Report any suspicious or malicious activities immediately to the support team.</BulletPoint>
            <BulletPoint>Not attempt to modify, disrupt, or misuse the platform.</BulletPoint>
          </SubSection>
          <SubSection title="Horse Care Responsibilities">
            <BulletPoint>You are responsible for ensuring your horse receives regular veterinary checkups.</BulletPoint>
            <BulletPoint>You shall coordinate with assigned veterinarians for health updates, appointments, and record submissions.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Data Privacy and Security */}
        <ExpandableSection title="4. Data Privacy and Security" sectionKey="privacy">
          <SubSection title="Data Collection">
            <BulletPoint>The ECHO platform collects personal and animal health information necessary for communication and monitoring within the program.</BulletPoint>
            <BulletPoint>All collected data will be handled responsibly and in accordance with the principles of the Data Privacy Act of 2012 (Republic Act No. 10173).</BulletPoint>
          </SubSection>
          <SubSection title="Data Protection">
            <BulletPoint>Personal data and horse records are stored securely and used only for system operations.</BulletPoint>
            <BulletPoint>Access to sensitive information is role-based and restricted to authorized users.</BulletPoint>
            <BulletPoint>Users should not share login credentials or allow unauthorized access.</BulletPoint>
          </SubSection>
          <SubSection title="Data Sharing">
            <BulletPoint>Your data may be shared only with authorized DVMF personnel for official and program-related purposes.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Account and Security */}
        <ExpandableSection title="5. Account and Security" sectionKey="security">
          <SubSection title="Account Protection">
            <BulletPoint>You are solely responsible for maintaining the confidentiality of your login credentials.</BulletPoint>
            <BulletPoint>Any actions performed under your account will be considered your responsibility.</BulletPoint>
          </SubSection>
          <SubSection title="Security Incidents">
            <BulletPoint>You must immediately report any unauthorized use or suspected security breach to the ECHO Support Team.</BulletPoint>
            <BulletPoint>The administrators reserve the right to suspend or deactivate accounts found to be in violation of these terms.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* System Usage and Acceptable Use */}
        <ExpandableSection title="6. System Usage and Acceptable Use" sectionKey="usage">
          <SubSection title="Acceptable Use">
            <BulletPoint>You agree to use the ECHO platform only for legitimate and lawful purposes connected to horse health management.</BulletPoint>
            <BulletPoint>The platform requires internet access; offline functionality may be limited.</BulletPoint>
          </SubSection>
          <SubSection title="Prohibited Activities">
            <BulletPoint>Users must not employ automation or hacking techniques to interfere with the system.</BulletPoint>
            <BulletPoint>You must not tamper with the system, upload false information, or access other users&#39; data without authorization.</BulletPoint>
            <BulletPoint>Misuse of the app, including fraudulent or inappropriate activities, may result in permanent account termination.</BulletPoint>
          </SubSection>
          <SubSection title="System Limitations">
            <BulletPoint>The developers are not responsible for system downtime or technical issues beyond their control.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Intellectual Property */}
        <ExpandableSection title="7. Intellectual Property" sectionKey="property">
          <SubSection title="Ownership and Rights">
            <BulletPoint>All system content, features, logos, trademarks, and source code are owned by the system developers or licensors.</BulletPoint>
            <BulletPoint>Users are prohibited from copying, reproducing, distributing, or reverse-engineering any system content without explicit permission.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Limitation of Liability */}
        <ExpandableSection title="8. Limitation of Liability" sectionKey="liability">
          <SubSection title="Platform Scope">
            <BulletPoint>The ECHO platform serves as a digital tool to assist in early detection and management of horse health issues; it does not replace physical veterinary consultations.</BulletPoint>
          </SubSection>
          <SubSection title="Liability Limitations">
            <BulletPoint>The developers, administrators, and partner institutions are not liable for any loss, injury, or damage caused by misuse of the platform, inaccurate data, or user negligence.</BulletPoint>
            <BulletPoint>Users are responsible for ensuring that all information entered into the system is correct and updated.</BulletPoint>
            <BulletPoint>In case of prolonged service downtime, no guarantees are provided for uninterrupted service.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Updates and Amendments */}
        <ExpandableSection title="9. Modifications to Terms" sectionKey="updates">
          <SubSection title="Policy Updates">
            <BulletPoint>The ECHO Team may modify or update these Terms and Policies at any time to reflect system improvements, legal requirements, or operational changes.</BulletPoint>
            <BulletPoint>Users will be notified of significant changes via system notifications or email.</BulletPoint>
            <BulletPoint>Continued use of the platform after updates constitutes acceptance of revised policies.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Termination and Suspension */}
        <ExpandableSection title="10. Termination and Suspension" sectionKey="termination">
          <SubSection title="Account Termination">
            <BulletPoint>Accounts may be suspended or terminated for violations, misuse, or malicious activities.</BulletPoint>
            <BulletPoint>Terminated users lose access to all platform features.</BulletPoint>
          </SubSection>
          <SubSection title="User-Initiated Deletion">
            <BulletPoint>Users may request account deletion, which will remove all associated personal data records from the system.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Compliance with Laws */}
        <ExpandableSection title="11. Compliance with Laws" sectionKey="compliance">
          <SubSection title="Legal Compliance">
            <BulletPoint>Users agree to comply with local laws, regulations, and ethical standards related to animal welfare.</BulletPoint>
            <BulletPoint>The system adheres to Philippine data privacy laws and regulations.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Support & Communication */}
        <ExpandableSection title="12. Support & Communication" sectionKey="support">
          <SubSection title="Contact Information">
            <Text style={styles.supportText}>
              Support is available through email, Facebook, and in-app help features. For any questions, assistance, or technical concerns, please contact:
            </Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactText}>📧 echosupport@gmail.com</Text>
              <Text style={styles.contactText}>📘 Facebook: ECHO Support</Text>
            </View>
          </SubSection>
          <SubSection title="Emergency Alerts">
            <BulletPoint>Emergency and critical alerts can be sent via the system&#39;s emergency alert feature, which notifies veterinarians and authorities promptly.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* Data Retention & Confidentiality */}
        <ExpandableSection title="13. Data Retention & Confidentiality" sectionKey="retention">
          <SubSection title="Data Retention">
            <BulletPoint>Data will be stored securely and retained only for the duration necessary to fulfill the system&#39;s purpose.</BulletPoint>
            <BulletPoint>User data will not be shared with unauthorized parties unless mandated by law or for system support.</BulletPoint>
          </SubSection>
          <SubSection title="Feedback and Improvement">
            <BulletPoint>The system encourages users to provide feedback for continuous improvement.</BulletPoint>
            <BulletPoint>Feedback can be submitted via email or the in-app feedback feature.</BulletPoint>
          </SubSection>
        </ExpandableSection>

        {/* User Agreement */}
        <ExpandableSection title="14. User Agreement" sectionKey="agreement">
          <SubSection title="Agreement to Terms">
            <Text style={styles.welcomeText}>
              By using ECHO, you acknowledge that you have read, understood, and agree to be bound by these Terms and Policies. 
              Registering an account implies acceptance of these Terms and Policies, and you agree to use the platform responsibly 
              and ethically.
            </Text>
            <Text style={styles.welcomeText}>
              Last updated: January 2025
            </Text>
          </SubSection>
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
    marginBottom: verticalScale(12),
  },
  contactText: {
    fontSize: moderateScale(14),
    color: "#C17A47",
    fontWeight: "500",
    marginBottom: verticalScale(4),
  },
})