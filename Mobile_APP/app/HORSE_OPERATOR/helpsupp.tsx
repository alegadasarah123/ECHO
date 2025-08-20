import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

const HelpSupp = () => {
  const router = useRouter();

  const handleEmailPress = () => {
    Linking.openURL('mailto:echosupport@gmail.com');
  };

  const handleFacebookPress = () => {
    Linking.openURL('https://facebook.com/echo');
  };

  const handlePhonePress = () => {
    Linking.openURL('tel:+639123456789');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Common Questions</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldText}>How do I add a horse profile?</Text>{'\n'}
            Tap on the Horse Profiles menu and follow the instructions to register a new horse.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldText}>How can I schedule an appointment?</Text>{'\n'}
            Use the Appointments feature to select available times and confirm bookings.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldText}>How do I send an emergency alert?</Text>{'\n'}
            Fill out the emergency form in the app and tap Send Alert—help will be dispatched promptly.
          </Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>
            <Text style={styles.boldText}>How do I report a problem or give feedback?</Text>{'\n'}
            Contact support via email or Facebook, or submit feedback through the Help section.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Feedback & Suggestions</Text>
        <Text style={styles.paragraphText}>
          Your feedback helps us improve! Please share your suggestions or report issues through:
        </Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Email: <Text style={styles.linkText} onPress={handleEmailPress}>echosupport@gmail.com</Text></Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Facebook: <Text style={styles.linkText} onPress={handleFacebookPress}>facebook.com/echo</Text></Text>
        </View>

        <Text style={styles.sectionTitle}>About the App</Text>
        <Text style={styles.paragraphText}>
          ECHO is a mobile app that helps kutseros manage their kalesa horse&#39;s health. You can book vet appointments, get reminders, and keep track of your horse&#39;s condition—all in one place.
        </Text>

        <Text style={styles.sectionTitle}>
          <FontAwesome5 name="phone" size={18} color="#333" style={styles.iconInline} /> Need Assistance?
        </Text>
        <Text style={styles.paragraphText}>
          If you encounter any issues, have questions, or need help using the app, please contact us through the following channels:
        </Text>

        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Phone: <Text style={styles.linkText} onPress={handlePhonePress}>0912-345-6789</Text></Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Email: <Text style={styles.linkText} onPress={handleEmailPress}>echosupport@gmail.com</Text></Text>
        </View>
        <View style={styles.bulletContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.bulletText}>Facebook: <Text style={styles.linkText} onPress={handleFacebookPress}>facebook.com/echo</Text></Text>
        </View>

        <Text style={styles.sectionTitle}>
          <FontAwesome5 name="cog" size={18} color="#333" style={styles.iconInline} /> App Version
        </Text>
        <Text style={styles.paragraphText}>Echo v1.0.0</Text>
        <Text style={styles.paragraphText}>Last updated: March 2025</Text>

        <Text style={styles.sectionTitle}>
          <FontAwesome5 name="exclamation-triangle" size={18} color="#333" style={styles.iconInline} /> Emergency Assistance
        </Text>
        <Text style={styles.paragraphText}>
          If you experience a health emergency with a horse, use the Emergency Alert feature in the app to notify veterinarians and authorities immediately.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CD853F',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
    flexDirection: 'row', // For inline icon
    alignItems: 'center', // For inline icon
  },
  iconInline: {
    marginRight: 8,
  },
  paragraphText: {
    fontSize: 16,
    marginBottom: 10,
    lineHeight: 24,
    color: '#333',
  },
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 10,
    color: '#333',
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  boldText: {
    fontWeight: 'bold',
  },
  linkText: {
    color: '#007bff',
    textDecorationLine: 'underline',
  },
});

export default HelpSupp;
