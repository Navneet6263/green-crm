"use client";

import { useCallback, useEffect, useState } from "react";
import SideDrawer from "../../components/ui/SideDrawer";
import { Badge, D, Tabs, until, when } from "./dev-ui";

const STATES = [["", "All"], ["sent", "Delivered"], ["pending", "Waiting"], ["failed", "Failed"]];
const TONE = { sent: "green", pending: "blue", sending: "blue", failed: "amber", dead: "red" };
const LABEL = { sent: "Delivered", pending: "Waiting", sending: "Sending", failed: "Will retry", dead: "Gave up" };

/** The calls made to one webhook: result, tries, next retry, and a Resend button. */
export default function DeliveriesDrawer({ hook, dev, onClose }) {
  const [filter, setFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(0);
  const { loadDeliveries } = dev;

  const load = useCallback(async () => {
    if (!hook) return;
    setLoading(true);
    try {
      setRows(await loadDeliveries(Object.fromEntries(Object.entries({ webhook_id: hook.webhook_id, state: filter }).filter(([, v]) => v))));
    } catch (_error) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [hook, filter, loadDeliveries]);

  useEffect(() => { load(); }, [load]);

  async function resend(id) {
    setBusy(id);
    try {
      await dev.resendDelivery(id);
      await load();
    } finally {
      setBusy(0);
    }
  }

  return (
    <SideDrawer open={Boolean(hook)} onClose={onClose} width="max-w-[760px]" title={`Deliveries: ${hook?.name || ""}`} subtitle={hook?.url}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tabs items={STATES} value={filter} onChange={setFilter} size="sm" />
          <button type="button" className={D.small} onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
        </div>
        <div className={`${D.panel} overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>{["When", "Event", "Result", "Tries", "Answer", ""].map((h) => <th key={h} className="px-3 py-2.5 font-bold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{when(row.created_at)}</td>
                  <td className="px-3 py-2.5"><code className="font-mono text-[11.5px] font-semibold text-slate-800">{row.event}</code><span className="block text-[10.5px] text-slate-400">{row.event_id}</span></td>
                  <td className="px-3 py-2.5">
                    <Badge tone={TONE[row.state]}>{LABEL[row.state] || row.state}</Badge>
                    {row.state === "failed" ? <span className="mt-0.5 block text-[11px] text-slate-400">next try {until(row.next_attempt_at)}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{row.attempts}</td>
                  <td className="max-w-[220px] px-3 py-2.5 text-slate-600">
                    {row.response_status ? <span className="font-semibold text-slate-800">{row.response_status}</span> : null}
                    {row.duration_ms !== null && row.duration_ms !== undefined ? <span className="ml-1 text-slate-400">{row.duration_ms} ms</span> : null}
                    {row.error ? <span className="block truncate text-[11px] text-rose-700" title={row.error}>{row.error}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right">{row.state !== "sending" ? <button type="button" className={D.small} disabled={busy === row.id} onClick={() => resend(row.id)}>Resend</button> : null}</td>
                </tr>
              ))}
              {!rows.length && !loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-[13px] text-slate-500">No calls yet. Use “Send test” or change a lead.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <p className="text-[11.5px] text-slate-400">Calls are kept for 30 days. The same event can arrive twice after a retry, so your app should skip event ids it has already handled.</p>
      </div>
    </SideDrawer>
  );
}
