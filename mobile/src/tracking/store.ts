import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';
import { trackingDb, trackingTransaction } from './database';
import { MAX_TRIP_MS, type ActiveTrip, type StoredEvent, type TrackEvent } from './types';

async function meta<T>(db: SQLiteDatabase, key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM tracking_meta WHERE key=?', key);
  return row ? JSON.parse(row.value) : null;
}
export async function getActive() { return meta<ActiveTrip>(await trackingDb(), 'active'); }
async function insert(db: SQLiteDatabase, owner: string, event: TrackEvent) {
  await db.runAsync('INSERT OR IGNORE INTO tracking_events(owner,event_id,session_id,payload,stored_at) VALUES(?,?,?,?,?)', owner, event.event_id, event.session_id, JSON.stringify(event), Date.now());
}
export async function beginTrip(owner: string): Promise<ActiveTrip> {
  const db = await trackingDb();
  let trip!: ActiveTrip;
  await trackingTransaction(async tx => {
    if (await meta(tx, 'active')) throw new Error('A tracking session already exists. Stop it before starting another.');
    const pending = await tx.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM tracking_events WHERE owner=? AND synced=0', owner);
    if ((pending?.count || 0) >= 50000) throw new Error('The offline queue is full. Upload pending locations before starting.');
    let deviceId = await meta<string>(tx, 'device');
    if (!deviceId) { deviceId = Crypto.randomUUID(); await tx.runAsync('INSERT INTO tracking_meta(key,value) VALUES(?,?)', 'device', JSON.stringify(deviceId)); }
    trip = { owner, deviceId, sessionId: Crypto.randomUUID(), startedAt: new Date().toISOString() };
    await insert(tx, owner, { event_id: Crypto.randomUUID(), session_id: trip.sessionId, device_id: deviceId, kind: 'start', captured_at: trip.startedAt, consent_version: 1 });
    await tx.runAsync('INSERT INTO tracking_meta(key,value) VALUES(?,?)', 'active', JSON.stringify(trip));
    await tx.runAsync('DELETE FROM tracking_meta WHERE key=?', `error:${owner}`);
  });
  return trip;
}
export async function endTrip(label = 'Stopped by employee') {
  const db = await trackingDb();
  await trackingTransaction(async tx => {
    const trip = await meta<ActiveTrip>(tx, 'active');
    if (!trip) return;
    const last = await tx.getFirstAsync<{ captured_at: string | null }>("SELECT MAX(json_extract(payload,'$.captured_at')) AS captured_at FROM tracking_events WHERE owner=? AND session_id=?", trip.owner, trip.sessionId);
    // Device clock corrections must not place Stop before an already saved GPS fix.
    const latest = last?.captured_at ? Date.parse(last.captured_at) : Date.parse(trip.startedAt);
    const at = Math.min(Date.parse(trip.startedAt) + MAX_TRIP_MS, Math.max(Date.parse(trip.startedAt), Date.now(), latest));
    await insert(tx, trip.owner, { event_id: Crypto.randomUUID(), session_id: trip.sessionId, device_id: trip.deviceId, kind: 'stop', captured_at: new Date(at).toISOString(), label });
    await tx.runAsync('DELETE FROM tracking_meta WHERE key=?', 'active');
  });
}
export async function recordFix(trip: ActiveTrip, fix: { timestamp: number; coords: { latitude: number; longitude: number; accuracy: number | null }; mocked?: boolean }, label?: string) {
  const { latitude, longitude, accuracy } = fix.coords;
  if (![latitude, longitude, accuracy, fix.timestamp].every(value => typeof value === 'number' && Number.isFinite(value)) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy! < 0 || accuracy! > 10000) throw new Error('GPS fix unavailable. Move outdoors and try again.');
  if (label !== undefined && (!label.trim() || label.length > 160 || accuracy! > 100 || fix.mocked || Math.abs(Date.now() - fix.timestamp) > 30000)) throw new Error('Reached needs a name and a fresh, non-mocked GPS fix within 100 metres accuracy.');
  const started = Date.parse(trip.startedAt);
  if (fix.timestamp < started || fix.timestamp > started + MAX_TRIP_MS || fix.timestamp > Date.now() + 300000) {
    if (label !== undefined) throw new Error('This GPS fix is outside the active session. Please try again.');
    return;
  }
  const db = await trackingDb();
  await trackingTransaction(async tx => {
    const current = await meta<ActiveTrip>(tx, 'active');
    if (current?.sessionId !== trip.sessionId || current.owner !== trip.owner) {
      if (label !== undefined) throw new Error('Tracking has stopped. Start a session before marking reached.');
      return;
    }
    const count = await tx.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM tracking_events WHERE owner=? AND synced=0', trip.owner);
    if ((count?.count || 0) >= 50000) throw new Error('Offline queue full. Stop tracking and upload pending locations.');
    await insert(tx, trip.owner, { event_id: Crypto.randomUUID(), session_id: trip.sessionId, device_id: trip.deviceId, kind: label === undefined ? 'point' : 'reach',
      captured_at: new Date(fix.timestamp).toISOString(), latitude, longitude, accuracy: accuracy!, mocked: fix.mocked === true, ...(label === undefined ? {} : { label: label.trim() }) });
  });
}
export async function pendingEvents(owner: string) {
  const rows = await (await trackingDb()).getAllAsync<StoredEvent>('SELECT event_id,payload,synced FROM tracking_events WHERE owner=? AND synced=0 ORDER BY seq LIMIT 100', owner);
  return rows.map(row => JSON.parse(row.payload) as TrackEvent);
}
export async function acknowledge(owner: string, ids: string[]) {
  const db = await trackingDb();
  await trackingTransaction(async tx => {
    for (const id of ids) await tx.runAsync('UPDATE tracking_events SET synced=1 WHERE owner=? AND event_id=?', owner, id);
    // Uploaded history remains on server; retain seven days locally, never purge pending.
    await tx.runAsync('DELETE FROM tracking_events WHERE owner=? AND synced=1 AND stored_at<? AND session_id NOT IN (SELECT json_extract(value,\'$.sessionId\') FROM tracking_meta WHERE key=\'active\')', owner, Date.now() - 7 * 86400000);
  });
}
export async function setTrackingError(owner: string, message: string) { await (await trackingDb()).runAsync('INSERT OR REPLACE INTO tracking_meta(key,value) VALUES(?,?)', `error:${owner}`, JSON.stringify(message)); }
export async function snapshot(owner: string) {
  const db = await trackingDb();
  const active = await getActive();
  const pending = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM tracking_events WHERE owner=? AND synced=0', owner);
  const ownActive = active?.owner === owner ? active : null;
  const latest = ownActive ? null : await db.getFirstAsync<{ session_id: string }>('SELECT session_id FROM tracking_events WHERE owner=? ORDER BY seq DESC LIMIT 1', owner);
  const sessionId = ownActive?.sessionId || latest?.session_id;
  // Read the selected session, not a mixed 500-event tail. A defensive cap is
  // explicitly surfaced; incomplete local history must never claim a full trip.
  const rows = sessionId ? await db.getAllAsync<StoredEvent>('SELECT event_id,payload,synced FROM tracking_events WHERE owner=? AND session_id=? ORDER BY seq DESC LIMIT 50001', owner, sessionId) : [];
  const routeTruncated = rows.length > 50000;
  return { active: ownActive, pending: pending?.count || 0, routeTruncated,
    events: rows.slice(0, 50000).map(row => JSON.parse(row.payload) as TrackEvent).reverse(), error: await meta<string>(db, `error:${owner}`) || '' };
}
