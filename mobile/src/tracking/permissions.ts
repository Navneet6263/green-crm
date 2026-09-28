import { AppState, Linking } from 'react-native';
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

// Wait for the permission activity to finish; never start a service from Settings.
export async function waitForActiveApp(timeoutMs = 30000) {
  if (AppState.currentState === 'active') return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { listener.remove(); reject(new Error('Return to the app and tap Start tracking again.')); }, timeoutMs);
    const listener = AppState.addEventListener('change', next => {
      if (next === 'active') { clearTimeout(timer); listener.remove(); resolve(); }
    });
    if (AppState.currentState === 'active') { clearTimeout(timer); listener.remove(); resolve(); }
  });
}

// Called only by an explicit Start. Does not itself create a trip or record GPS.
export async function setupTrackingPermissions(checkCancelled: () => void = () => {}) {
  requireActiveApp();
  let foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) {
    if (!foreground.canAskAgain) { await Linking.openSettings(); throw new Error('Allow location in Settings, then return and tap Start tracking.'); }
    foreground = await Location.requestForegroundPermissionsAsync();
    await waitForActiveApp(); checkCancelled();
    if (!foreground.granted) throw new Error('Location not allowed. Tap Start tracking when you are ready.');
  }
  checkCancelled();
  let background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted) {
    if (!background.canAskAgain) { await Linking.openSettings(); throw new Error('Choose Always / Allow all the time, then return and tap Start tracking.'); }
    background = await Location.requestBackgroundPermissionsAsync();
    await waitForActiveApp(); checkCancelled();
    // Read again after Settings; the activity result can contain the previous grant.
    background = await Location.getBackgroundPermissionsAsync();
    if (!background.granted) throw new Error('Allow all the time / Always is needed to continue your route with the screen locked.');
  }
  requireActiveApp(); checkCancelled();
}
