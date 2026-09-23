const { createHash } = require('node:crypto');
const AppError = require('../../utils/appError');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;
function uuid(value) {
  if (typeof value !== 'string' || !UUID.test(value)) throw new AppError('Invalid tracking identifier.', 400);
  return value.toLowerCase();
}
function assertSales(auth) {
  if (auth?.role !== 'sales' || !auth.companyId || !auth.userId) throw new AppError('Tracking is available only for your own sales account.', 403);
}
function normalizeEvent(input, now = Date.now()) {
  if (!input || !['start', 'point', 'reach', 'stop'].includes(input.kind)) throw new AppError('Invalid tracking event.', 400);
  const time = Date.parse(input.captured_at);
  if (typeof input.captured_at !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(input.captured_at) || !Number.isFinite(time) || time > now + 300000) throw new AppError('Invalid capture time or device clock.', 400);
  const needsGps = ['point', 'reach'].includes(input.kind);
  const latitude = input.latitude ?? null, longitude = input.longitude ?? null, accuracy = input.accuracy ?? null;
  if (needsGps || latitude !== null || longitude !== null || accuracy !== null) {
    if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new AppError('Invalid coordinates.', 400);
    if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 10000) throw new AppError('Invalid GPS accuracy.', 400);
  }
  if (input.kind === 'reach' && (accuracy > 100 || input.mocked === true)) throw new AppError('Reached requires a non-mocked GPS fix within 100 metres accuracy.', 400);
  const label = String(input.label || '').trim();
  if (label.length > 160 || (input.kind === 'reach' && !label)) throw new AppError('Reached location needs a name of 1–160 characters.', 400);
  if (input.kind === 'start' && input.consent_version !== 1) throw new AppError('Tracking consent is required.', 400);
  return { event_id: uuid(input.event_id), session_id: uuid(input.session_id), device_id: uuid(input.device_id), kind: input.kind,
    captured_at: new Date(time).toISOString(), latitude, longitude, accuracy, mocked: input.mocked === true,
    label, consent_version: input.kind === 'start' ? 1 : null };
}
const hashEvent = event => createHash('sha256').update(JSON.stringify(event)).digest('hex');
module.exports = { uuid, assertSales, normalizeEvent, hashEvent, MAX_SESSION_MS };
