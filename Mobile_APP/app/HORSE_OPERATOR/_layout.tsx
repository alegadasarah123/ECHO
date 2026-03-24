import { Stack } from 'expo-router'

export default function OperatorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="addhorse" options={{ title: 'Add Horse' }} />
      <Stack.Screen name="Hallprofile" options={{ title: 'All Profile' }} />
      <Stack.Screen name="Hbook" options={{ title: 'Horse Book' }} />
      <Stack.Screen name="Hbook2" options={{ title: 'Horse Book 2' }} />
      <Stack.Screen name="Hcalendar" options={{ title: 'Calendar' }} />
      <Stack.Screen name="helpsupp" options={{ title: 'Help & Support' }} />
      <Stack.Screen name="Hfeed" options={{ title: 'Horse Feed' }} />
      <Stack.Screen name="Hfeedlog" options={{ title: 'Horse Feeding Log' }} />
      <Stack.Screen name="Hmessage" options={{ title: 'Horse Message' }} />
      <Stack.Screen name="Hnotif" options={{ title: 'Horse Notifications' }} />
      <Stack.Screen name="home" options={{ title: 'Home' }} />
      <Stack.Screen name="horse" options={{ title: 'Horse' }} />
      <Stack.Screen name="horsedeathinput" options={{ title: 'Horse Death Report' }} />
      <Stack.Screen name="horsehandling" options={{ title: 'Horse Handling' }} />
      <Stack.Screen name="horseprofile" options={{ title: 'Horse Profile' }} />
      <Stack.Screen name="Hsos" options={{ title: 'Horse SOS' }} />
      <Stack.Screen name="Hvetprofile" options={{ title: 'Horse Vet Profile' }} />
      <Stack.Screen name="kutsero" options={{ title: 'Kutsero' }} />
      <Stack.Screen name="kutseroprofile" options={{ title: 'Kutsero Profile' }} />
      <Stack.Screen name="medical" options={{ title: 'Medical' }} />
      <Stack.Screen name="medicalrec" options={{ title: 'Medical Record' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="profileinfo" options={{ title: 'Profile Info' }} />
      <Stack.Screen name="resched" options={{ title: 'Reschedule' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms' }} />
      <Stack.Screen name="treatment" options={{ title: 'Treatment Log' }} />
      <Stack.Screen name="water" options={{ title: 'Water' }} />
      <Stack.Screen name="waterlog" options={{ title: 'Water Log' }} />
    </Stack>
  )
}