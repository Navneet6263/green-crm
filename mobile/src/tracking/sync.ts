import { createApiClient, ApiError, unwrap } from '../api/client';
import { API_BASE } from '../api/runtime';
import type { Session } from '../api/types';
import { loadOfflineSession } from '../auth/offlineSession';
import { acknowledge, pendingEvents, setTrackingError } from './store';
import { acknowledgedIds, ownerKey, retryDelay } from './types';
import { trackingStoreExists } from './database';

const inFlight = new Map<string, Promise<void>>();
const retries = new Map<string, { attempt: number; next: number }>();
export async function syncTracking(session?: Session, manual = false): Promise<void> {
  if (!(await trackingStoreExists())) return;
  const identity = session || await loadOfflineSession();
  if (!identity) return;
  const owner = ownerKey(identity, API_BASE);
  if (inFlight.has(owner)) return inFlight.get(owner);
  if (!manual && (retries.get(owner)?.next || 0) > Date.now()) return;
  const work = flush(identity, owner).finally(() => inFlight.delete(owner));
  inFlight.set(owner, work); return work;
}
async function flush(session: Session, owner: string) {
  try {
    for (let batch = 0; batch < 5; batch++) {
      const events = await pendingEvents(owner);
      if (!events.length) break;
      const request = createApiClient(API_BASE, { development: __DEV__, timeoutMs: 20000 });
      const result = unwrap(await request('/field-tracking/sync', session.token, { events }));
      await acknowledge(owner, acknowledgedIds(events, result));
    }
    retries.delete(owner); await setTrackingError(owner, '');
  } catch (error) {
    const attempt = (retries.get(owner)?.attempt || 0) + 1;
    retries.set(owner, { attempt, next: Date.now() + retryDelay(attempt) });
    const message = error instanceof ApiError && [401, 403].includes(error.status) ? 'Sign in to the same sales account again to upload pending locations.'
      : error instanceof ApiError && error.status === 404 ? 'Tracking API is not deployed yet. Locations are safe on this phone; ask your administrator to deploy the migration/backend.'
      : (error instanceof Error ? error.message : 'Upload failed.') + ' Pending locations remain on this phone.';
    await setTrackingError(owner, message);
    throw new Error(message);
  }
}
