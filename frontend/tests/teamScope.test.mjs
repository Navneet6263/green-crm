import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (await readFile(new URL("../lib/teamScope.js", import.meta.url), "utf8"))
  .replace('import { apiRequest } from "./api";', 'const apiRequest = () => { throw new Error("Unexpected network access"); };');
const { filterRecordsByTeam } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("lead product dropdown retains explicitly mapped products without showing unshared foreign-team products", () => {
  const rows = [
    { product_id: "own", team_id: "T3", mapped_team_ids: [] },
    { product_id: "shared", team_id: "T1", mapped_team_ids: ["T3"] },
    { product_id: "private", team_id: "T2", mapped_team_ids: [] },
  ];
  assert.deepEqual(filterRecordsByTeam(rows, "T3").map(row => row.product_id), ["own", "shared"]);
  assert.deepEqual(filterRecordsByTeam(rows.map(row => ({ ...row, mapped_team_ids: [] })), "T3").map(row => row.product_id), ["own"]);
});
