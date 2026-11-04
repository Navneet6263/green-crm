"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { EmailThread, cleanSubject, when } from "./EmailThread";

const SCOPES = [["", "All"], ["customer", "To customers"], ["team", "To team"]];
const REPLIES = [["", "Any"], ["with", "Replied"], ["without", "Waiting"]];
const chip = (on) => `rounded-full px-3 py-1 text-[12px] font-semibold ${on ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

/** Every email sent from the CRM (to customers and to the team), with replies. Admins see all; others what they sent or got. */
export default function SentEmails({ session, initialLeadId = "", onInbox }) {
  const [scope, setScope] = useState("");
  const [replies, setReplies] = useState("");
  const [search, setSearch] = useState("");
  const [leadId, setLeadId] = useState(initialLeadId);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState(null);

  const load = useCallback(() => {
    if (!session?.token) return;
    const params = new URLSearchParams({ page_size: "50", ...(scope ? { scope } : {}), ...(replies ? { replies } : {}), ...(search.trim() ? { search: search.trim() } : {}), ...(leadId ? { lead_id: leadId } : {}) });
    apiRequest(`/nudges?${params}`, { token: session.token, fresh: true })
      .then((res) => { setData(res); setError(""); onInbox?.(res.inbox); setPicked((p) => (p && res.items.some((n) => n.id === p.id) ? p : res.items[0] || null)); })
      .catch((err) => setError(err.message || "Emails could not load."));
  }, [session?.token, scope, replies, search, leadId, onInbox]);
  useEffect(() => { const t = setTimeout(load, search ? 300 : 0); return () => clearTimeout(t); }, [load, search]);

  const items = data?.items || [];
  const isAdmin = session?.user?.role === "admin";
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <section className="min-w-0 rounded-[14px] bg-white ring-1 ring-slate-200">
        <div className="space-y-2 border-b border-slate-100 p-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, address or text" aria-label="Search emails"
            className="h-9 w-full rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-brand-300 focus:bg-white" />
          <div className="flex flex-wrap gap-1">
            {SCOPES.map(([key, name]) => <button key={key || "all"} type="button" aria-pressed={scope === key} onClick={() => setScope(key)} className={chip(scope === key)}>{name}</button>)}
          </div>
          <div className="flex flex-wrap gap-1">
            {REPLIES.map(([key, name]) => <button key={key || "any"} type="button" aria-pressed={replies === key} onClick={() => setReplies(key)} className={chip(replies === key)}>{name}</button>)}
            {leadId ? <button type="button" onClick={() => setLeadId("")} className="rounded-full bg-gold-100 px-3 py-1 text-[12px] font-semibold text-gold-800">This lead only ×</button> : null}
          </div>
        </div>
        {error ? <p role="alert" className="m-3 rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p> : null}
        {!data && !error ? <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-[10px] bg-slate-100" />)}</div>
          : items.length ? (
            <ul className="max-h-[66dvh] divide-y divide-slate-100 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => setPicked(n)} className={`w-full px-4 py-3 text-left ${picked?.id === n.id ? "bg-brand-50/60" : "hover:bg-slate-50"}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[13.5px] font-semibold text-slate-900">{cleanSubject(n.subject)}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{when(n.last_reply_at || n.created_at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-[12px] text-slate-500">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className={`shrink-0 rounded-full px-1.5 text-[10.5px] font-bold ${n.kind === "customer" ? "bg-sky-50 text-sky-700" : "bg-gold-50 text-gold-800"}`}>{n.kind === "customer" ? "Customer" : "Team"}</span>
                        <span className="min-w-0 truncate">{n.sent_by_name} → {n.to_emails.join(", ")}</span>
                      </span>
                      {n.reply_count ? <span className="shrink-0 rounded-full bg-emerald-100 px-2 text-[11px] font-bold text-emerald-800">{n.reply_count}</span>
                        : n.delivery !== "email" ? <span className="shrink-0 text-[11px] font-semibold text-rose-600">Failed</span> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-10 text-center text-[13px] text-slate-400">No emails here yet.{isAdmin ? " Write to a customer, or use “Email owner” on a lead." : ""}</p>}
      </section>
      <section className="min-w-0">
        {picked ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="min-w-0 text-[16px] font-bold text-slate-900">{cleanSubject(picked.subject)}</h2>
              {picked.link_path ? <Link href={picked.link_path} prefetch={false} className="text-[12.5px] font-semibold text-brand-700 hover:underline">{picked.kind === "person" ? "Open report" : picked.customer_id ? "Open customer" : "Open lead"}</Link> : null}
            </div>
            <EmailThread token={session.token} nudge={picked} />
          </div>
        ) : <div className="grid h-full min-h-[200px] place-items-center rounded-[14px] border border-dashed border-slate-300 text-[13px] text-slate-400">Choose an email</div>}
      </section>
    </div>
  );
}
