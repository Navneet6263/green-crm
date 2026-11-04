"use client";

import { useMemo, useState } from "react";
import { KINDS, ago, fmtDateTime, parseNote } from "../../updates/updateUtils";
import { label } from "../../updates/updateUtils";

const ACTIVITY_TONES = {
  call: ["Call", "bg-sky-500"], email: ["Email", "bg-violet-500"], meeting: ["Meeting", "bg-violet-500"], task: ["Follow-up scheduled", "bg-brand-600"],
  assigned: ["Owner changed", "bg-slate-500"], comment: ["Comment", "bg-slate-400"], note: ["Note", "bg-gold-500"], updated: ["Updated", "bg-slate-400"],
};
const FILTERS = [["all", "All"], ["talk", "Calls & follow-ups"], ["status", "Status"], ["note", "Notes"], ["system", "System"]];

const normalise = (value) => String(value || "").replace(/^Lead (updated|reassigned)\.\s*/i, "").replace(/\s+/g, " ").trim().toLowerCase();

/** Notes and activity in one list. Activity that only repeats a note is left out. */
export function buildTimeline(notes = [], activity = []) {
  const written = notes.map((n) => normalise(String(n.content || "").split(/\n\s*Changes:/i)[0]));
  const items = notes.map((n, i) => {
    const parsed = parseNote(n.content);
    return { key: `n-${n.id || n.note_id || i}`, source: "note", at: n.created_at, by: n.created_by_name, parsed, group: parsed.kind === "status" || parsed.kind === "demo" ? "status" : parsed.kind === "followup" ? "talk" : "note" };
  });
  activity.forEach((a, i) => {
    const text = normalise(a.description);
    if (text && written.some((w) => w && (w === text || w.startsWith(text) || text.startsWith(w)))) return;
    items.push({ key: `a-${a.activity_id || i}`, source: "activity", at: a.created_at, by: a.created_by_name, type: a.type, text: a.description, group: ["call", "email", "meeting", "comment", "task"].includes(a.type) ? "talk" : "system" });
  });
  return items.sort((x, y) => new Date(y.at) - new Date(x.at));
}

function Fact({ name, children }) {
  return <span className="text-[12.5px] text-slate-600"><span className="font-semibold text-slate-400">{name} </span><span className="font-medium text-slate-800">{children}</span></span>;
}

function NoteBody({ p }) {
  return (
    <div className="space-y-1.5">
      {p.statusTo ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
          {p.statusFrom ? <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">{p.statusFrom}</span> : null}
          {p.statusFrom ? <span className="text-slate-400">→</span> : null}
          <span className="rounded-full bg-brand-700 px-2 py-0.5 font-semibold text-white">{p.statusTo}</span>
        </div>
      ) : null}
      {p.callStatus || p.response ? (
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {p.callStatus ? <Fact name={p.mode || "Call"}>{p.callStatus}</Fact> : null}
          {p.response ? <Fact name="Customer said">{p.response}</Fact> : null}
        </div>
      ) : null}
      {p.requirement ? <Fact name="Requirement">{p.requirement}</Fact> : null}
      {p.assignedTo ? <Fact name="Handed over">{p.assignedFrom} → {p.assignedTo}</Fact> : null}
      {p.note ? <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-slate-800">{p.note}</p> : null}
      {p.nextFollowUp ? <span className="inline-flex rounded-[8px] bg-gold-50 px-2 py-0.5 text-[12px] font-semibold text-gold-800 ring-1 ring-gold-200">Next follow-up {p.nextFollowUp}{p.mode ? ` · ${p.mode}` : ""}</span> : null}
      {p.demoAt ? <span className="inline-flex rounded-[8px] bg-violet-50 px-2 py-0.5 text-[12px] font-semibold text-violet-800 ring-1 ring-violet-100">Demo {p.demoAt}</span> : null}
    </div>
  );
}

export default function LeadTimeline({ notes, activity, limit, emptyText = "Nothing recorded yet. Add the first note." }) {
  const [filter, setFilter] = useState("all");
  const items = useMemo(() => buildTimeline(notes, activity), [notes, activity]);
  const counts = useMemo(() => {
    const out = { all: items.length };
    for (const item of items) out[item.group] = (out[item.group] || 0) + 1;
    return out;
  }, [items]);
  const shown = (filter === "all" ? items : items.filter((i) => i.group === filter)).slice(0, limit || undefined);

  return (
    <div>
      {!limit && items.length ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.filter(([key]) => key === "all" || counts[key]).map(([key, text]) => (
            <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
              className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${filter === key ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
              {text} <span className="opacity-60">{counts[key] || 0}</span>
            </button>
          ))}
        </div>
      ) : null}
      {shown.length ? (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[5px] before:top-2 before:w-px before:bg-slate-200">
          {shown.map((item) => {
            const tone = item.source === "note" ? [KINDS[item.parsed.kind].label, KINDS[item.parsed.kind].dot] : ACTIVITY_TONES[item.type] || [label(item.type) || "Update", "bg-slate-400"];
            return (
              <li key={item.key} className="relative pl-5">
                <span className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full ring-2 ring-white ${tone[1]}`} />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-[12.5px]"><b className="font-semibold text-slate-900">{item.by || "User"}</b> <span className="text-slate-400">· {tone[0]}</span></p>
                  <time className="text-[11.5px] text-slate-400" title={fmtDateTime(item.at)}>{ago(item.at)}</time>
                </div>
                <div className="mt-1">
                  {item.source === "note" ? <NoteBody p={item.parsed} /> : <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-600">{item.text}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className="rounded-[10px] border border-dashed border-slate-200 px-4 py-6 text-center text-[13px] text-slate-500">{emptyText}</p>}
    </div>
  );
}
