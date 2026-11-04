"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../lib/api";
import { loadUsersForScope, resolveSessionCompanyId } from "../../lib/teamScope";
import { canCaptureScreen, captureFullPage, captureThisTab, imageToDataUrl, pastedImage } from "./screenshot";

const FIELD = "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-800 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const ccKey = (userId) => `greencrm:nudge-cc:${userId || "me"}`;
const readCc = (userId) => { try { return JSON.parse(window.localStorage.getItem(ccKey(userId)) || "[]"); } catch (_e) { return []; } };
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const first = (name) => String(name || "").split(" ")[0];
const fmt = (value) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

function leadTemplates(lead) {
  const late = lead?.follow_up_date ? Math.floor((Date.now() - new Date(lead.follow_up_date).getTime()) / 86400000) : 0;
  const who = lead?.contact_person || "the customer";
  return [
    ["Follow-up overdue", late > 0 ? `The follow-up for this lead was due on ${fmt(lead.follow_up_date)} (${late} day${late === 1 ? "" : "s"} ago). Please call ${who} today and update the CRM.` : `Please follow up with ${who} and update the CRM.`],
    ["Update the CRM", "This lead has no recent update. Please add what happened on your last call and set the next follow-up date."],
    ["Call today", `Please call ${who} today and let me know how it went.`],
    ["Good work", "Good work on this lead. Keep it moving."],
  ];
}
const personTemplates = (name) => [
  ["Clear overdue", `Hi ${first(name)}, your overdue follow-ups are listed below. Please clear them today and update the CRM.`],
  ["Weekly report", "Here is your CRM report. Please go through it and let me know if anything needs help."],
  ["Update the CRM", "Several of your leads have no recent update. Please add notes and next follow-up dates today."],
  ["Good work", "Good work this week. Keep it up."],
];

/**
 * Admin-only email about a lead or a person: To (CRM users), CC (remembered), message, screenshot,
 * and the lead summary or Excel report attached by the server.
 */
