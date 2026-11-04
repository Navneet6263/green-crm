"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";
import { cleanSubject, when } from "../email/EmailThread";
import LockedSend, { lockFor } from "./LockedSend";

const FIELD = "w-full bg-transparent text-[13.5px] text-slate-800 outline-none placeholder:text-slate-400";

function Line({ label, children }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5">
      <span className="w-14 shrink-0 text-[12.5px] font-medium text-slate-400">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** The last few emails sent to this lead from the CRM. */
function RecentEmails({ w }) {
  const [items, setItems] = useState(null);
  const leadId = w.selectedRecord?.entity_type === "lead" ? w.selectedRecord.entity_id : null;
  useEffect(() => {
    if (!leadId || !w.session?.token) { setItems(null); return; }
    apiRequest(`/nudges?lead_id=${encodeURIComponent(leadId)}&scope=customer&page_size=4`, { token: w.session.token, fresh: true })
      .then((res) => setItems(res?.items || []))
      .catch(() => setItems([]));
  }, [leadId, w.session?.token, w.message]);
  if (!items?.length) return null;
  return (
    <div className="rounded-[12px] bg-white p-3 ring-1 ring-slate-200">
      <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-400">Sent before</p>
      <ul className="space-y-1">
        {items.map((n) => (
          <li key={n.id} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="min-w-0 truncate text-slate-700">{cleanSubject(n.subject)}</span>
            <span className="shrink-0 text-slate-400">{n.reply_count ? <b className="mr-2 font-semibold text-emerald-700">{n.reply_count} repl{n.reply_count === 1 ? "y" : "ies"}</b> : null}{when(n.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Email composer: pick a template, edit, send through the company's mail. */
export default function EmailChannel({ w }) {
  const [showCc, setShowCc] = useState(false);
  const capability = w.capabilities.email;
  const lock = lockFor(w.session, w.capabilities, "email");
  const sending = w.sending === "/communications/email";
  const ready = Boolean(w.recipient.trim() && w.subject.trim() && w.body.trim());
  useEffect(() => { setShowCc(Boolean(w.cc)); }, [w.selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-400">Start from a template</p>
        <div className="flex flex-wrap gap-1.5">
          {w.templates.map((t) => (
            <button key={t.id} type="button" aria-pressed={w.selectedTemplateId === t.id} onClick={() => w.chooseTemplate(t)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ${w.selectedTemplateId === t.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300"}`}>{t.name}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[14px] bg-white ring-1 ring-slate-200 focus-within:ring-brand-300">
        <Line label="To">
          <div className="flex items-center gap-2">
            <input type="email" value={w.recipient} onChange={(e) => w.setRecipient(e.target.value)} placeholder="customer@company.com" aria-label="To" className={FIELD} />
            {!showCc ? <button type="button" onClick={() => setShowCc(true)} className="shrink-0 text-[12px] font-semibold text-slate-400 hover:text-brand-700">Cc</button> : null}
          </div>
        </Line>
        {showCc ? <Line label="Cc"><input value={w.cc} onChange={(e) => w.setCc(e.target.value)} placeholder="manager@company.com, ops@company.com" aria-label="CC" className={FIELD} /></Line> : null}
        <Line label="Subject"><input value={w.subject} onChange={(e) => w.setSubject(e.target.value)} placeholder="What is this about?" aria-label="Subject" className={`${FIELD} font-semibold`} /></Line>
        <textarea value={w.body} onChange={(e) => w.setBody(e.target.value)} rows={12} placeholder="Write your email…" aria-label="Message"
          className="block min-h-[260px] w-full resize-y px-4 py-3 text-[14px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400" />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
          {lock ? <span className="text-[12px] text-slate-400">Draft only. Sending is locked.</span> : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {capability.source === "platform" ? "Sends through GreenCRM mail" : "Sends through your company mail"}
            </span>
          )}
          <span className="flex items-center gap-2">
            <span className="hidden text-[11.5px] text-slate-400 sm:inline">{w.body.length.toLocaleString("en-IN")} characters</span>
            <button type="button" onClick={w.copyDraft} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-white">{w.copyState === "copied" ? "Copied ✓" : "Copy"}</button>
            {lock ? null : (
              <button type="button" onClick={w.sendEmail} disabled={!ready || sending}
                className="inline-flex items-center gap-2 rounded-[10px] bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-40">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                {sending ? "Sending…" : "Send email"}
              </button>
            )}
          </span>
        </div>
      </div>
      {lock ? <LockedSend lock={lock} channel="email" session={w.session} /> : null}
      <RecentEmails w={w} />
    </div>
  );
}
