// Isolated browser smoke test of an exported app. ALL remote requests are mocked.
// Requires a local Chromium executable (CHROME_BIN or a Playwright cache install).
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';

const dist = resolve('dist'), artifacts = resolve('test-results');
assert.ok(existsSync(join(dist, 'index.html')), 'Export web first: npx expo export --platform all');
const cache = join(process.env.LOCALAPPDATA || '', 'ms-playwright');
const browserDir = existsSync(cache) ? readdirSync(cache).filter(name => /^chromium-\d+$/.test(name)).sort().at(-1) : '';
const binary = process.env.CHROME_BIN || (browserDir ? join(cache, browserDir, 'chrome-win64', 'chrome.exe') : '');
assert.ok(binary && existsSync(binary), 'Set CHROME_BIN to your local Chromium executable.');
mkdirSync(artifacts, { recursive: true });
const server = createServer((req, res) => {
  const path = resolve(dist, '.' + new URL(req.url || '/', 'http://localhost').pathname);
  if (path !== dist && !path.startsWith(dist + sep)) { res.writeHead(403).end(); return; }
  const file = existsSync(path) && extname(path) ? path : join(dist, 'index.html');
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' };
  try { res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'greencrm-smoke-'));
const browser = spawn(binary, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update', '--disable-sync', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
const errors = [], unexpected = [], writes = [], dialogs = [];
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt++) await pause(100);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const lead = { lead_id: 'test-lead', company_name: 'Smoke Test Store', contact_person: 'Test Contact', phone: '+919876543210', status: 'new', priority: 'medium', team_id: 'test-team', product_id: 'test-product', product_name: 'Test Product', team_name: 'Test Team', follow_up_date: new Date().toISOString() };
  const user = { user_id: 'test-sales', name: 'Test Sales', email: 'sales@example.test', role: 'sales', company_id: 'test-company' };
  const task = { task_id: 'test-task', title: 'Call test contact', status: 'pending', due_date: new Date().toISOString() };
  const notes = [], photos = [];
  let photoAttempts = 0;
  const list = items => ({ data: items, meta: { total: items.length, total_pages: 1 } });
  const respond = request => {
    const url = new URL(request.url), path = url.pathname;
    const contentType = Object.entries(request.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || '';
    const body = request.postData && contentType.includes('application/json') ? JSON.parse(request.postData) : {};
    if (request.method !== 'GET' && request.method !== 'OPTIONS') writes.push({ path, method: request.method, body });
    if (request.method === 'OPTIONS') return {};
    if (path.endsWith('/auth/login')) return { data: { user, company: { name: 'Test Company' }, token: 'isolated-browser-test-token' } };
    if (path.endsWith('/auth/me')) return { data: { user, company: { name: 'Test Company' } } };
    if (path.endsWith('/auth/logout')) return { success: true };
    if (path.endsWith('/photos')) return { data: path.includes('created-lead') ? photos : [] };
    if (path.includes('/photos/') && request.method === 'PUT') {
      assert.equal(contentType, 'image/jpeg'); photoAttempts++;
      if (!photos.length) photos.push({ photo_id: path.split('/').at(-1), created_at: new Date().toISOString() });
      return photoAttempts === 1 ? { success: false, error: 'Simulated missing upload acknowledgement' } : { data: { saved: true } };
    }
    if (path.endsWith('/notes')) {
      if (request.method === 'POST') { notes.push({ id: notes.length + 1, content: body.content, created_at: new Date().toISOString() }); return { data: { created: true } }; }
      return list(notes);
    }
    if (path.endsWith('/leads/test-lead')) { if (request.method === 'PATCH') Object.assign(lead, body); return { data: lead }; }
    if (path.endsWith('/leads/created-lead')) return { data: { ...lead, lead_id: 'created-lead', company_name: 'Created by browser test' } };
    if (path.endsWith('/leads/my-day')) return list(url.searchParams.get('bucket') === 'overdue' ? [] : [lead]);
    if (path.endsWith('/leads')) return request.method === 'POST' ? { data: { ...body, lead_id: 'created-lead' } } : list([lead]);
    if (path.endsWith('/teams')) return list([{ team_id: 'test-team', name: 'Test Team' }]);
    if (path.endsWith('/products')) return list([{ product_id: 'test-product', name: 'Test Product', is_active: true }]);
    if (path.endsWith('/tasks/test-task')) { Object.assign(task, body); return { data: task }; }
    if (path.endsWith('/tasks')) {
      if (request.method === 'POST') return { data: { ...body, task_id: 'created-task' } };
      return list(url.searchParams.get('status') === 'done' ? (task.status === 'done' ? [task] : []) : (task.status === 'done' ? [] : [task]));
    }
    unexpected.push(`${request.method} ${path}`); return { success: false, error: 'Unexpected test request' };
  };
  socket.onmessage = ({ data }) => {
    const event = JSON.parse(data);
    if (event.id) {
      const promise = pending.get(event.id); pending.delete(event.id);
      if (event.error) promise?.reject(new Error(event.error.message)); else promise?.resolve(event.result);
    }
    if (event.method === 'Runtime.exceptionThrown') errors.push(event.params.exceptionDetails.text + ': ' + (event.params.exceptionDetails.exception?.description || ''));
    if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') errors.push(event.params.args.map(arg => arg.value || arg.description).join(' '));
    if (event.method === 'Page.javascriptDialogOpening') { dialogs.push(event.params.message); void call('Page.handleJavaScriptDialog', { accept: false }); }
    if (event.method === 'Fetch.requestPaused') {
      const { requestId, request } = event.params;
      if (request.url.startsWith(origin + '/') || /^(blob|data):/.test(request.url)) void call('Fetch.continueRequest', { requestId });
      else {
        const response = request.url.includes('/api/') ? respond(request) : { blocked: true };
        void call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [
          { name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin },
          { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,OPTIONS' },
        ], body: Buffer.from(JSON.stringify(response)).toString('base64') });
      }
    }
  };
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await pause(100); }
    console.error('Isolated smoke fixture diagnostics:', await evaluate('document.body.innerText'), errors);
    await screenshot('failure');
    throw new Error(`UI timeout: ${expression}`);
  };
  const hasText = text => `document.body.innerText.includes(${JSON.stringify(text)})`;
  const click = async text => {
    const find = `[...document.querySelectorAll('[role="button"],button,[role="tab"],a')].find(el => el.textContent.trim() === ${JSON.stringify(text)} || el.getAttribute('aria-label') === ${JSON.stringify(text)})`;
    await waitFor(`Boolean(${find})`); await evaluate(`(${find}).click()`); await pause(200);
  };
  const input = async (label, value) => {
    const selector = `document.querySelector('input[aria-label=${JSON.stringify(label)}],textarea[aria-label=${JSON.stringify(label)}]')`;
    await waitFor(`Boolean(${selector})`); await evaluate(`${selector}.focus()`); await call('Input.insertText', { text: value });
  };
  const screenshot = async name => {
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(artifacts, `${name}.png`), Buffer.from(data, 'base64'));
  };
  await call('Runtime.enable'); await call('Page.enable'); await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await call('Page.navigate', { url: origin }); await waitFor(hasText('Welcome back')); await screenshot('login');
  await input('Work email', 'sales@example.test'); await input('Password', 'test-only'); await click('Sign in');
  await waitFor(hasText('Hi, Test.')); await waitFor(hasText('Smoke Test Store')); await screenshot('today');
  await click('Tracker'); await waitFor(hasText('The browser does not record a route.')); await click('Today');
  await click('Open Smoke Test Store'); await waitFor(hasText('Lead workspace'));
  await click('Update status & follow-up'); await waitFor(hasText('Plan the next step')); await click('contacted'); await click('Save changes to CRM');
  await waitFor(hasText('Lead status and follow-up saved.'));
  await input('Conversation note', 'Browser smoke note'); await click('Save note'); await waitFor(hasText('Conversation note saved to the CRM.'));
  assert.equal(notes[0]?.content, 'Browser smoke note'); assert.equal(lead.status, 'contacted');
  await click('Back to leads'); await click('My Tasks'); await waitFor(hasText('Call test contact')); await click('Mark as done'); await waitFor(hasText("You're clear in this list"));
  await click('Done'); await waitFor(hasText('Call test contact')); assert.equal(task.status, 'done');
  await click('My Leads'); await click('Create lead'); await waitFor(hasText('New lead'));
  await input('Business / store name *', 'Created by browser test'); await input('Contact person *', 'Test Person'); await input('Phone', '+919999999999');
  await click('Back to leads'); assert.ok(dialogs.some(message => message.includes('Discard'))); await waitFor(hasText('New lead'));
  await click('Team'); await waitFor(hasText('Choose team')); await click('Test Team');
  await click('Product'); await waitFor(hasText('Choose product')); await click('Test Product');
  await input('Estimated value (₹)', '1000'); await input('Advance received (₹)', '100');
  await input('Active users', '0'); await input('No. of employees', '10-20'); await input('State', 'Delhi');
  await call('Page.setInterceptFileChooserDialog', { enabled: true });
  await click('Choose photo'); await waitFor("Boolean(document.querySelector('input[type=file]'))");
  await evaluate(`(async () => { const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8;
    canvas.getContext('2d').fillRect(0,0,8,8); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const transfer = new DataTransfer(); transfer.items.add(new File([blob], 'test-only.png', { type: 'image/png' }));
    const input = document.querySelector('input[type=file]'); input.files = transfer.files; input.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await waitFor(hasText('Not uploaded yet'));
  await call('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 1, mobile: true });
  await click('Next follow-up: Not scheduled'); await waitFor(hasText('Set date & time')); await screenshot('calendar-small');
  assert.equal(await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), false);
  await click('15'); await click('Set date & time');
  await click('Create lead in CRM'); await waitFor(hasText('Lead created')); await screenshot('lead-created');
  await waitFor(hasText('Photo upload failed')); await click('Retry remaining photos'); await waitFor(hasText('Uploaded to CRM'));
  assert.equal(photoAttempts, 2);
  assert.equal(writes.filter(item => item.path.endsWith('/leads') && item.method === 'POST').length, 1);
  assert.equal(writes.filter(item => item.method === 'PUT')[0].path, writes.filter(item => item.method === 'PUT')[1].path);
  const create = writes.find(item => item.path.endsWith('/leads') && item.method === 'POST');
  assert.equal(create?.body.team_id, 'test-team'); assert.equal(create?.body.product_id, 'test-product');
  assert.equal('assigned_to' in create.body, false);
  assert.equal(create.body.active_users, 0); assert.equal(create.body.no_of_employees, '10-20');
  assert.equal(create.body.estimated_value, 1000); assert.equal(create.body.advance_received, 100); assert.equal(create.body.address_state, 'Delhi');
  assert.ok(create.body.follow_up_date.endsWith('T04:30:00.000Z'));
  await click('Back to My Leads'); await click('My Tasks'); await click('Create task'); await waitFor(hasText('New task'));
  await input('Task title *', 'Created task from browser'); await click('Team'); await click('Test Team');
  await click('Due date: Not scheduled'); await click('15'); await click('Set date & time'); await click('Create task in CRM'); await waitFor(hasText('Task created'));
  const createdTask = writes.find(item => item.path.endsWith('/tasks') && item.method === 'POST');
  assert.equal(createdTask.body.title, 'Created task from browser'); assert.equal('assigned_to' in createdTask.body, false);
  assert.deepEqual(await evaluate('({local:localStorage.length,session:sessionStorage.length})'), { local: 0, session: 0 });
  assert.deepEqual(unexpected, []); assert.deepEqual(errors, []);
  console.log('PASS: login, follow-ups, notes, tasks, extended lead fields, photo selection/compression/retry without duplicate lead, web tracker guard, IST calendar at 320px, unsaved guard, memory-only token, zero browser errors. All API requests mocked.');
  await call('Browser.close').catch(() => {});
} finally {
  socket?.close(); browser.kill(); server.close();
}
