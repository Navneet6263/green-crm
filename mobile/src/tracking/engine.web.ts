import type { Session } from '../api/types';
import type { TrackState } from './types';
export const nativeTracking = false;
export const TASK_NAME = 'greencrm-sales-route-v1';
export const trackingState = async (_session: Session): Promise<TrackState> => ({ active: null, pending: 0, events: [], error: '', running: false });
export const startTracking = async (_session: Session) => { throw new Error('Use the Android/iOS app for offline background tracking.'); };
export const markReached = async (_session: Session, _label: string) => { throw new Error('Use the Android/iOS app to mark reached locations.'); };
export const stopTracking = async (_reason?: string) => {};
export const syncTracking = async (_session?: Session, _manual?: boolean) => {};
