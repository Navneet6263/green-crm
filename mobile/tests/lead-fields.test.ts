import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extendedLeadPayload } from '../src/api/leadFields';
test('web-equivalent sales lead fields are normalized including zero active users', () => {
  const data = extendedLeadPayload({ lead_source: 'other', custom_lead_source: ' Store visit ', industry: 'retail', estimated_value: '1000.50', advance_received: '100', active_users: '0', number_of_units: '2', no_of_employees: '10-20', address_state: ' Delhi ', address_zip: '110001' });
  assert.equal(data.lead_source, 'Store visit'); assert.equal(data.estimated_value, 1000.5);
  assert.equal(data.advance_received, 100); assert.equal(data.active_users, 0); assert.equal(data.number_of_units, 2);
  assert.equal(data.no_of_employees, '10-20'); assert.equal(data.address_state, 'Delhi'); assert.equal(data.address_country, 'India');
});
test('invalid amounts, fractional counts and missing custom source are rejected before submit', () => {
  for (const input of [{ estimated_value: '-1' }, { estimated_value: 'NaN' }, { estimated_value: '10', advance_received: '20' }, { active_users: '2.5' }, { number_of_units: '-1' }, { lead_source: 'other' }, { industry: 'invalid' }]) assert.throws(() => extendedLeadPayload(input));
});
