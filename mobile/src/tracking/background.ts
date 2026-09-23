import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import { getActive, recordFix, setTrackingError } from './store';
import { TASK_NAME, stopTracking } from './engine';
import { MAX_TRIP_MS } from './types';
import { syncTracking } from './sync';
import { trackingAccess } from './permissions';
// Must be imported at module scope, including when Expo starts a headless task.
TaskManager.defineTask<{ locations: LocationObject[] }>(TASK_NAME, async ({ data, error }) => {
  let trip: Awaited<ReturnType<typeof getActive>> = null;
  try {
    trip = await getActive();
    if (!trip) { await stopTracking('No active consented session'); return; }
    const access = await trackingAccess();
    if (!access.ready || !access.services) throw new Error('Location permission or phone location is off. Open the app to set up tracking again.');
    if (error) throw new Error('Location service error. Check permissions and restart tracking.');
    for (const fix of (data?.locations || []).sort((a, b) => a.timestamp - b.timestamp)) await recordFix(trip, fix);
    if (Date.now() >= Date.parse(trip.startedAt) + MAX_TRIP_MS) await stopTracking('12-hour safety limit');
  } catch (failure) {
    // Storage/GPS failures must not leave collection running without a durable queue.
    await stopTracking('Tracking paused after a location/storage error').catch(() => {});
    if (trip) await setTrackingError(trip.owner, failure instanceof Error ? failure.message : 'Tracking could not save. Open the app to check storage.').catch(() => {});
    return;
  }
  // A network outage must NOT stop offline collection.
  await syncTracking().catch(() => {});
});
