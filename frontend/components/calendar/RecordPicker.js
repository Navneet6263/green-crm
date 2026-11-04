"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

const FIELD = "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50";

/** Finds a lead or customer to link the task to. */
export default function RecordPicker({ token, value, onChange }) {
  const [kind, setKind] = useState(value?.kind || "lead");
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (term.trim().length < 2) { setResults([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(() => {
      setBusy(true);
      const path = kind === "lead" ? "/leads" : "/customers";
      apiRequest(`${path}?search=${encodeURIComponent(term.trim())}&page_size=6`, { token })
        .then((r) => { if (!cancelled) setResults(r?.items || r?.data || []); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setBusy(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [term, kind, token]);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-[10px] bg-brand-50 px-3 py-2 ring-1 ring-brand-100">
        <span className="rounded-[6px] bg-white px-1.5 py-0.5 text-[10.5px] font-bold uppercase text-brand-700">{value.kind}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{value.name}</span>
        {value.phone ? <span className="text-xs tabular-nums text-slate-500">{value.phone}</span> : null}
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-slate-500 hover:text-rose-600">Remove</button>
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex shrink-0 rounded-[10px] bg-slate-100 p-0.5">
          {[["lead", "Lead"], ["customer", "Customer"]].map(([key, text]) => (
            <button key={key} type="button" onClick={() => { setKind(key); setResults([]); }}
              className={`rounded-[8px] px-2.5 py-1.5 text-xs font-semibold ${kind === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{text}</button>
          ))}
        </div>
        <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={`Search ${kind} by company, name or phone`} className={FIELD} />
      </div>
      {term.trim().length >= 2 ? (
        <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-[10px] bg-white p-1 shadow-lg ring-1 ring-slate-200">
          {busy && !results.length ? <li className="px-3 py-2 text-xs text-slate-400">Searching…</li> : null}
          {!busy && !results.length ? <li className="px-3 py-2 text-xs text-slate-400">No {kind} found</li> : null}
          {results.map((r) => {
            const id = kind === "lead" ? r.lead_id : r.customer_id;
            const name = r.company_name || r.contact_person || r.name || id;
            const sub = [kind === "lead" ? r.contact_person : r.name, r.phone, r.status].filter(Boolean).join(" · ");
            return (
              <li key={id}>
                <button type="button" onClick={() => { onChange({ kind, id, name, phone: r.phone || "" }); setTerm(""); }}
                  className="w-full rounded-[8px] px-3 py-2 text-left hover:bg-brand-50">
                  <span className="block text-sm font-semibold text-slate-900">{name}</span>
                  {sub ? <span className="block text-xs text-slate-500">{sub}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
