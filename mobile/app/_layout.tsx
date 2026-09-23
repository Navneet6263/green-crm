import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import { Button, Notice } from '../src/ui/components';
import { colors } from '../src/ui/theme';
import '../src/tracking/background';
import { TrackingSync } from '../src/tracking/TrackingSync';

function Navigation() {
  const { session, restoring, restoreError, restore, signOut } = useSession();
  if (restoring) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}><ActivityIndicator size="large" color={colors.green} /></View>;
  if (restoreError) return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 18 }}>
    <Notice error message={`Your saved session could not be checked. ${restoreError}`} /><Button title="Retry connection" onPress={() => void restore()} />
    <Button secondary title="Forget saved login" onPress={() => void signOut().catch(() => Alert.alert('Storage unavailable', 'Could not remove the saved login. Please retry.'))} /></View>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Protected guard={!session}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={Boolean(session)}><Stack.Screen name="(tabs)" /><Stack.Screen name="leads/[id]" /><Stack.Screen name="leads/new" /><Stack.Screen name="tasks/new" /></Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><TrackingSync /><StatusBar style="dark" /><Navigation /></SessionProvider></SafeAreaProvider>;
}
