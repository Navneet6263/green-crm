const { test } = require('node:test');
const assert = require('node:assert/strict');

const repo = require('../repositories/discussRepository');
const GROUP = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';
const groups = {
  [GROUP]: { id: GROUP, name: 'Delhi team', company_id: 'C1', created_by: 1, is_company_wide: false, archived_at: null },
  'AAAAAAAA-BBBB-CCCC-DDDD-000000000000': { id: 'AAAAAAAA-BBBB-CCCC-DDDD-000000000000', name: 'Other co', company_id: 'C2', created_by: 9, is_company_wide: false },
  'AAAAAAAA-BBBB-CCCC-DDDD-111111111111': { id: 'AAAAAAAA-BBBB-CCCC-DDDD-111111111111', name: 'Everyone', company_id: 'C1', created_by: 1, is_company_wide: true },
};
const created = [];
Object.assign(repo, {
  getGroup: async (id) => groups[id] || null,
  memberIds: async () => [1, 2],
  listMembers: async () => [],
  getUser: async (companyId, id) => (companyId === 'C1' && [1, 2, 3].includes(Number(id)) ? { id, name: `User ${id}`, user_id: `U${id}` } : null),
  createMessage: async (m) => { created.push(m); return 'M-NEW'; },
  getMessage: async (id) => (id === 'M-NEW' ? { id, sender_id: created.at(-1).sender_id, text: created.at(-1).text, group_id: created.at(-1).group_id, lead_id: created.at(-1).lead_id, lead_name: created.at(-1).lead_name, company_id: 'C1', created_at: new Date() } : null),
  markRead: async () => {},
  companyUserIds: async (companyId, ids) => ids.map(Number).filter((id) => [1, 2, 3].includes(id)),
  createGroup: async () => GROUP,
  addMembers: async () => {},
  listMessages: async () => [],
});
const leadService = require('../services/leadService');
leadService.getLead = async (auth, id) => { if (id === 'SECRET') throw Object.assign(new Error('Lead not found.'), { statusCode: 404 }); return { lead_id: id, company_name: 'Kapoor Steels' }; };
const hub = require('../services/discuss/discussHub');
const events = [];
hub.publish = (event, target) => events.push({ event, target });

const discuss = require('../services/discuss/discussService');
const rahul = { companyId: 'C1', userId: 'U1', id: 1, role: 'sales', name: 'Rahul' };
const outsider = { companyId: 'C1', userId: 'U3', id: 3, role: 'sales', name: 'Sneha' };

test('chat ids are checked', () => {
  assert.equal(discuss.parseChat(`g:${GROUP.toLowerCase()}`).key, `g:${GROUP}`);
  assert.equal(discuss.parseChat('d:12').id, 12);
  assert.throws(() => discuss.parseChat("g:1; DROP TABLE x"), /Choose a chat/);
  assert.throws(() => discuss.parseChat('x:1'), /Choose a chat/);
});

test('only members can read or write a group, and never another company', async () => {
  await assert.rejects(() => discuss.getMessages(outsider, { chat: `g:${GROUP}` }), /not in this group/);
  await assert.rejects(() => discuss.sendMessage(outsider, { chat: `g:${GROUP}`, text: 'hi' }), /not in this group/);
  await assert.rejects(() => discuss.getMessages(rahul, { chat: 'g:AAAAAAAA-BBBB-CCCC-DDDD-000000000000' }), /not found/);
  await assert.rejects(() => discuss.sendMessage(rahul, { chat: 'd:99', text: 'hi' }), /not found/);
});

test('a company-wide group is open to everyone in the company', async () => {
  events.length = 0;
  await discuss.sendMessage(outsider, { chat: 'g:AAAAAAAA-BBBB-CCCC-DDDD-111111111111', text: 'Hello all' });
  assert.equal(events[0].target.companyWide, true);
  assert.equal(events[0].target.companyId, 'C1');
});

test('messages go live only to the chat members, with a lead the sender can open', async () => {
  events.length = 0;
  const msg = await discuss.sendMessage(rahul, { chat: `g:${GROUP}`, text: 'Look at this lead', lead_id: 'L7' });
  assert.equal(msg.lead.name, 'Kapoor Steels');
  assert.deepEqual(events[0].target.userIds, [1, 2]);
  await assert.rejects(() => discuss.sendMessage(rahul, { chat: `g:${GROUP}`, text: 'x', lead_id: 'SECRET' }), /Lead not found/);
  await assert.rejects(() => discuss.sendMessage(rahul, { chat: `g:${GROUP}`, text: 'x'.repeat(4001) }), /under 4000/);
});

test('only admins and managers make a group for everyone', async () => {
  await assert.rejects(() => discuss.createGroup(rahul, { name: 'All', company_wide: true }), /Only admins and managers/);
  await assert.rejects(() => discuss.createGroup(rahul, { name: 'Solo', member_ids: [1] }), /at least one person/);
  const res = await discuss.createGroup(rahul, { name: 'Deal room', member_ids: [2, 77] });
  assert.equal(res.key, `g:${GROUP}`);
  await assert.rejects(() => discuss.updateGroup(outsider, GROUP, { name: 'x' }), /not in this group/);
});
