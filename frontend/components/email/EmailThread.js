"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export const cleanSubject = (subject) => String(subject || "").replace(/\s*\[Ref N-[0-9A-F]{6}\]\s*$/i, "");
export const when = (value) => (value ? new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }) : "");

/** One sent email with its replies, loaded when opened. */
export function EmailThread({ token, nudge }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    apiRequest(`/nudges/${nudge.id}`, { token, fresh: true })
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((err) => { if (!cancelled) setError(err.message || "This email could not load."); });
    return () => { cancelled = true; };
  }, [token, nudge.id]);
  const n = detail || nudge;
  return (
    <div className="space-y-3">
      <article className="rounded-[12px] bg-white p-4 ring-1 ring-slate-200">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] font-semibold text-slate-900">{n.sent_by_name || "Admin"} <span className="font-normal text-slate-400">sent</span></p>
          <span className="text-[11.5px] text-slate-400">{when(n.created_at)} · Ref {n.ref_code}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-slate-500">To {n.to_emails.join(", ")}{n.cc_emails.length ? ` · CC ${n.cc_emails.join(", ")}` : ""}</p>
        <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{n.body}</p>
        <p className="mt-2 flex flex-wrap gap-2 text-[11.5px] text-slate-500">
          {n.has_screenshot ? <span className="rounded-full bg-slate-100 px-2 py-0.5">Screenshot attached</span> : null}
          {n.kind === "lead" ? <span className="rounded-full bg-slate-100 px-2 py-0.5">Lead summary included</span> : null}
          {n.delivery !== "email" ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">Not delivered{n.error ? `: ${n.error}` : ""}</span> : null}
        </p>
      </article>
      {error ? <p role="alert" className="text-[12.5px] text-rose-700">{error}</p> : null}
      {!detail && !error ? <div className="h-16 animate-pulse rounded-[12px] bg-slate-100" /> : null}
      {detail?.replies?.map((r) => (
        <article key={r.id} className="ml-4 rounded-[12px] bg-gold-50/60 p-4 ring-1 ring-gold-100 sm:ml-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-slate-900">{r.from_name || r.from_email} <span className="font-normal text-slate-400">replied</span></p>
            <span className="text-[11.5px] text-slate-400">{when(r.received_at)}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-slate-700">{r.body_text || "(no text)"}</p>
        </article>
      ))}
      {detail && !detail.replies?.length ? <p className="ml-4 text-[12.5px] text-slate-400 sm:ml-8">No reply yet.</p> : null}
    </div>
  );
}
