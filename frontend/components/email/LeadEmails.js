"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { EmailThread, cleanSubject, when } from "./EmailThread";

/** Admin emails about this lead and their replies. Hidden when there are none. */
export default function LeadEmails({ session, leadId }) {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (!session?.token || !leadId) return;
    apiRequest(`/nudges?lead_id=${encodeURIComponent(leadId)}&page_size=10`, { token: session.token, fresh: true })
      .then((res) => setItems(res?.items || []))
      .catch(() => setItems([]));
  }, [session?.token, leadId]);
  if (!items?.length) return null;
  return (
    <section className="rounded-[14px] bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Emails</h2>
        <Link href={`/email?tab=sent&lead_id=${encodeURIComponent(leadId)}`} prefetch={false} className="text-[12px] font-semibold text-brand-700 hover:underline">All</Link>
      </div>
      <ul className="space-y-1.5">
        {items.map((n) => (
          <li key={n.id}>
            <button type="button" onClick={() => setOpen(open === n.id ? null : n.id)} className="w-full rounded-[10px] px-2 py-1.5 text-left hover:bg-slate-50">
              <span className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[13px] font-semibold text-slate-800">{cleanSubject(n.subject)}</span>
                {n.reply_count ? <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-bold text-gold-800">{n.reply_count} repl{n.reply_count === 1 ? "y" : "ies"}</span> : null}
              </span>
              <span className="block truncate text-[11.5px] text-slate-500">{n.sent_by_name} → {n.to_emails.join(", ")} · {when(n.created_at)}</span>
            </button>
            {open === n.id ? <div className="mt-2"><EmailThread token={session.token} nudge={n} /></div> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
