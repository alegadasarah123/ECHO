import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'code' | 'reset'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleNextPhone = () => {
    if (phoneNumber.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }
    console.log('Sending code to:', phoneNumber);
    setStep('code');
  };

  const handleNextCode = () => {
    if (code.length !== 6) {
      alert('Please enter the 6-digit code.');
      return;
    }
    console.log('Code verified:', code);
    setStep('reset');
  };

  const handleDone = () => {
    if (password !== confirmPassword || password.length < 6) {
      alert('Passwords must match and be at least 6 characters long.');
      return;
    }
    console.log('Password changed to:', password);
    router.push('/Login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerBackground} />
        <View style={styles.formWrapper}>
          <View style={styles.formBox}>
            {step === 'phone' && (
              <View>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                  {'Please enter your phone number associated with your account. We\'ll send you a verification code via SMS to reset your password.'}
                </Text>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
                <TouchableOpacity style={styles.button} onPress={handleNextPhone}>
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
            {step === 'code' && (
              <View>
                <Text style={styles.title}>Enter Verification Code</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to your phone.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={setCode}
                />
                <TouchableOpacity style={styles.button} onPress={handleNextCode}>
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
            {step === 'reset' && (
              <View>
                <Text style={styles.title}>Reset Your Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity style={styles.button} onPress={handleDone}>
                  <Text style={styles.buttonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoiding: {
    flex: 1,
  },
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
    justifyContent: 'center',
    minHeight: 500,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  fieldGroup: {
    marginBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B4513',
    marginBottom: 10,
    marginTop: 55,
  },
  input: {
    borderWidth: 1,
    borderColor: '#8B4513',
    padding: 15,
    borderRadius: 25,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#2C3E50',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#8B4513',
    padding: 18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 40,
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
});

export default ForgotPasswordScreen;
