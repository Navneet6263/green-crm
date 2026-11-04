const { test } = require('node:test');
const assert = require('node:assert/strict');
const inbox = require('../services/mail/graphInbox');

const nudges = [
  { id: 'N1', company_id: 'C1', lead_id: 'L1', sent_by: 'A1', ref_code: 'N-ABC123', message_id: '<m1@example.test>' },
  { id: 'N2', company_id: 'C1', lead_id: null, sent_by: 'A1', ref_code: 'N-DEF456', message_id: null },
];

test('stays off until Microsoft 365 is set up', async () => {
  delete process.env.MS_GRAPH_TENANT_ID;
  assert.equal(inbox.configured(), false);
  assert.equal((await inbox.syncInbox()).skipped, true);
  assert.equal(inbox.status().connected, false);
});

test('a reply is matched by its headers, else by the ref in the subject', () => {
  const byHeader = { subject: 'RE: something', internetMessageHeaders: [{ name: 'In-Reply-To', value: '<m1@example.test>' }] };
  assert.equal(inbox.matchNudge(byHeader, nudges).id, 'N1');
  assert.equal(inbox.matchNudge({ subject: 'RE: Your CRM report [Ref N-def456]' }, nudges).id, 'N2');
  assert.equal(inbox.matchNudge({ subject: 'Lunch?' }, nudges), null);
});

test('only the new part of a reply is kept', () => {
  const body = 'Done, I called him.\nWill update today.\n\nFrom: GreenCRM <crm@example.test>\nSent: Monday\nOld text';
  assert.equal(inbox.replyText(body), 'Done, I called him.\nWill update today.');
  assert.equal(inbox.replyText('Ok\n\nOn Mon, 2 Nov 2026 Vivek wrote:\n> hi'), 'Ok');
});

test('one sync pass saves new replies once and moves the bookmark', async () => {
  Object.assign(process.env, { MS_GRAPH_TENANT_ID: 't', MS_GRAPH_CLIENT_ID: 'c', MS_GRAPH_CLIENT_SECRET: 's', MS_GRAPH_MAILBOX: 'crm@example.test' });
  const saved = [];
  const seen = new Set();
  const state = {};
  const repo = {
    getSyncState: async () => null,
    listRecentForMatching: async () => nudges,
    addReply: async (r) => { if (seen.has(r.source_message_id)) return false; seen.add(r.source_message_id); saved.push(r); return true; },
    saveSyncState: async (box, at, err) => Object.assign(state, { box, at, err }),
  };
  const messages = [
    { id: 'g1', internetMessageId: '<r1@x>', subject: 'RE: Follow-up [Ref N-ABC123]', from: { emailAddress: { address: 'Rahul@Example.test', name: 'Rahul' } }, receivedDateTime: '2026-11-03T05:00:00Z', body: { content: 'Called.\n\nFrom: crm' } },
    { id: 'g2', internetMessageId: '<r1@x>', subject: 'RE: Follow-up [Ref N-ABC123]', from: { emailAddress: { address: 'rahul@example.test' } }, receivedDateTime: '2026-11-03T05:00:00Z', body: { content: 'dup' } },
    { id: 'g3', internetMessageId: '<own@x>', subject: 'RE: [Ref N-ABC123]', from: { emailAddress: { address: 'crm@example.test' } }, receivedDateTime: '2026-11-03T06:00:00Z', body: { content: 'own copy' } },
    { id: 'g4', internetMessageId: '<other@x>', subject: 'Newsletter', from: { emailAddress: { address: 'news@x.test' } }, receivedDateTime: '2026-11-03T07:00:00Z', body: { content: '' } },
  ];
  const urls = [];
  const fakeFetch = async (url) => {
    urls.push(String(url));
    if (String(url).includes('oauth2')) return { ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
    return { ok: true, json: async () => ({ value: messages }) };
  };
  const replies = [];
  const result = await inbox.syncInbox({ fetch: fakeFetch, repo, onReply: async (n, r) => replies.push([n.id, r.from_email]) });
  assert.equal(result.found, 1);
  assert.equal(saved[0].body_text, 'Called.');
  assert.equal(saved[0].from_email, 'rahul@example.test');
  assert.deepEqual(replies, [['N1', 'rahul@example.test']]);
  assert.equal(state.at.toISOString(), '2026-11-03T07:00:00.000Z');
  assert.ok(urls.some((u) => u.includes('/users/crm%40example.test/mailFolders/inbox/messages')));
  for (const key of ['MS_GRAPH_TENANT_ID', 'MS_GRAPH_CLIENT_ID', 'MS_GRAPH_CLIENT_SECRET', 'MS_GRAPH_MAILBOX']) delete process.env[key];
});
