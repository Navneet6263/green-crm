import type { TrackState, TrackingStatus } from './types';
import type { TrackingAccess } from './permissions';

export function describeTracking(state: TrackState, access: TrackingAccess, running: boolean, now = Date.now()) {
  const lastFixAt = state.active ? state.events
    .filter(event => event.session_id === state.active!.sessionId && (event.kind === 'point' || event.kind === 'reach'))
    .map(event => event.captured_at).sort().at(-1) : undefined;
  let status: TrackingStatus;
  if (!access.ready) status = 'permission_required';
  else if (!access.services) status = 'location_off';
  else if (!state.active) status = 'off';
  else if (!running) status = 'interrupted';
  else if (!lastFixAt) status = 'waiting_gps';
  else if (now - Date.parse(lastFixAt) > 180000) status = 'gps_idle';
  else status = 'recording';
  return { ...state, access, running: access.ready && access.services && running, status, lastFixAt };
}

export const trackingLabels: Record<TrackingStatus, string> = {
  off: 'OFF', permission_required: 'Permission needed', location_off: 'Location OFF',
  interrupted: 'Interrupted', waiting_gps: 'Waiting for GPS', recording: 'Recording', gps_idle: 'No recent GPS',
};
