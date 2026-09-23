const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const db = require('../db/connection');
const leadService = require('./leadService');
const AppError = require('../utils/appError');
const { uuid, assertSales } = require('./tracking/validation');
const acquireTransactionLock = require('../repositories/transactionLock');
// Intentionally OUTSIDE public /uploads. Access only through authenticated routes.
const ROOT = path.resolve(process.env.CRM_PRIVATE_STORAGE_DIR || path.join(__dirname, '..', 'private_uploads', 'lead-photos'));
function validatePhoto(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 5 * 1024 * 1024) throw new AppError('Use a photo up to 5 MB.', 400);
  const jpeg = mime === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = mime === 'image/png' && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (!jpeg && !png) throw new AppError('Only JPEG or PNG photos are accepted.', 400);
  return jpeg ? '.jpg' : '.png';
}
async function save(auth, leadId, photoId, buffer, mime) {
  assertSales(auth); uuid(photoId);
  const lead = await leadService.getLead(auth, leadId, { view: 'core' });
  const extension = validatePhoto(buffer, mime);
  const hash = createHash('sha256').update(buffer).digest('hex');
  return db.withTransaction(async tx => {
    const resource = 'lead-photo:' + createHash('sha256').update(`${auth.companyId}:${leadId}`).digest('hex');
    await acquireTransactionLock(tx, resource);
    const [existing] = await tx.query('SELECT lead_id,content_hash FROM lead_field_photos WHERE company_id=? AND photo_id=?', [auth.companyId, photoId]);
    if (existing.length) {
      if (existing[0].lead_id !== lead.lead_id || existing[0].content_hash !== hash) throw new AppError('Photo ID already used for different content.', 409);
      return { photo_id: photoId, saved: true };
    }
    const [count] = await tx.query('SELECT COUNT(*) AS total FROM lead_field_photos WHERE company_id=? AND lead_id=?', [auth.companyId, leadId]);
    if (count[0].total >= 30) throw new AppError('This lead has reached the 30-photo limit.', 400);
    const filename = createHash('sha256').update(`${auth.companyId}:${leadId}:${photoId}:${hash}`).digest('hex') + extension;
    await fs.mkdir(ROOT, { recursive: true });
    // Immutable filename/content: safe if a previous DB failure left this file behind.
    await fs.writeFile(path.join(ROOT, filename), buffer, { flag: 'wx', mode: 0o600 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    await tx.query('INSERT INTO lead_field_photos(company_id,photo_id,lead_id,uploaded_by,file_name,content_type,file_size,content_hash) VALUES(?,?,?,?,?,?,?,?)',
      [auth.companyId, photoId, leadId, auth.userId, filename, mime, buffer.length, hash]);
    return { photo_id: photoId, saved: true };
  });
}
async function list(auth, leadId) {
  await leadService.getLead(auth, leadId, { view: 'core' });
  const [rows] = await db.query('SELECT photo_id,content_type,file_size,created_at FROM lead_field_photos WHERE company_id=? AND lead_id=? ORDER BY created_at DESC', [auth.companyId, leadId]);
  return rows;
}
async function get(auth, leadId, photoId) {
  uuid(photoId); await leadService.getLead(auth, leadId, { view: 'core' });
  const [rows] = await db.query('SELECT file_name,content_type FROM lead_field_photos WHERE company_id=? AND lead_id=? AND photo_id=?', [auth.companyId, leadId, photoId]);
  const row = rows[0];
  if (!row || !/^[a-f0-9]{64}\.(jpg|png)$/.test(row.file_name)) throw new AppError('Photo not found.', 404);
  return { path: path.join(ROOT, row.file_name), contentType: row.content_type };
}
module.exports = { save, list, get, validatePhoto };
