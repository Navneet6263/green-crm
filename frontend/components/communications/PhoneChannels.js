"use client";

import { telHref, whatsappHref } from "../leads/workspace/LeadsTable";
import LockedSend, { lockFor } from "./LockedSend";

const QUICK = {
  whatsapp: ["Hello {name}, following up on our last discussion. Is now a good time to talk?", "Hi {name}, sharing the details you asked for. Let me know if you have any questions.", "Hi {name}, just checking in. Can we schedule a quick call this week?"],
  sms: ["Hi {name}, please call back when free. Thanks.", "Hi {name}, your quote is ready. Shall I send it on email?", "Hi {name}, reminder about our call today."],
};
const LIMIT = { sms: 160, whatsapp: 1000 };

function Ready({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />{label} is connected
    </span>
  );
}

/** WhatsApp and SMS: short message, quick replies, send through the provider (or open WhatsApp directly). */
export function MessageChannel({ w, channel }) {
  const record = w.selectedRecord;
  const lock = lockFor(w.session, w.capabilities, channel);
  const text = w.phoneDrafts[channel] || "";
  const sending = w.sending === `/communications/${channel}`;
  const label = channel === "sms" ? "SMS" : "WhatsApp";
  // "Ms. Rao" stays whole; "Priya Verma" becomes "Priya".
  const contact = String(record.subtitle || "").trim();
  const first = /^(mr|mrs|ms|dr|shri|smt)\.?\s/i.test(contact) ? contact : contact.split(" ")[0] || "there";
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-slate-400">Quick messages</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK[channel].map((q) => {
            const value = q.replace("{name}", first);
            return <button key={q} type="button" onClick={() => w.setPhoneDraft(channel, value)} className="max-w-full truncate rounded-full bg-white px-3 py-1.5 text-[12.5px] text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300">{value}</button>;
          })}
        </div>
      </div>
      <div className="overflow-hidden rounded-[14px] bg-white ring-1 ring-slate-200 focus-within:ring-brand-300">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-[13px]">
          <span className="w-14 shrink-0 text-[12.5px] font-medium text-slate-400">To</span>
          <span className={record.phone ? "font-medium text-slate-800" : "text-slate-400"}>{record.phone || "No phone number on file"}</span>
        </div>
        <textarea value={text} onChange={(e) => w.setPhoneDraft(channel, e.target.value)} rows={6} maxLength={LIMIT[channel] * 4} placeholder={`Write a ${label} message…`} aria-label={`${label} message`}
          className="block min-h-[160px] w-full resize-y px-4 py-3 text-[14px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400" />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
          {lock ? <span className="text-[12px] text-slate-400">Draft only. Sending is locked.</span> : <Ready label={label} />}
          <span className="flex items-center gap-2">
            <span className={`text-[11.5px] ${text.length > LIMIT[channel] ? "font-semibold text-amber-700" : "text-slate-400"}`}>
              {text.length}/{LIMIT[channel]}{channel === "sms" && text.length > LIMIT.sms ? ` · ${Math.ceil(text.length / 153)} SMS` : ""}
            </span>
            {channel === "whatsapp" && record.phone ? (
              <a href={`${whatsappHref(record.phone)}${whatsappHref(record.phone).includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"
                className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-white">Open WhatsApp</a>
            ) : null}
            {lock ? null : (
              <button type="button" onClick={() => w.sendChannel(channel)} disabled={!record.phone || !text.trim() || sending}
                className="rounded-[10px] bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-40">{sending ? "Sending…" : `Send ${label}`}</button>
            )}
          </span>
        </div>
      </div>
      {lock ? <LockedSend lock={lock} channel={channel} session={w.session} /> : null}
    </div>
  );
}

/** Call: through the calling provider (logged in the CRM), or dial from this device. */
export function CallChannel({ w }) {
  const record = w.selectedRecord;
  const lock = lockFor(w.session, w.capabilities, "call");
  const sending = w.sending === "/communications/call";
  return (
    <div className="rounded-[14px] bg-white p-6 text-center ring-1 ring-slate-200">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
      </span>
      <p className="mt-3 text-[18px] font-bold tracking-tight text-slate-900">{record.phone || "No phone number"}</p>
      <p className="text-[13px] text-slate-500">{record.subtitle} · {record.title}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {lock ? null : (
          <button type="button" onClick={() => w.sendChannel("call")} disabled={!record.phone || sending}
            className="rounded-[10px] bg-brand-700 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-40">{sending ? "Calling…" : "Call through CRM"}</button>
        )}
        {record.phone ? <a href={telHref(record.phone)} className="rounded-[10px] px-5 py-2.5 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Dial from this device</a> : null}
      </div>
      <div className="mt-4 text-left">{lock ? <LockedSend lock={lock} channel="call" session={w.session} /> : <div className="text-center"><Ready label="Calling" /></div>}</div>
    </div>
  );
}
