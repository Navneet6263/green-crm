import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const response = data => ({ ok: true, json: async () => data });
let sequence = 0;
const freshApi = async () => (await import(`../lib/api.js?test=${sequence++}`)).apiRequest;

test("analytics renders full server totals and bounds year-chart density", async () => {
  const { buildServerDeck, buildServerFocus } = await import("../app/analytics/server-analytics.js");
  const deck = buildServerDeck({
    from_date: "2025-09-08T00:00:00Z", to_date: "2026-09-08T00:00:00Z",
    rows: [{ dimension: "total", leads: 50001, won: 1, won_value: 100, open_leads: 40000, open_value: 5000 },
      { dimension: "day", key: "2026-09-08", leads: 4, won: 1, value: 100 }], options: [],
  }, null);
  assert.equal(deck.trend.length <= 13, true);
  assert.equal(deck.trend.reduce((sum,row)=>sum+row.leads,0), 4);
  assert.equal(deck.kpis.find(card=>card.label==="Customers").value, "—");
  assert.equal(deck.kpis.find(card=>card.label==="Open Pipeline").value, "INR 5,000");
  const focus = buildServerFocus({ items: [{ lead_id: "l1" }], metrics: { total: 150, value: 9000 } });
  assert.equal(focus.metrics[0].value, "150");
  assert.equal(focus.leads.length, 1);
});

test("analytics CSV quotes content and neutralizes spreadsheet formulas", async () => {
  const { buildAnalyticsCsv } = await import("../app/analytics/analytics-utils.js");
  const csv = buildAnalyticsCsv({ kpis: [], trend: [] }, "week", { leads: [{ company_name: '=HYPERLINK("bad")', contact_person: "Name, comma" }] });
  assert.ok(csv.content.includes("'=HYPERLINK"));
  assert.ok(csv.content.includes('"Name, comma"'));
});

test("pagination and response metadata survive the shared API wrapper", async () => {
  const api = await freshApi();
  globalThis.fetch = async () => response({ success: true, data: [{ id: 1 }], pagination: { total: 450, totalPages: 23 }, meta: { total: 450 } });
  const result = await api("/recent-activity/notes");
  assert.equal(result.pagination.totalPages, 23);
  assert.equal(result.meta.total, 450);
  assert.deepEqual(result.items, [{ id: 1 }]);
});
test("identical concurrent GETs are deduplicated and callers receive isolated data", async () => {
  const api = await freshApi();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response({ data: { count: 1 } }); };
  const [a,b] = await Promise.all([api("/leads", { token: "u1" }), api("/leads", { token: "u1" })]);
  assert.equal(calls, 1); a.count = 99; assert.equal(b.count, 1);
});
test("different identities do not share cached responses", async () => {
  const api = await freshApi();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response({ data: {} }); };
  await api("/leads", { token: "u1" }); await api("/leads", { token: "u2" });
  assert.equal(calls, 2);
});
test("a GET that started before a mutation cannot repopulate stale cache", async () => {
  const api = await freshApi();
  let release;
  let reads = 0;
  globalThis.fetch = async (_url, options) => {
    if (options.method !== "GET") return response({ data: { saved: true } });
    reads++;
    if (reads === 1) return new Promise(resolve => { release = () => resolve(response({ data: { value: "old" } })); });
    return response({ data: { value: "new" } });
  };
  const old = api("/leads");
  await api("/leads/1", { method: "PATCH", body: { value: "new" } });
  release(); await old;
  assert.equal((await api("/leads")).value, "new");
  assert.equal(reads, 2);
});
test("cancellable requests pass their signal without sharing another request", async () => {
  const api = await freshApi();
  const controllers = [new AbortController(), new AbortController()];
  const seen = [];
  globalThis.fetch = async (_url, options) => { seen.push(options.signal); return response({ data: [] }); };
  await Promise.all(controllers.map(c => api("/leads", { signal: c.signal })));
  assert.deepEqual(seen, controllers.map(c => c.signal));
});
test("fresh GET bypasses cache without invalidating unrelated cached GETs", async () => {
  const api = await freshApi();
  let calls = 0;
  globalThis.fetch = async () => response({ data: { call: ++calls } });
  await api("/customers");
  await api("/leads", { fresh: true });
  assert.equal((await api("/customers")).call, 1);
  assert.equal(calls, 2);
});
