import { AppState } from 'react-native';
import * as Location from 'expo-location';

export type TrackingAccess = { foreground: boolean; background: boolean; services: boolean; ready: boolean };

export function requireActiveApp() {
  if (AppState.currentState !== 'active') throw new Error('Return to GreenCRM, then tap Start tracking. Tracking cannot start from Settings or the background.');
}

export async function trackingAccess(): Promise<TrackingAccess> {
  const [foreground, background, services] = await Promise.all([
    Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync(), Location.hasServicesEnabledAsync(),
  ]);
  return { foreground: foreground.granted, background: background.granted, services, ready: foreground.granted && background.granted };
}

// Permission setup NEVER creates a trip or starts GPS recording.
export async function setupTrackingPermissions() {
  requireActiveApp();
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw new Error('Location was not allowed. You can still use leads and tasks. Enable location in Settings when you want to track a route.');
  requireActiveApp();
  const background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted) await Location.requestBackgroundPermissionsAsync();
  // Android may still be showing Settings here. The explicit Start button is a separate action.
}
