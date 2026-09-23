const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const db = { query: async () => { throw new Error('Live DB access forbidden'); }, withTransaction: async action => action(db) };
const leadService = { getLead: async () => { throw new Error('Unmocked lead authorization'); } };
for (const [name, exports] of [['../db/connection', db], ['../services/leadService', leadService]]) {
  const id = require.resolve(name); require.cache[id] = { id, filename: id, loaded: true, exports };
}
const service = require('../services/fieldPhotoService');
const auth = { companyId: 'c1', userId: 'u1', role: 'sales' }, photoId = randomUUID();
const jpeg = Buffer.from([255,216,255,224,0,0]);
afterEach(() => mock.restoreAll());
test('photo endpoint allows bounded JPEG/PNG only, never SVG or MIME spoofing', () => {
  assert.equal(service.validatePhoto(jpeg, 'image/jpeg'), '.jpg');
  assert.equal(service.validatePhoto(Buffer.from([137,80,78,71,13,10,26,10]), 'image/png'), '.png');
  for (const [buffer, mime] of [[Buffer.from('<svg onload="alert(1)"/>'), 'image/svg+xml'], [Buffer.from('not-image'), 'image/jpeg'], [jpeg, 'image/png'], [Buffer.alloc(5 * 1024 * 1024 + 1), 'image/jpeg']]) assert.throws(() => service.validatePhoto(buffer, mime));
});
test('photo reads/writes call lead authorization first and never query after denial', async () => {
  mock.method(leadService, 'getLead', async () => { throw new Error('Lead access denied'); });
  await assert.rejects(service.list(auth, 'other-lead'), /Lead access denied/);
  await assert.rejects(service.get(auth, 'other-lead', photoId), /Lead access denied/);
  await assert.rejects(service.save(auth, 'other-lead', photoId, jpeg, 'image/jpeg'), /Lead access denied/);
  await assert.rejects(service.save({ ...auth, role: 'viewer' }, 'l1', photoId, jpeg, 'image/jpeg'), /own sales account/);
});
test('authorized photo reads still scope metadata by company and lead, never disclose file paths in list', async () => {
  mock.method(leadService, 'getLead', async () => ({ lead_id: 'l1' }));
  mock.method(db, 'query', async (sql, params) => { assert.match(sql, /WHERE company_id=\? AND lead_id=\?/); assert.deepEqual(params.slice(0, 2), ['c1', 'l1']); if (sql.startsWith('SELECT photo_id')) { assert.doesNotMatch(sql, /file_name/); return [[]]; } return [[{ file_name: '../../secret.env', content_type: 'image/jpeg' }]]; });
  assert.deepEqual(await service.list(auth, 'l1'), []);
  await assert.rejects(service.get(auth, 'l1', photoId), /Photo not found/);
});
test('same photo UUID/content returns acknowledgement without another file write; conflicts fail', async () => {
  mock.method(leadService, 'getLead', async () => ({ lead_id: 'l1' }));
  mock.method(db, 'query', async sql => {
    if (sql.includes('sp_getapplock')) return [{ affectedRows: 0 }, { recordset: [{ result: 0 }] }];
    if (sql.startsWith('SELECT lead_id')) return [[{ lead_id: 'l1', content_hash: createHash('sha256').update(jpeg).digest('hex') }]];
    throw new Error('Duplicate upload must not reach a file or metadata write');
  });
  assert.deepEqual(await service.save(auth, 'l1', photoId, jpeg, 'image/jpeg'), { photo_id: photoId, saved: true });
  await assert.rejects(service.save(auth, 'l1', photoId, Buffer.concat([jpeg, Buffer.from('different')]), 'image/jpeg'), /different content/);
});
