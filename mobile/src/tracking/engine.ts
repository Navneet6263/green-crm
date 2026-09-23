import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import type { Session } from '../api/types';
import { API_BASE } from '../api/runtime';
import { beginTrip, endTrip, getActive, recordFix, setTrackingError, snapshot } from './store';
import { MAX_TRIP_MS, ownerKey } from './types';
import { trackingStoreExists } from './database';
import { requireActiveApp, trackingAccess, setupTrackingPermissions } from './permissions';
import { nativeServiceHealth, waitForNativeService } from './nativeService';
import { describeTracking } from './status';
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
  const owner = ownerKey(session, API_BASE);
  let state = await snapshot(owner);
  const access = await trackingAccess();
  let registered = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
  const expired = state.active && Date.now() > Date.parse(state.active.startedAt) + MAX_TRIP_MS;
  if ((state.active || registered) && (!access.ready || !access.services || expired)) {
    const reason = expired ? '12-hour safety limit' : 'Tracking stopped because location permission or phone location was turned off. Saved events are kept.';
    await stopTracking(reason);
    if (state.active && !expired) await setTrackingError(owner, reason);
    state = await snapshot(owner); registered = false;
  }
  const health = await nativeServiceHealth();
  return describeTracking({ ...state, serviceError: health?.error || '' }, access, registered && (health?.running ?? true));
}
export const prepareTracking = () => exclusive(setupTrackingPermissions);
export async function reconcileTracking(session: Session) {
  if (await trackingStoreExists()) await trackingState(session);
}
export function startTracking(session: Session) {
  return exclusive(async () => {
    requireActiveApp();
    const startedGeneration = generation;
    const checkCancelled = () => {
      if (startedGeneration !== generation) throw new Error('Start was cancelled by a stop/sign-out action.');
      requireActiveApp();
    };
    if (!(await TaskManager.isAvailableAsync())) throw new Error('Background tracking needs a native development build, not Expo Go or a browser.');
    const access = await trackingAccess();
    if (!access.services) throw new Error('Turn on the phone location service.');
    if (!access.ready) throw new Error('Complete Set up location first, return to GreenCRM, then tap Start tracking.');
    await nativeServiceHealth(); // An old binary must fail safely BEFORE creating a trip.
    checkCancelled();
    const trip = await beginTrip(ownerKey(session, API_BASE));
    try {
      checkCancelled();
      await Location.startLocationUpdatesAsync(TASK_NAME, {
        accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 30,
        pausesUpdatesAutomatically: false, showsBackgroundLocationIndicator: true,
        foregroundService: { notificationTitle: 'GreenCRM tracking is ON', notificationBody: 'Your sales route is being recorded. Open GreenCRM to stop.', killServiceOnDestroy: true },
      });
      await waitForNativeService(checkCancelled);
      checkCancelled();
      // Only the background task writes passive fixes; no competing one-shot GPS request.
    } catch (error) {
      await stopTracking('Could not start location service').catch(() => {});
      await setTrackingError(trip.owner, error instanceof Error ? error.message : 'Tracking could not start.').catch(() => {});
      throw error;
    }
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
    const access = await trackingAccess();
    if (!access.ready || !access.services) throw new Error('Location access changed. Stop this session and set up location again.');
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
