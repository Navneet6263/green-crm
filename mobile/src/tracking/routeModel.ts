import type { TrackEvent } from './types';

export type Coordinate = { latitude: number; longitude: number };
export type RouteStop = { event: TrackEvent; number: number; coordinate?: Coordinate };
export type RouteModel = {
  segments: Coordinate[][]; stops: RouteStop[]; first?: Coordinate; last?: Coordinate;
  metres: number; fixes: number; rejected: number; gaps: number; partial: boolean;
};
export function coordinate(event: TrackEvent): Coordinate | undefined {
  const { latitude, longitude } = event;
  return typeof latitude === 'number' && typeof longitude === 'number' &&
    Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude } : undefined;
}
export function metresBetween(a: Coordinate, b: Coordinate) {
  const radians = Math.PI / 180;
  const sinLat = Math.sin((b.latitude - a.latitude) * radians / 2);
  const sinLng = Math.sin((b.longitude - a.longitude) * radians / 2);
  const haversine = sinLat ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * sinLng ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

// Local estimate only: never request a suggested road route or invent missing GPS.
// Filtering changes presentation, not saved evidence or the upload queue.
export function buildRoute(events: TrackEvent[], sessionId?: string, truncated = false): RouteModel {
  const selected = sessionId || events.at(-1)?.session_id;
  const seen = new Set<string>();
  const ordered = events.filter(event => {
    if (event.session_id !== selected || seen.has(event.event_id)) return false;
    seen.add(event.event_id); return true;
  }).sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at));
  const result: RouteModel = { segments: [], stops: [], metres: 0, fixes: 0, rejected: 0, gaps: 0,
    partial: truncated || (ordered.length > 0 && !ordered.some(event => event.kind === 'start')) };
  let anchor: { point: Coordinate; at: number; accuracy: number } | undefined;
  let lastFixAt: number | undefined;
  let segment: Coordinate[] | undefined;
  for (const event of ordered) {
    if (event.kind !== 'point' && event.kind !== 'reach') continue;
    const point = coordinate(event), at = Date.parse(event.captured_at);
    const good = point && Number.isFinite(at) && !event.mocked && typeof event.accuracy === 'number' &&
      Number.isFinite(event.accuracy) && event.accuracy >= 0 && event.accuracy <= 100;
    if (event.kind === 'reach') result.stops.push({ event, number: result.stops.length + 1, coordinate: good ? point : undefined });
    if (!good || !point) { result.rejected++; anchor = undefined; lastFixAt = undefined; segment = undefined; continue; }
    if (lastFixAt !== undefined && at <= lastFixAt) { result.rejected++; continue; }
    const distance = anchor ? metresBetween(anchor.point, point) : 0;
    const seconds = anchor ? (at - anchor.at) / 1000 : 0;
    if (anchor && seconds <= 180 && distance / seconds > 60) {
      result.rejected++; anchor = undefined; lastFixAt = undefined; segment = undefined; continue;
    }
    if (lastFixAt !== undefined && at - lastFixAt > 180000) { result.gaps++; anchor = undefined; segment = undefined; }
    lastFixAt = at;
    result.fixes++; result.first ??= point; result.last = point;
    if (!anchor || !segment) {
      segment = [point]; result.segments.push(segment);
      anchor = { point, at, accuracy: event.accuracy! }; continue;
    }
    // Ignore movements smaller than GPS uncertainty; keep the anchor so slow
    // walking accumulates instead of being discarded point-by-point.
    const noise = Math.max(8, Math.min(30, (anchor.accuracy + event.accuracy!) / 2));
    if (distance < noise) continue;
    result.metres += distance; segment.push(point);
    anchor = { point, at, accuracy: event.accuracy! };
  }
  return result;
}

// Bound native drawing cost without changing the full-session distance estimate
// or connecting across missing-GPS segments. Endpoints of each segment survive.
export function mapSegments(segments: Coordinate[][]) {
  const recent = segments.filter(segment => segment.length > 1).slice(-128);
  const count = recent.reduce((total, segment) => total + segment.length, 0);
  const stride = Math.max(1, Math.ceil(count / 2500));
  return recent.map(segment =>
    segment.filter((_, index) => index === 0 || index === segment.length - 1 || index % stride === 0));
}
