import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { Session } from '../api/types';
import { API_BASE } from '../api/runtime';
import { beginTrip, endTrip, getActive, recordFix, setTrackingError, snapshot } from './store';
import { MAX_TRIP_MS, ownerKey } from './types';
import { trackingStoreExists } from './database';
export { syncTracking } from './sync';
export const TASK_NAME = 'greencrm-sales-route-v1';
export const nativeTracking = true;
let operation: Promise<unknown> | null = null;
let generation = 0;
function exclusive<T>(action: () => Promise<T>): Promise<T> {
  if (operation) return Promise.reject(new Error('A tracking action is in progress. Please wait.'));
  const work = action().finally(() => { operation = null; }); operation = work; return work;
}
export async function trackingState(session: Session) {
  const state = await snapshot(ownerKey(session, API_BASE));
  const running = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  if (state.active && Date.now() > Date.parse(state.active.startedAt) + MAX_TRIP_MS) { await stopTracking('12-hour safety limit'); return { ...await snapshot(ownerKey(session, API_BASE)), running: false }; }
  return { ...state, running };
}
export function startTracking(session: Session) {
  return exclusive(async () => {
    const startedGeneration = generation;
    if (!(await TaskManager.isAvailableAsync())) throw new Error('Background tracking needs a native development build, not Expo Go or a browser.');
    if (!(await Location.hasServicesEnabledAsync())) throw new Error('Turn on the phone location service.');
    if (!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error('Location permission is required to record your route.');
    if (!(await Location.requestBackgroundPermissionsAsync()).granted) throw new Error('Allow background/Always location in phone settings, then start again. No tracking has started.');
    if (startedGeneration !== generation) throw new Error('Start was cancelled by a stop/sign-out action.');
    const trip = await beginTrip(ownerKey(session, API_BASE));
    try {
      if (startedGeneration !== generation) { await stopTracking('Start cancelled'); return; }
      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 30,
        pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
        foregroundService: { notificationTitle: 'GreenCRM tracking is ON', notificationBody: 'Your sales route is being recorded. Open GreenCRM to stop.', killServiceOnDestroy: true },
      });
      if (startedGeneration !== generation) { await stopTracking('Start cancelled'); return; }
      // The ongoing route does not depend on obtaining an immediate first fix.
      void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then(fix => recordFix(trip, fix)).catch(error => setTrackingError(trip.owner, error.message));
    } catch (error) { await stopTracking('Could not start location service'); throw error; }
  });
}
export async function stopTracking(reason = 'Stopped by employee') {
  generation++;
  // Disable OS collection first even if the offline database is unavailable.
  if (await Location.hasStartedLocationUpdatesAsync(TASK_NAME)) await Location.stopLocationUpdatesAsync(TASK_NAME);
  if (await trackingStoreExists()) await endTrip(reason);
}
export function markReached(session: Session, label: string) {
  return exclusive(async () => {
    if (!label.trim() || label.trim().length > 160) throw new Error('Enter the store/location name (up to 160 characters).');
    const trip = await getActive();
    if (!trip || trip.owner !== ownerKey(session, API_BASE)) throw new Error('Start your tracking session first.');
    if (Date.now() > Date.parse(trip.startedAt) + MAX_TRIP_MS) { await stopTracking('12-hour safety limit'); throw new Error('This session reached the 12-hour limit. Start a new session.'); }
    const fix = await freshPosition();
    await recordFix(trip, fix, label.trim());
  });
}
async function freshPosition() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('GPS timed out. Move outdoors and try Reached again.')), 25000); }),
    ]);
  } finally { clearTimeout(timer); }
}
