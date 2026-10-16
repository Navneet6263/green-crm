// Port of mobile/src/tracking/routeModel.ts so the web dashboard and the app
// report the same distance for a trip. Keep both in sync when changing rules.

function coordinate(event) {
  const latitude = Number(event.latitude);
  const longitude = Number(event.longitude);
  return event.latitude !== null && event.longitude !== null &&
    Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude } : undefined;
}

function metresBetween(a, b) {
  const radians = Math.PI / 180;
  const sinLat = Math.sin((b.latitude - a.latitude) * radians / 2);
  const sinLng = Math.sin((b.longitude - a.longitude) * radians / 2);
  const haversine = sinLat ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * sinLng ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

const timeOf = (event) => new Date(event.captured_at).getTime();

// Events must belong to one session. Mocked, inaccurate (>100 m) and implausible
// (>60 m/s) fixes are excluded from distance; gaps over three minutes split the route.
function buildRoute(events) {
  const seen = new Set();
  const ordered = events
    .filter((event) => !seen.has(event.event_id) && seen.add(event.event_id))
    .sort((a, b) => timeOf(a) - timeOf(b));
  const result = { segments: [], stops: [], metres: 0, fixes: 0, rejected: 0, gaps: 0 };
  let anchor;
  let lastFixAt;
  let segment;

  for (const event of ordered) {
    if (event.kind !== "point" && event.kind !== "reach") continue;
    const point = coordinate(event);
    const at = timeOf(event);
    const accuracy = Number(event.accuracy);
    const good = point && Number.isFinite(at) && !event.mocked && event.accuracy !== null &&
      Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100;
    if (event.kind === "reach") result.stops.push({ event, number: result.stops.length + 1, coordinate: good ? point : undefined });
    if (!good) { result.rejected++; anchor = undefined; lastFixAt = undefined; segment = undefined; continue; }
    if (lastFixAt !== undefined && at <= lastFixAt) { result.rejected++; continue; }
    const distance = anchor ? metresBetween(anchor.point, point) : 0;
    const seconds = anchor ? (at - anchor.at) / 1000 : 0;
    if (anchor && seconds <= 180 && distance / seconds > 60) {
      result.rejected++; anchor = undefined; lastFixAt = undefined; segment = undefined; continue;
    }
    if (lastFixAt !== undefined && at - lastFixAt > 180000) { result.gaps++; anchor = undefined; segment = undefined; }
    lastFixAt = at;
    result.fixes++;
    if (!anchor || !segment) {
      segment = [point]; result.segments.push(segment);
      anchor = { point, at, accuracy }; continue;
    }
    const noise = Math.max(8, Math.min(30, (anchor.accuracy + accuracy) / 2));
    if (distance < noise) continue;
    result.metres += distance; segment.push(point);
    anchor = { point, at, accuracy };
  }
  return result;
}

// Keeps segment endpoints and thins long routes for drawing on the web map.
function thinSegments(segments, maxPoints = 3000) {
  const drawable = segments.filter((segment) => segment.length > 1);
  const count = drawable.reduce((total, segment) => total + segment.length, 0);
  const stride = Math.max(1, Math.ceil(count / maxPoints));
  return drawable.map((segment) => segment.filter((_, i) => i === 0 || i === segment.length - 1 || i % stride === 0));
}

module.exports = { buildRoute, thinSegments, metresBetween };
