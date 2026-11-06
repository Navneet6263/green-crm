"use client";

import { useState } from "react";
import { API_BASE } from "../../lib/api";

export const D = {
  panel: "rounded-[14px] bg-white ring-1 ring-slate-200",
  soft: "rounded-[12px] bg-slate-50 ring-1 ring-slate-100",
  input: "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-50",
  label: "block space-y-1 text-[12px] font-semibold text-slate-600",
  kicker: "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400",
  primary: "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-brand-700 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50",
  ghost: "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  small: "inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[12px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
  danger: "inline-flex h-8 items-center justify-center gap-1.5 rounded-[8px] bg-white px-2.5 text-[12px] font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50",
};

// Categorical colours (validated palette), fixed per meaning.
export const KIND_COLORS = { capture: "#009a8c", api: "#3b6fd8" };

export const LEAD_SOURCES = [
  ["website", "Website"], ["landing-page", "Landing page"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["google", "Google Ads"],
  ["linkedin", "LinkedIn"], ["indiamart", "IndiaMART"], ["justdial", "Justdial"], ["referral", "Referral"], ["other", "Other"],
];
export const sourceLabel = (value) => LEAD_SOURCES.find(([v]) => v === value)?.[1] || value;

/** The public API address, always absolute so it can be pasted into other tools. */
export function apiRoot() {
  const base = API_BASE.startsWith("http") ? API_BASE : typeof window === "undefined" ? API_BASE : `${window.location.origin}${API_BASE}`;
  return `${base.replace(/\/$/, "")}/v1`;
}
export const captureUrl = (token) => `${apiRoot()}/capture/${token}`;

export function when(value, withTime = true) {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}) });
}

export function ago(value) {
  if (!value) return "Never";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
  return `${Math.floor(minutes / 1440)} d ago`;
}

/** "in 5 min" for a time still to come. */
export function until(value) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} min`;
  if (minutes < 1440) return `in ${Math.round(minutes / 60)} h`;
  return `in ${Math.round(minutes / 1440)} d`;
}

export const fmt = (n) => new Intl.NumberFormat("en-IN").format(Number(n) || 0);

export function Badge({ tone = "slate", children }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-rose-50 text-rose-700 ring-rose-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    teal: "bg-brand-50 text-brand-800 ring-brand-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tones[tone] || tones.slate}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  const ok = Number(status) < 400;
  return <Badge tone={ok ? "green" : Number(status) >= 500 ? "red" : "amber"}>{ok ? "✓" : "!"} {status}</Badge>;
}

export function CopyButton({ text, label = "Copy", className = D.small }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_error) {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }
  return <button type="button" onClick={copy} className={className}>{done ? "Copied ✓" : label}</button>;
}

/** A read-only value (link or key) with a copy button. */
export function CopyField({ value, mono = true }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[10px] bg-slate-50 p-1.5 pl-3 ring-1 ring-slate-200">
      <code className={`min-w-0 flex-1 truncate text-[12.5px] text-slate-800 ${mono ? "font-mono" : ""}`} title={value}>{value}</code>
      <CopyButton text={value} />
    </div>
  );
}

export function CodeBlock({ code, title }) {
  return (
    <div className="overflow-hidden rounded-[12px] ring-1 ring-slate-800/80">
      <div className="flex items-center justify-between gap-2 bg-slate-800 px-3 py-1.5">
        <span className="text-[11.5px] font-semibold text-slate-300">{title}</span>
        <CopyButton text={code} className="rounded-[6px] px-2 py-0.5 text-[11.5px] font-semibold text-slate-200 ring-1 ring-slate-600 hover:bg-slate-700" />
      </div>
      <pre className="max-h-[360px] overflow-auto bg-slate-900 p-3 text-[12px] leading-relaxed text-slate-100"><code>{code}</code></pre>
    </div>
  );
}

export function Tabs({ items, value, onChange, size = "md" }) {
  return (
    <div className="flex min-w-0 gap-1 overflow-x-auto rounded-[12px] bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map(([key, label]) => (
        <button key={key} type="button" onClick={() => onChange(key)} aria-pressed={value === key}
          className={`shrink-0 rounded-[9px] px-3 ${size === "sm" ? "py-1 text-[12px]" : "py-1.5 text-[13px]"} font-semibold transition ${value === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, text, action }) {
  return (
    <div className={`${D.panel} grid place-items-center px-6 py-12 text-center`}>
      <div className="grid h-11 w-11 place-items-center rounded-[12px] bg-brand-50 text-brand-700">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /></svg>
      </div>
      <p className="mt-3 text-[15px] font-bold text-slate-900">{title}</p>
      <p className="mt-1 max-w-md text-[13px] text-slate-500">{text}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Notice({ notice, onClose }) {
  if (!notice?.text) return null;
  const tone = notice.tone === "error" ? "bg-rose-50 text-rose-800 ring-rose-100" : "bg-emerald-50 text-emerald-800 ring-emerald-100";
  return (
    <div className={`flex items-start justify-between gap-3 rounded-[12px] px-3.5 py-2.5 text-[13px] ring-1 ${tone}`}>
      <span>{notice.text}</span>
      {onClose ? <button type="button" onClick={onClose} className="text-[12px] font-semibold opacity-70 hover:opacity-100">Close</button> : null}
    </div>
  );
}
