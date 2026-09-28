import type { Session } from '../api/types';
export const MAX_TRIP_MS = 12 * 60 * 60 * 1000;
export type TrackEvent = { event_id: string; session_id: string; device_id: string; kind: 'start' | 'point' | 'reach' | 'stop'; captured_at: string;
  latitude?: number; longitude?: number; accuracy?: number; mocked?: boolean; label?: string; consent_version?: number };
export type ActiveTrip = { owner: string; sessionId: string; deviceId: string; startedAt: string };
export type StoredEvent = { event_id: string; payload: string; synced: number };
export type TrackingStatus = 'off' | 'permission_required' | 'location_off' | 'interrupted' | 'waiting_gps' | 'recording' | 'gps_idle' | 'update_required';
export type TrackState = { active: ActiveTrip | null; pending: number; events: TrackEvent[]; error: string; running?: boolean; routeTruncated?: boolean;
  status?: TrackingStatus; lastFixAt?: string; serviceError?: string; buildSupported?: boolean; access?: { foreground: boolean; background: boolean; services: boolean; ready: boolean } };
export function ownerKey(session: Session, base: string) {
  if (!session.user.company_id || !session.user.user_id) throw new Error('Your company/user identity is missing. Sign in again before tracking.');
  return JSON.stringify([base, session.user.company_id, session.user.user_id]);
}
export function acknowledgedIds(sent: TrackEvent[], payload: unknown) {
  const ids = (payload as { acknowledged?: unknown })?.acknowledged;
  if (!Array.isArray(ids) || ids.length !== sent.length || new Set(ids).size !== ids.length || !sent.every(event => ids.includes(event.event_id))) throw new Error('Upload acknowledgement incomplete. Locations remain on this phone.');
  return ids as string[];
}
export const retryDelay = (attempt: number) => Math.min(300000, 5000 * 2 ** Math.min(attempt, 6));
