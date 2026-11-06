"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { D, KIND_COLORS, StatusBadge, Tabs, when } from "./dev-ui";

const KINDS = [["", "Everything"], ["capture", "Lead links"], ["api", "API calls"]];
const RESULTS = [["", "All results"], ["ok", "Worked"], ["error", "Failed"]];

/** The request log: every lead link post and API call from the last 30 days. */
export default function ActivityTab({ dev }) {
  const [kind, setKind] = useState("");
  const [result, setResult] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { loadLogs } = dev;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await loadLogs(Object.fromEntries(Object.entries({ kind, result, limit: 200 }).filter(([, v]) => v !== ""))));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [kind, result, loadLogs]);

  useEffect(() => { load(); }, [load]);
  const failed = rows.filter((r) => r.status >= 400).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Tabs items={KINDS} value={kind} onChange={setKind} size="sm" />
          <Tabs items={RESULTS} value={result} onChange={setResult} size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-slate-500">{rows.length} shown{failed ? ` · ${failed} failed` : ""}</span>
          <button type="button" className={D.small} onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
      </div>

      {error ? <p className="rounded-[12px] bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-800 ring-1 ring-rose-100">{error}</p> : null}

      <div className={`${D.panel} overflow-x-auto`}>
        <table className="w-full min-w-[860px] text-left text-[12.5px]">
          <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>{["When", "From", "Request", "Result", "What happened", "Time", ""].map((h) => <th key={h} className="px-4 py-2.5 font-bold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className={row.status >= 400 ? "bg-rose-50/40" : ""}>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{when(row.created_at)}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800"><span className="h-2 w-2 rounded-full" style={{ background: KIND_COLORS[row.kind] }} />{row.source_name || (row.kind === "api" ? "API" : "Lead link")}</span>
                  <span className="block text-[11px] text-slate-400">{row.kind === "api" ? "API key" : "Lead link"}{row.ip ? ` · ${row.ip}` : ""}</span>
                </td>
                <td className="px-4 py-2.5"><code className="font-mono text-[11.5px] text-slate-600"><span className="font-bold text-slate-800">{row.method}</span> {row.path}</code></td>
                <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                <td className="max-w-[260px] px-4 py-2.5 text-slate-600">{row.message || (row.status < 400 ? "OK" : "–")}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{row.duration_ms !== null ? `${row.duration_ms} ms` : "–"}</td>
                <td className="px-4 py-2.5 text-right">{row.lead_id ? <Link href={`/leads/${row.lead_id}`} className="font-semibold text-brand-700 hover:underline">Lead</Link> : null}</td>
              </tr>
            ))}
            {!rows.length && !loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">Nothing here yet. Requests appear as soon as a form or app sends something.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] text-slate-400">Requests are kept for 30 days. A wrong or missing key is not listed, because it cannot be linked to your company.</p>
    </div>
  );
}
