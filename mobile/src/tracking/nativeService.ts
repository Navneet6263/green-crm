import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type ServiceHealth = { running: boolean; error: string };
type LocationBridge = { getGreenCrmServiceHealthAsync?: () => Promise<ServiceHealth> };

export async function nativeServiceHealth(): Promise<ServiceHealth | null> {
  if (Platform.OS !== 'android') return null;
  const bridge = requireOptionalNativeModule<LocationBridge>('ExpoLocation');
  if (!bridge?.getGreenCrmServiceHealthAsync) {
    throw new Error('This Android build needs the tracking safety update. Install the new APK over this app; do not uninstall or clear pending routes.');
  }
  return bridge.getGreenCrmServiceHealthAsync();
}

export async function waitForNativeService(checkCancelled: () => void) {
  for (let attempt = 0; attempt < 40; attempt++) {
    checkCancelled();
    const health = await nativeServiceHealth();
    if (!health || health.running) return;
    if (health.error) throw new Error(`Android could not start tracking: ${health.error}`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Android did not confirm the tracking service. Keep GreenCRM open and try Start tracking again.');
}
