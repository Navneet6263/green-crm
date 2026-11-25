import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crmOn, moduleOn } from '../src/auth/modules';

const session = (service_access: unknown) => ({ token: 't', user: { user_id: 'U', name: 'A', email: 'a@b.in', role: 'sales', company_id: 'C' }, company: { company_id: 'C', name: 'Co', service_access } }) as never;

test('modules are on unless switched off; a tracking-only company has no CRM tabs', () => {
  assert.equal(crmOn(session(null)), true);
  assert.equal(moduleOn(session({}), 'field_tracking'), true);
  const tracking = session(JSON.stringify({ leads: false, customers: false, tasks: false, field_tracking: true }));
  assert.equal(crmOn(tracking), false);
  assert.equal(moduleOn(tracking, 'tasks'), false);
  assert.equal(moduleOn(tracking, 'field_tracking'), true);
  assert.equal(crmOn(session('not json')), true);
});
