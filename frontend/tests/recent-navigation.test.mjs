import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dataModule = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const roleSource = await readFile(new URL("../lib/roles.js", import.meta.url), "utf8");
const navigationSource = (await readFile(new URL("../components/dashboard/shell-config.js", import.meta.url), "utf8"))
  .replace('"../../lib/roles"', JSON.stringify(dataModule(roleSource)));
const { getRoleMeta, SIDEBAR_SECTIONS } = await import(dataModule(navigationSource));

test("Dashboard stays first, then My Day and Calendar, without changing base sections", () => {
  const before = JSON.stringify(SIDEBAR_SECTIONS);
  for (const role of ["admin", "manager", "sales", "marketing", "legal-team", "finance-team", "support", "viewer"]) {
    for (let i = 0; i < 2; i++) {
      const items = getRoleMeta(role).sections.flatMap(section => section.items);
      assert.deepEqual(items.slice(0, 4).map(item => item.label), ["Dashboard", "My Day", "Calendar", "Recent Updates"]);
      assert.equal(items.filter(item => item.href === "/my-day").length, 1);
      assert.equal(items.filter(item => item.href === "/calendar").length, 1);
      assert.equal(items[2].accessKey, "tasks");
    }
  }
  assert.equal(JSON.stringify(SIDEBAR_SECTIONS), before);
});

test("platform and expert navigation remains unchanged", () => {
  for (const role of ["super-admin", "platform-admin", "platform-manager", "expert"]) {
    assert.deepEqual(getRoleMeta(role).sections, SIDEBAR_SECTIONS[role]);
  }
});

const apiSource = (await readFile(new URL("../lib/api/recentActivity.js", import.meta.url), "utf8"))
  .replace("import { apiClient } from './client.js';", "const apiClient = { get: async path => path };");
const { recentActivityApi } = await import(dataModule(apiSource));

test("recent feed, export and stats requests include the selected team", async () => {
  for (const limit of [20, 10000]) {
    const path = await recentActivityApi.getRecentNotes({ teamId: "T3", limit, users: ["u1"], products: ["p1"] });
    const url = new URL(path, "http://test.invalid");
    assert.equal(url.searchParams.get("team_id"), "T3");
    assert.equal(url.searchParams.get("limit"), String(limit));
    assert.equal(url.searchParams.get("users"), "u1");
  }
  const stats = new URL(await recentActivityApi.getActivityStats(7, "T3"), "http://test.invalid");
  assert.equal(stats.searchParams.get("team_id"), "T3");
  assert.equal((await recentActivityApi.getRecentNotes({})).includes("team_id"), false);
});
