import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define proper types for the location datatype
type LocationData = {
  [province: string]: {
    cities: {
      [city: string]: {
        municipalities: string[];
        barangays: {
          [municipality: string]: string[];
        };
      };
    };
  };
};

// Define types for route data
type RouteData = {
  [route: string]: string[];
};

const SignupScreen = () => {
  const router = useRouter();

  // Inputs
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [facebook, setFacebook] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [houseAddress, setHouseAddress] = useState('');

  // Selectors
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [selectedBarangay, setSelectedBarangay] = useState('');
  const [selectedSex, setSelectedSex] = useState('');
  const [selectedRouteTo, setSelectedRouteTo] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const locationData: LocationData = {
    cebu: {
      cities: {
        'Cebu City': {
          municipalities: ['Talamban', 'Lahug'],
          barangays: {
            Talamban: ['Barangay 1', 'Barangay 2'],
            Lahug: ['Barangay 3', 'Barangay 4'],
          },
        },
        'Mandaue City': {
          municipalities: ['Tipolo', 'Centro'],
          barangays: {
            Tipolo: ['Barangay 5', 'Barangay 6'],
            Centro: ['Barangay 7', 'Barangay 8'],
          },
        },
      },
    },
    bohol: {
      cities: {
        Tagbilaran: {
          municipalities: ['Bool', 'Cogon'],
          barangays: {
            Bool: ['Barangay 9', 'Barangay 10'],
            Cogon: ['Barangay 11', 'Barangay 12'],
          },
        },
      },
    },
  };

  const routeData: RouteData = {
    Ayala: ['Colon', 'SM City', 'IT Park'],
    'SM City': ['Ayala', 'Colon', 'IT Park'],
    Colon: ['Ayala', 'SM City', 'IT Park'],
    'IT Park': ['Ayala', 'SM City', 'Colon'],
  };

  const handleNext = async () => {
    // Validation checks
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Error', 'Please enter your last name.');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number.');
      return;
    }
    if (!selectedSex) {
      Alert.alert('Error', 'Please select your sex.');
      return;
    }
    if (!selectedProvince) {
      Alert.alert('Error', 'Please select your province.');
      return;
    }
    if (!selectedCity) {
      Alert.alert('Error', 'Please select your city.');
      return;
    }
    if (!selectedMunicipality) {
      Alert.alert('Error', 'Please select your municipality.');
      return;
    }
    if (!selectedBarangay) {
      Alert.alert('Error', 'Please select your barangay.');
      return;
    }
    if (!zipCode.trim()) {
      Alert.alert('Error', 'Please enter your zip code.');
      return;
    }
    if (!houseAddress.trim()) {
      Alert.alert('Error', 'Please enter your house number or street address.');
      return;
    }
    if (!selectedRoute) {
      Alert.alert('Error', 'Please select your route.');
      return;
    }
    if (!selectedRouteTo) {
      Alert.alert('Error', 'Please select your destination.');
      return;
    }
    // Email validation (if provided)
    if (email.trim() && !isValidEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    try {
      const data = {
        firstName,
        middleName,
        lastName,
        phoneNumber,
        email,
        facebook,
        zipCode,
        houseAddress,
        dob: dob.toISOString(),
        sex: selectedSex,
        province: selectedProvince,
        city: selectedCity,
        municipality: selectedMunicipality,
        barangay: selectedBarangay,
        route: selectedRoute,
        routeTo: selectedRouteTo,
      };
      await AsyncStorage.setItem('signupData', JSON.stringify(data));
      router.push('/signup2');
    } catch (error) {
      Alert.alert('Error', 'Failed to save your data. Please try again.');
      console.error('AsyncStorage error:', error);
    }
  };

  // Helper functions to safely access nested data
  const getCities = () => {
    if (!selectedProvince || !locationData[selectedProvince]) return [];
    return Object.keys(locationData[selectedProvince].cities);
  };

  const getMunicipalities = () => {
    if (!selectedProvince || !selectedCity || !locationData[selectedProvince]?.cities[selectedCity]) return [];
    return locationData[selectedProvince].cities[selectedCity].municipalities;
  };

  const getBarangays = () => {
    if (!selectedProvince || !selectedCity || !selectedMunicipality ||
        !locationData[selectedProvince]?.cities[selectedCity]?.barangays[selectedMunicipality]) return [];
    return locationData[selectedProvince].cities[selectedCity].barangays[selectedMunicipality];
  };

  const getRouteToOptions = () => {
    if (!selectedRoute || !routeData[selectedRoute]) return [];
    return routeData[selectedRoute];
  };

  // Email validation helper function
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerBackground} />
        <View style={styles.formWrapper}>
          <ScrollView
            contentContainerStyle={styles.formBox}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={styles.progressDots}>
                <View style={[styles.dot, styles.activeDot]} />
                <View style={[styles.dot, styles.inactiveDot]} />
                <View style={[styles.dot, styles.inactiveDot]} />
              </View>
            </View>
            <View style={styles.header}>
              <Text style={styles.title}>Tell us about yourself</Text>
              <Text style={styles.subtitle}>Please complete the information below.</Text>
            </View>
            {/* Name Inputs */}
            <View style={styles.section}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput style={styles.input} placeholder="First Name" value={firstName} onChangeText={setFirstName} />
              <TextInput style={styles.input} placeholder="Middle Name" value={middleName} onChangeText={setMiddleName} />
              <TextInput style={styles.input} placeholder="Last Name" value={lastName} onChangeText={setLastName} />
            </View>
            {/* Date of Birth */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputWithIcon}>
                <Text style={styles.dateText}>
                  {dob.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <FontAwesome name="calendar" size={20} color="#8B4513" style={styles.iconRight} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dob}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setDob(selectedDate);
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>
            {/* Sex */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Sex</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={selectedSex} onValueChange={setSelectedSex} style={styles.picker}>
                  <Picker.Item label="Please Select" value="" />
                  <Picker.Item label="Male" value="male" />
                  <Picker.Item label="Female" value="female" />
                </Picker>
              </View>
            </View>
            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Your Contact Number"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
            {/* Address */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ADDRESS IN THE PHILIPPINES</Text>
              {/* Province */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Province</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedProvince}
                    onValueChange={(value) => {
                      setSelectedProvince(value);
                      setSelectedCity('');
                      setSelectedMunicipality('');
                      setSelectedBarangay('');
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Please Select" value="" />
                    {Object.keys(locationData).map((prov) => (
                      <Picker.Item key={prov} label={prov.toUpperCase()} value={prov} />
                    ))}
                  </Picker>
                </View>
              </View>
              {/* City */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>City</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedCity}
                    onValueChange={(value) => {
                      setSelectedCity(value);
                      setSelectedMunicipality('');
                      setSelectedBarangay('');
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Please Select" value="" />
                    {getCities().map((city) => (
                      <Picker.Item key={city} label={city} value={city} />
                    ))}
                  </Picker>
                </View>
              </View>
              {/* Municipality */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Municipality</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedMunicipality}
                    onValueChange={(value) => {
                      setSelectedMunicipality(value);
                      setSelectedBarangay('');
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Please Select" value="" />
                    {getMunicipalities().map((mun) => (
                      <Picker.Item key={mun} label={mun} value={mun} />
                    ))}
                  </Picker>
                </View>
              </View>
              {/* Barangay */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Barangay</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={selectedBarangay} onValueChange={setSelectedBarangay} style={styles.picker}>
                    <Picker.Item label="Please Select" value="" />
                    {getBarangays().map((brgy) => (
                      <Picker.Item key={brgy} label={brgy} value={brgy} />
                    ))}
                  </Picker>
                </View>
              </View>
              {/* Zip Code */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Zip Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Zip Code"
                  keyboardType="number-pad"
                  value={zipCode}
                  onChangeText={setZipCode}
                />
              </View>
              {/* Street */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>House Number or Street Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="House No. or Street"
                  value={houseAddress}
                  onChangeText={setHouseAddress}
                />
              </View>
            </View>
            {/* Routes */}
            <View style={styles.section}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Route</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedRoute}
                    onValueChange={(value) => {
                      setSelectedRoute(value);
                      setSelectedRouteTo(''); // Reset 'To' when 'Route' changes
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Please Select" value="" />
                    {Object.keys(routeData).map((route) => (
                      <Picker.Item key={route} label={route} value={route} />
                    ))}
                  </Picker>
                </View>
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>To</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={selectedRouteTo} onValueChange={setSelectedRouteTo} style={styles.picker}>
                    <Picker.Item label="Please Select" value="" />
                    {getRouteToOptions().map((destination) => (
                      <Picker.Item key={destination} label={destination} value={destination} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
            {/* Email & Facebook */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email (if any)</Text>
              <TextInput
                style={styles.input}
                placeholder="Your Email"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Facebook</Text>
              <TextInput
                style={styles.input}
                placeholder="Your Facebook"
                value={facebook}
                onChangeText={setFacebook}
              />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/Login')} style={styles.loginWrapper}>
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.signupLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  keyboardAvoiding: { flex: 1 },
  headerBackground: {
    height: 380,
    backgroundColor: '#CD853F',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 50,
  },
  formWrapper: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -330,
    marginBottom: 40,
    marginLeft: 25,
    marginRight: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  formBox: {
    padding: 30,
    paddingBottom: 40,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#007AFF',
  },
  inactiveDot: {
    backgroundColor: '#D1D1D6',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B4513',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8B4513',
    padding: 15,
    borderRadius: 25,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#000',
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#8B4513',
    borderRadius: 25,
    backgroundColor: '#FAFAFA',
  },
  picker: {
    height: 50,
    color: '#2C3E50',
  },
  button: {
    backgroundColor: '#8B4513',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    shadowColor: '#8B4513',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#8B4513',
    fontSize: 14,
  },
  signupLink: {
    color: '#8B4513',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#8B4513',
    padding: 15,
    borderRadius: 25,
    backgroundColor: '#FAFAFA',
  },
  dateText: {
    fontSize: 16,
    color: '#000',
  },
  iconRight: {
    marginLeft: 10,
    color: '#000',
  },
});

export default SignupScreen;
