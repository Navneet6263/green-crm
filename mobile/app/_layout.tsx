import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '../src/auth/SessionProvider';
import { Button, Notice } from '../src/ui/components';
import { colors } from '../src/ui/theme';
import '../src/tracking/background';
import { TrackingSync } from '../src/tracking/TrackingSync';
import { BrandedLoading } from '../src/ui/Brand';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigation() {
  const { session, restoring, restoreError, restore, signOut } = useSession();
  useEffect(() => { void SplashScreen.hideAsync().catch(() => {}); }, []);
  if (restoring) return <BrandedLoading />;
  if (restoreError) return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 18 }}>
    <Notice error message={`Your saved session could not be checked. ${restoreError}`} /><Button title="Retry connection" onPress={() => void restore()} />
    <Button secondary title="Forget saved login" onPress={() => void signOut().catch(() => Alert.alert('Storage unavailable', 'Could not remove the saved login. Please retry.'))} /></View>;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
    <Stack.Protected guard={!session}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={Boolean(session)}><Stack.Screen name="(tabs)" /><Stack.Screen name="notifications" /><Stack.Screen name="leads/[id]" /><Stack.Screen name="leads/new" /><Stack.Screen name="tasks/new" /></Stack.Protected>
  </Stack>;
}
export default function RootLayout() {
  return <SafeAreaProvider><SessionProvider><TrackingSync /><StatusBar style="dark" /><Navigation /></SessionProvider></SafeAreaProvider>;
}