export default function EmailNudgeDialog({ open, onClose, session, kind = "lead", lead, person, defaultTo = [], period, onSent }) {
  const [users, setUsers] = useState([]);
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [ccDraft, setCcDraft] = useState("");
  const [rememberCc, setRememberCc] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [shot, setShot] = useState("");
  const [attachReport, setAttachReport] = useState(true);
  const [config, setConfig] = useState(null);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(null);
  const fileRef = useRef(null);
  const userId = session?.user?.user_id;
  const templates = useMemo(() => (kind === "person" ? personTemplates(person?.name) : leadTemplates(lead)), [kind, lead, person]);

  useEffect(() => {
    if (!open || !session?.token) return;
    setSent(null); setError(""); setShot(""); setCcDraft("");
    setTo(defaultTo.filter(Boolean));
    setCc(readCc(userId));
    setSubject(kind === "person" ? `Your CRM report: ${person?.name || ""}` : `Follow-up needed: ${lead?.company_name || lead?.contact_person || ""}`);
    setMessage(templates[0][1]);
    loadUsersForScope(session.token, { companyId: resolveSessionCompanyId(session), pageSize: 300 })
      .then((list) => setUsers(list.filter((u) => u.email && u.is_active !== false && u.is_active !== 0)))
      .catch(() => setUsers([]));
    apiRequest("/nudges/config", { token: session.token, fresh: true }).then(setConfig).catch(() => setConfig({ mail_ready: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === "Escape" && !busy) onClose(); };
    const onPaste = async (event) => {
      const file = pastedImage(event);
      if (!file) return;
      event.preventDefault();
      try { setShot(await imageToDataUrl(file)); } catch (err) { setError(err.message); }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("paste", onPaste);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("paste", onPaste); };
  }, [open, busy, onClose]);

  if (!open) return null;

  const addCc = (value) => {
    const emails = String(value || ccDraft).split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    const bad = emails.find((e) => !EMAIL_RE.test(e));
    if (bad) { setError(`"${bad}" is not a valid email address.`); return; }
    setError("");
    setCc((list) => [...new Set([...list, ...emails])].slice(0, 10));
    setCcDraft("");
  };

  async function capture(full = true) {
    setError("");
    setHidden(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setShot(await (full ? captureFullPage() : captureThisTab()));
    } catch (err) {
      if (err?.name !== "NotAllowedError") setError(err.message || "The screenshot could not be taken.");
    } finally {
      setHidden(false);
    }
  }

  async function send() {
    if (ccDraft.trim()) addCc(ccDraft);
    if (!to.length) { setError("Choose who should get this email."); return; }
    setBusy(true);
    setError("");
    try {
      const body = {
        kind, to_user_ids: to, cc: [...cc, ...(EMAIL_RE.test(ccDraft.trim()) ? [ccDraft.trim().toLowerCase()] : [])], subject, message, screenshot: shot || undefined,
        ...(kind === "lead" ? { lead_id: lead.lead_id } : { about_user_id: person.user_id, attach_report: attachReport, ...(period || {}) }),
      };
      const result = await apiRequest("/nudges", { method: "POST", body, token: session.token });
      try { if (rememberCc) window.localStorage.setItem(ccKey(userId), JSON.stringify(body.cc)); } catch (_e) { /* storage unavailable */ }
      setSent(result);
      onSent?.(result);
    } catch (err) {
      setError(err.message || "The email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  const toUsers = users.filter((u) => to.includes(u.user_id));
  const others = users.filter((u) => !to.includes(u.user_id));

  return (
    <div className={`fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 ${hidden ? "invisible" : ""}`} onClick={() => !busy && onClose()}>
      <div role="dialog" aria-label="Send email" onClick={(e) => e.stopPropagation()} className="tw-buttons flex max-h-[94dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:rounded-[18px]">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-bold text-slate-900">Email {kind === "person" ? person?.name : "about this lead"}</h2>
            <p className="truncate text-[12.5px] text-slate-500">{kind === "person" ? "Their numbers and overdue follow-ups go in the email" : `${lead?.company_name || lead?.contact_person} · the lead summary and a link go in the email`}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
        </header>

        {sent ? (
          <div className="space-y-3 px-5 py-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-[22px] text-emerald-600">✓</div>
            <p className="text-[15px] font-semibold text-slate-900">Email sent</p>
            <p className="text-[13px] text-slate-600">To {sent.to.join(", ")}{sent.cc?.length ? ` · CC ${sent.cc.join(", ")}` : ""}</p>
            <p className="text-[12px] text-slate-400">Ref {sent.ref_code} · replies will show under Email → Replies{config?.inbox?.connected ? "" : " once the Microsoft 365 inbox is connected"}</p>
            <button type="button" onClick={onClose} className="mt-2 rounded-[10px] bg-brand-700 px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-800">Done</button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {config && !config.mail_ready ? <p className="rounded-[10px] bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">Email is not set up for this company yet, so sending will fail. Ask for the mail settings to be checked.</p> : null}
              <div>
                <p className="mb-1 text-[12px] font-semibold text-slate-600">To</p>
                <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-slate-200 p-1.5">
                  {toUsers.map((u) => (
                    <span key={u.user_id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1 text-[12.5px] font-medium text-brand-800">
                      {u.name}<button type="button" aria-label={`Remove ${u.name}`} onClick={() => setTo((l) => l.filter((id) => id !== u.user_id))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-brand-100">×</button>
                    </span>
                  ))}
                  <select aria-label="Add a person" value="" onChange={(e) => e.target.value && setTo((l) => [...l, e.target.value])} className="h-7 min-w-[140px] flex-1 bg-transparent px-1 text-[12.5px] text-slate-600 outline-none">
                    <option value="">{users.length ? "+ Add a person" : "Loading people…"}</option>
                    {others.map((u) => <option key={u.user_id} value={u.user_id}>{u.name} · {u.email}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p className="mb-1 text-[12px] font-semibold text-slate-600">CC <span className="font-normal text-slate-400">(any email, e.g. yours)</span></p>
                <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-slate-200 p-1.5">
                  {cc.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-[12.5px] text-slate-700">
                      {email}<button type="button" aria-label={`Remove ${email}`} onClick={() => setCc((l) => l.filter((e) => e !== email))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-slate-200">×</button>
                    </span>
                  ))}
                  <input value={ccDraft} onChange={(e) => setCcDraft(e.target.value)} onBlur={() => ccDraft.trim() && addCc()} onKeyDown={(e) => { if (["Enter", ",", " "].includes(e.key)) { e.preventDefault(); if (ccDraft.trim()) addCc(); } }}
                    placeholder={cc.length ? "Add another" : "name@company.com"} aria-label="CC email" className="h-7 min-w-[160px] flex-1 px-1 text-[13px] outline-none" />
                </div>
                <label className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500"><input type="checkbox" checked={rememberCc} onChange={(e) => setRememberCc(e.target.checked)} />Always CC these addresses</label>
              </div>
              <label className="block text-[12px] font-semibold text-slate-600">Subject
                <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} className={`${FIELD} mt-1`} />
              </label>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-[12px] font-semibold text-slate-600">Message</span>
                  {templates.map(([name, text]) => (
                    <button key={name} type="button" onClick={() => setMessage(text)} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-600 hover:bg-slate-200">{name}</button>
                  ))}
                </div>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={5000} className={FIELD} />
              </div>
              <div>
                <p className="mb-1 text-[12px] font-semibold text-slate-600">Screenshot <span className="font-normal text-slate-400">(optional · you can also paste one with Ctrl+V)</span></p>
                {shot ? (
                  <div className="relative overflow-hidden rounded-[10px] ring-1 ring-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot} alt="Screenshot to send" className="max-h-[260px] w-full object-contain object-top" />
                    <button type="button" onClick={() => setShot("")} className="absolute right-2 top-2 rounded-full bg-slate-900/75 px-2.5 py-1 text-[12px] font-semibold text-white">Remove</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {canCaptureScreen() ? (
                      <>
                        <button type="button" onClick={() => capture(true)} className="inline-flex items-center gap-1.5 rounded-[10px] bg-slate-900 px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-slate-800">Capture full page</button>
                        <button type="button" onClick={() => capture(false)} className="rounded-[10px] px-3 py-2 text-[12.5px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Only what is on screen</button>
                      </>
                    ) : null}
                    <button type="button" onClick={() => fileRef.current?.click()} className="rounded-[10px] px-3 py-2 text-[12.5px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Upload image</button>
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={async (e) => { try { setShot(await imageToDataUrl(e.target.files?.[0])); } catch (err) { setError(err.message); } e.target.value = ""; }} />
                  </div>
                )}
              </div>
              {kind === "person" ? (
                <label className="flex items-center gap-2 text-[13px] text-slate-700"><input type="checkbox" checked={attachReport} onChange={(e) => setAttachReport(e.target.checked)} />Attach their Excel report</label>
              ) : null}
            </div>
            <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
              {error ? <p role="alert" className="min-w-0 flex-1 text-[12.5px] text-rose-700">{error}</p> : <p className="min-w-0 flex-1 truncate text-[12px] text-slate-400">The link in the email opens after login.</p>}
              <button type="button" onClick={onClose} disabled={busy} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={send} disabled={busy || !to.length} className="rounded-[10px] bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{busy ? "Sending…" : "Send email"}</button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
