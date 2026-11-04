"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../lib/api";

/** Message box: Enter sends, Shift+Enter adds a line. A lead can be attached so everyone can open it. */
export default function Composer({ token, chatKey, replyTo, onCancelReply, onSend, onTyping, disabled }) {
  const [text, setText] = useState("");
  const [lead, setLead] = useState(null);
  const [findLead, setFindLead] = useState(false);
  const [leadQuery, setLeadQuery] = useState("");
  const [leadResults, setLeadResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const box = useRef(null);

  useEffect(() => { setText(""); setLead(null); setFindLead(false); setError(""); box.current?.focus(); }, [chatKey]);
  useEffect(() => { if (replyTo) box.current?.focus(); }, [replyTo]);
  useEffect(() => {
    if (!findLead || leadQuery.trim().length < 2) { setLeadResults([]); return undefined; }
    const t = setTimeout(() => {
      apiRequest(`/leads?search=${encodeURIComponent(leadQuery.trim())}&page_size=6`, { token })
        .then((res) => setLeadResults(res?.items || res?.data || res || []))
        .catch(() => setLeadResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [findLead, leadQuery, token]);

  async function submit() {
    if (busy || (!text.trim() && !lead)) return;
    setBusy(true);
    setError("");
    try {
      await onSend({ text: text.trim(), leadId: lead?.lead_id, replyTo: replyTo?.id });
      setText("");
      setLead(null);
      onCancelReply?.();
      onTyping(false);
      if (box.current) box.current.style.height = "";
    } catch (err) {
      setError(err.message || "The message could not be sent.");
    } finally {
      setBusy(false);
      box.current?.focus();
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      {replyTo ? (
        <div className="mb-2 flex items-center gap-2 rounded-[10px] bg-slate-50 px-3 py-1.5 text-[12.5px] ring-1 ring-slate-100">
          <span className="h-6 w-1 rounded-full bg-brand-600" />
          <span className="min-w-0 flex-1 truncate"><b className="font-semibold text-slate-800">Replying to {replyTo.sender_name}</b> <span className="text-slate-500">{replyTo.text}</span></span>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="text-slate-400 hover:text-slate-700">×</button>
        </div>
      ) : null}
      {lead ? (
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gold-50 py-1 pl-3 pr-1.5 text-[12.5px] font-medium text-gold-900 ring-1 ring-gold-100">
          Lead: {lead.company_name || lead.contact_person}
          <button type="button" onClick={() => setLead(null)} aria-label="Remove lead" className="grid h-5 w-5 place-items-center rounded-full hover:bg-gold-100">×</button>
        </div>
      ) : null}
      {findLead ? (
        <div className="relative mb-2">
          <input autoFocus value={leadQuery} onChange={(e) => setLeadQuery(e.target.value)} placeholder="Find a lead by name or phone" aria-label="Find a lead"
            className="h-9 w-full rounded-[10px] border border-slate-200 px-3 text-[13px] outline-none focus:border-brand-300" />
          {leadResults.length ? (
            <ul className="absolute bottom-full z-10 mb-1 w-full overflow-hidden rounded-[10px] bg-white shadow-lg ring-1 ring-slate-200">
              {leadResults.map((l) => (
                <li key={l.lead_id}>
                  <button type="button" onClick={() => { setLead(l); setFindLead(false); setLeadQuery(""); box.current?.focus(); }} className="block w-full px-3 py-2 text-left text-[13px] hover:bg-slate-50">
                    <b className="font-semibold text-slate-800">{l.company_name || l.contact_person}</b> <span className="text-slate-500">{[l.contact_person, l.phone].filter(Boolean).join(" · ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-end gap-2">
        <button type="button" onClick={() => setFindLead((v) => !v)} title="Attach a lead" aria-label="Attach a lead" aria-pressed={findLead}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] ${findLead ? "bg-gold-100 text-gold-900" : "text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7L14 4.5a3.3 3.3 0 0 1 4.7 4.7L10 17.9a1.7 1.7 0 0 1-2.4-2.4L15.5 7.6" /></svg>
        </button>
        <textarea ref={box} value={text} rows={1} disabled={disabled} placeholder={disabled ? "You can't write here" : "Write a message…"} aria-label="Message"
          onChange={(e) => { setText(e.target.value); onTyping(Boolean(e.target.value)); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
          className="max-h-40 min-h-10 flex-1 resize-none rounded-[12px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-[14px] leading-snug outline-none focus:border-brand-300 focus:bg-white" />
        <button type="button" onClick={submit} disabled={busy || disabled || (!text.trim() && !lead)} aria-label="Send"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-brand-700 text-white hover:bg-brand-800 disabled:opacity-40">
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6" /></svg>
        </button>
      </div>
      {error ? <p role="alert" className="mt-1.5 text-[12px] text-rose-700">{error}</p> : <p className="mt-1 hidden text-[11px] text-slate-400 sm:block">Enter to send · Shift+Enter for a new line</p>}
    </div>
  );
}
