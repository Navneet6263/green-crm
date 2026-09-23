const db = require('../db/connection');
const { createHash } = require('node:crypto');
const AppError = require('../utils/appError');
const acquireTransactionLock = require('./transactionLock');
const { hashEvent, MAX_SESSION_MS } = require('../services/tracking/validation');

async function ingest(auth, events) {
  return db.withTransaction(async tx => {
    const owner = [auth.companyId, auth.userId];
    const resource = 'field-tracking:' + createHash('sha256').update(JSON.stringify(owner)).digest('hex');
    await acquireTransactionLock(tx, resource);
    const acknowledged = [];
    for (const event of events) {
      const hash = hashEvent(event);
      const [existing] = await tx.query('SELECT payload_hash FROM field_tracking_events WHERE company_id=? AND user_id=? AND event_id=?', [...owner, event.event_id]);
      if (existing.length) {
        if (existing[0].payload_hash !== hash) throw new AppError('Event ID reused with different data.', 409);
        acknowledged.push(event.event_id); continue;
      }
      const [sessions] = await tx.query('SELECT * FROM field_tracking_sessions WHERE company_id=? AND user_id=? AND session_id=?', [...owner, event.session_id]);
      const session = sessions[0];
      if (event.kind === 'start') {
        if (session) throw new AppError('Session already started with a different event.', 409);
        await tx.query('INSERT INTO field_tracking_sessions(company_id,user_id,session_id,device_id,started_at,consent_version) VALUES(?,?,?,?,?,?)', [...owner, event.session_id, event.device_id, event.captured_at, 1]);
      } else {
        if (!session || String(session.device_id).toLowerCase() !== event.device_id) throw new AppError('Upload the session start first, from the same device.', 409);
        const captured = Date.parse(event.captured_at), started = new Date(session.started_at).getTime();
        if (captured < started || captured > started + MAX_SESSION_MS || (session.stopped_at && captured > new Date(session.stopped_at).getTime())) throw new AppError('Event is outside the consented tracking session.', 409);
        if (event.kind === 'stop') {
          if (session.stopped_at) throw new AppError('Session already stopped.', 409);
          const [later] = await tx.query('SELECT TOP 1 event_id FROM field_tracking_events WHERE company_id=? AND user_id=? AND session_id=? AND captured_at>?', [...owner, event.session_id, event.captured_at]);
          if (later.length) throw new AppError('Stop time precedes an existing event.', 409);
          await tx.query('UPDATE field_tracking_sessions SET stopped_at=? WHERE company_id=? AND user_id=? AND session_id=?', [event.captured_at, ...owner, event.session_id]);
        }
      }
      await tx.query(`INSERT INTO field_tracking_events(company_id,user_id,event_id,session_id,kind,captured_at,latitude,longitude,accuracy,mocked,label,payload_hash)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`, [...owner, event.event_id, event.session_id, event.kind, event.captured_at, event.latitude, event.longitude, event.accuracy, event.mocked ? 1 : 0, event.label, hash]);
      acknowledged.push(event.event_id);
    }
    return { acknowledged };
  });
}
async function listSessions(auth, page) {
  const [rows] = await db.query('SELECT * FROM field_tracking_sessions WHERE company_id=? AND user_id=? ORDER BY started_at DESC,session_id OFFSET ? ROWS FETCH NEXT 20 ROWS ONLY', [auth.companyId, auth.userId, (page - 1) * 20]);
  return rows;
}
async function listEvents(auth, sessionId, page) {
  const [rows] = await db.query('SELECT event_id,kind,captured_at,latitude,longitude,accuracy,mocked,label FROM field_tracking_events WHERE company_id=? AND user_id=? AND session_id=? ORDER BY captured_at,event_id OFFSET ? ROWS FETCH NEXT 500 ROWS ONLY', [auth.companyId, auth.userId, sessionId, (page - 1) * 500]);
  return rows;
}
module.exports = { ingest, listSessions, listEvents };
