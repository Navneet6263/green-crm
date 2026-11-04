"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/api";
import { colorFor } from "../../dashboard/home/widgetCatalog";

const initials = (t) => String(t || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Who works on this account: the owner plus anyone added to help. */
export default function MembersCard({ token, customer, users, canEdit }) {
  const [members, setMembers] = useState([]);
  const [pick, setPick] = useState("");
  const [error, setError] = useState("");
  const load = () => apiRequest(`/customers/${encodeURIComponent(customer.customer_id)}/members`, { token, fresh: true })
    .then((r) => setMembers(Array.isArray(r) ? r : r?.items || r?.data || []))
    .catch(() => setMembers([]));
  useEffect(() => { if (token) load(); }, [token, customer.customer_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const taken = new Set([customer.assigned_to, ...members.map((m) => m.user_id)]);
  async function add() {
    if (!pick) return;
    setError("");
    try { await apiRequest(`/customers/${encodeURIComponent(customer.customer_id)}/members`, { method: "POST", token, body: { user_id: pick } }); setPick(""); load(); } catch (e) { setError(e.message); }
  }
  async function remove(userId) {
    try { await apiRequest(`/customers/${encodeURIComponent(customer.customer_id)}/members/${encodeURIComponent(userId)}`, { method: "DELETE", token }); load(); } catch (e) { setError(e.message); }
  }

  const people = [{ user_id: customer.assigned_to, name: customer.assigned_to_name || "Unassigned", owner: true }, ...members.map((m) => ({ ...m, name: m.name || m.user_name || m.user_id }))].filter((p) => p.user_id);
  return (
    <section className="rounded-[14px] bg-white ring-1 ring-slate-200">
      <header className="border-b border-slate-100 px-4 py-3"><h2 className="flex items-center gap-2 text-[14.5px] font-bold text-slate-900"><span className="h-3.5 w-1 rounded-full bg-sky-500" />Account team</h2></header>
      <ul className="space-y-1 p-3">
        {people.map((p) => (
          <li key={p.user_id} className="flex items-center gap-2.5 rounded-[8px] px-1.5 py-1">
            <span className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: colorFor(p.user_id) }}>{initials(p.name)}</span>
            <span className="min-w-0 flex-1 text-[13px]"><b className="block truncate font-semibold text-slate-800">{p.name}</b><span className="text-[11.5px] text-slate-400">{p.owner ? "Owner" : "Helps on this account"}</span></span>
            {canEdit && !p.owner ? <button type="button" onClick={() => remove(p.user_id)} className="text-[11.5px] font-semibold text-slate-300 hover:text-rose-600">Remove</button> : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <div className="flex gap-2 border-t border-slate-100 p-3">
          <select aria-label="Add a person" value={pick} onChange={(e) => setPick(e.target.value)} className="h-9 min-w-0 flex-1 rounded-[10px] border border-slate-200 bg-white px-2 text-[13px]">
            <option value="">Add someone to help…</option>
            {users.filter((u) => !taken.has(u.user_id)).map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
          </select>
          <button type="button" onClick={add} disabled={!pick} className="rounded-[10px] bg-slate-900 px-3 text-[12.5px] font-semibold text-white disabled:opacity-40">Add</button>
        </div>
      ) : null}
      {error ? <p role="alert" className="px-4 pb-3 text-[12.5px] text-rose-700">{error}</p> : null}
    </section>
  );
}
