"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../../lib/api";
import { addDays, addMonths, fmt, formatTime, styleOf, todayKey, weekday } from "./calendarUtils";
import RecordPicker from "./RecordPicker";
import ReminderField, { defaultReminder, fitReminder } from "./ReminderField";

const TYPES = [
  ["call", "Call", "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"],
  ["meeting", "Meeting", "M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8M21 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"],
  ["demo", "Demo", "M3 4h18v12H3zM8 20h8M12 16v4"],
  ["whatsapp", "WhatsApp", "M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12"],
  ["email", "Email", "M3 6h18v12H3zM3 7l9 6 9-6"],
  ["task", "To-do", "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"],
  ["reminder", "Reminder", "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"],
];
const SUGGESTIONS = {
  call: ["Follow-up call", "Call back", "Discuss pricing", "Confirm requirement"],
  meeting: ["Client meeting", "Site visit", "Office visit"],
  demo: ["Product demo", "Online demo", "Trial walkthrough"],
  whatsapp: ["Send brochure on WhatsApp", "Share price list", "Send demo video"],
  email: ["Send quotation", "Send proposal", "Send agreement"],
  task: ["Prepare proposal", "Update lead details", "Collect documents"],
  reminder: ["Payment reminder", "Renewal reminder", "Check in"],
};
const PRIORITIES = [["low", "Low", "bg-slate-400"], ["medium", "Medium", "bg-sky-500"], ["high", "High", "bg-amber-500"], ["urgent", "Urgent", "bg-rose-500"]];
const TIMES = [["09:30", "9:30am"], ["11:00", "11am"], ["13:00", "1pm"], ["15:00", "3pm"], ["17:00", "5pm"]];
const REPEATS = [["none", "Doesn't repeat"], ["daily", "Every day"], ["weekdays", "Every weekday (Mon–Sat)"], ["weekly", "Every week"], ["monthly", "Every month"]];
const FIELD = "w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-50";
const LABEL = "text-[11.5px] font-semibold uppercase tracking-wide text-slate-500";
const MORE_KEY = "greencrm:task-more-details";

const istParts = (value) => {
  const d = new Date(new Date(value).getTime() + 330 * 60000);
  return { date: d.toISOString().slice(0, 10), time: d.getUTCHours() || d.getUTCMinutes() ? d.toISOString().slice(11, 16) : "" };
};
const nextMonday = (key) => addDays(key, 7 - weekday(key));

function repeatDates(start, repeat, count) {
  if (repeat === "none") return [start];
  const out = [];
  let key = start;
  for (let guard = 0; out.length < count && guard < 400; guard++) {
    if (repeat !== "weekdays" || weekday(key) !== 6) out.push(key);
    if (repeat === "daily" || repeat === "weekdays") key = addDays(key, 1);
    else if (repeat === "weekly") key = addDays(key, 7);
    else {
      // Same day each month, or the month's last day when it is shorter.
      const first = addMonths(start, out.length);
      const last = Number(addDays(addMonths(first, 1), -1).slice(8));
      key = `${first.slice(0, 8)}${String(Math.min(Number(start.slice(8)), last)).padStart(2, "0")}`;
    }
  }
  return out;
}

function Icon({ d, className = "h-3.5 w-3.5" }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

/**
 * Create a task on a clicked day/time, or edit one (draft.task). `people` is passed only to roles
 * that may assign to others. `dayItems` shows what is already planned that day.
 */
export default function TaskComposer({ draft, onClose, onSaved, onDelete, token, people = [], selfId, itemsOn }) {
  const [form, setForm] = useState(null);
  const [more, setMore] = useState(false);
  const [checkInput, setCheckInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef(null);
  const editing = Boolean(draft?.task);

  useEffect(() => {
    if (!draft) return;
    const t = draft.task;
    if (t) {
      const when = istParts(t.due_date);
      setForm({ title: t.title || "", type: t.type || "call", date: when.date, time: when.time, priority: t.priority || "medium", assignee: t.assigned_to || selfId || "",
        status: t.status || "pending", notes: t.notes || "", checklist: [], repeat: "none", count: 4, remind: t.remind_before === null || t.remind_before === undefined ? "none" : String(t.remind_before),
        record: t.related_to && t.related_id ? { kind: t.related_to, id: t.related_id, name: draft.recordName || t.related_id } : null });
    } else {
      setForm({ title: "", type: "call", date: draft.date, time: draft.time ?? "10:00", priority: "medium", assignee: selfId || "", status: "pending",
        notes: "", checklist: [], repeat: "none", count: 4, record: draft.record || null, remind: defaultReminder(!(draft.time ?? "10:00")) });
    }
    setError("");
    try { setMore(window.localStorage.getItem(MORE_KEY) === "1" || Boolean(t?.related_id) || Boolean(draft.record)); } catch (_error) { /* storage unavailable */ }
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [draft, selfId]);

  useEffect(() => {
    if (!draft) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [draft, onClose]);

  const dayItems = useMemo(() => (form && itemsOn ? itemsOn(form.date).filter((i) => !editing || i.key !== `t-${draft.task.task_id}`) : []), [form, itemsOn, editing, draft]);

  if (!draft || !form) return null;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value, ...(key === "time" ? { remind: fitReminder(current.remind, !value) } : {}) }));
  const toggleMore = () => { setMore((m) => { try { window.localStorage.setItem(MORE_KEY, m ? "0" : "1"); } catch (_error) { /* ignore */ } return !m; }); };
  const today = todayKey();
  const dates = repeatDates(form.date, editing ? "none" : form.repeat, Math.min(30, Math.max(2, Number(form.count) || 2)));
  const clash = form.time ? dayItems.filter((i) => i.timed && formatTime(i.at) === formatTime(`${form.date}T${form.time}:00+05:30`)) : [];

  function addCheck() {
    const text = checkInput.trim();
    if (!text) return;
    set("checklist", [...form.checklist, text]);
    setCheckInput("");
  }

  async function submit(event, again = false) {
    event?.preventDefault();
    if (!form.title.trim()) { setError("Give the task a title."); titleRef.current?.focus(); return; }
    setSaving(true);
    setError("");
    const pending = checkInput.trim() ? [...form.checklist, checkInput.trim()] : form.checklist;
    const notes = [form.notes.trim(), pending.map((c) => `☐ ${c}`).join("\n")].filter(Boolean).join("\n\n") || null;
    const body = (date) => ({
      title: form.title.trim(),
      type: form.type,
      priority: form.priority,
      status: form.status,
      // The date and time are entered in India time; "any time" is stored at midnight.
      due_date: new Date(`${date}T${form.time || "00:00"}:00+05:30`).toISOString(),
      ...(form.assignee ? { assigned_to: form.assignee } : {}),
      related_to: form.record ? form.record.kind : null,
      related_id: form.record ? form.record.id : null,
      notes,
      remind_before: form.remind === "none" ? null : Number(form.remind),
    });
    try {
      if (editing) {
        await apiRequest(`/tasks/${encodeURIComponent(draft.task.task_id)}`, { method: "PATCH", token, body: body(form.date) });
      } else {
        for (const date of dates) await apiRequest("/tasks", { method: "POST", token, body: body(date) });
      }
      onSaved({ ...form, count: editing ? 1 : dates.length, edited: editing }, again);
      if (again) {
        setForm((f) => ({ ...f, title: "", notes: "", checklist: [], record: null, repeat: "none" }));
        setCheckInput("");
        setTimeout(() => titleRef.current?.focus(), 50);
      }
    } catch (err) {
      setError(err.message || "The task could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const dateChips = [[today, "Today"], [addDays(today, 1), "Tomorrow"], [nextMonday(today), "Next Mon"], [addDays(form.date, 7), "+1 week"]];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="tw-buttons fixed inset-x-3 top-[4vh] z-50 mx-auto flex max-h-[92vh] max-w-[860px] flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.45)]" role="dialog" aria-label={editing ? "Edit task" : "New task"}>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-50/70 to-white px-5 py-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-brand-700 text-white">
              <span className="text-center leading-none"><span className="block text-[9px] font-bold uppercase">{fmt(form.date, { month: "short" })}</span><span className="block text-[15px] font-bold">{Number(form.date.slice(8))}</span></span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-700">{editing ? "Edit task" : "New task"}</p>
              <p className="truncate text-[15px] font-bold text-slate-900">
                {fmt(form.date, { weekday: "long", day: "numeric", month: "long" })}{form.time ? ` · ${formatTime(`${form.date}T${form.time}:00+05:30`)}` : " · any time"}
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <Icon d="m6 6 12 12M18 6 6 18" className="h-4 w-4" />
            </button>
          </div>

          <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_250px]">
            <div className="space-y-4 px-5 py-4">
              <div>
                <input ref={titleRef} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={180}
                  placeholder="What needs to be done?"
                  className="w-full border-0 border-b-2 border-slate-200 px-0 pb-2 text-[18px] font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-brand-500" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS[form.type].map((s) => (
                    <button key={s} type="button" onClick={() => set("title", form.record ? `${s} – ${form.record.name}` : s)}
                      className="rounded-full bg-slate-50 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200">{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className={LABEL}>Type</p>
                <div className="mt-1.5 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
                  {TYPES.map(([key, text, d]) => (
                    <button key={key} type="button" onClick={() => set("type", key)} aria-pressed={form.type === key}
                      className={`flex flex-col items-center gap-1 rounded-[10px] px-1 py-2 text-[11.5px] font-semibold transition ${form.type === key ? "bg-brand-700 text-white shadow-sm" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
                      <Icon d={d} className="h-4 w-4" />{text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={LABEL}>Date</p>
                  <input type="date" required value={form.date} onChange={(e) => e.target.value && set("date", e.target.value)} className={`${FIELD} mt-1.5`} />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {dateChips.map(([key, text]) => (
                      <button key={text} type="button" onClick={() => set("date", key)}
                        className={`rounded-[7px] px-2 py-1 text-[11.5px] font-semibold ${form.date === key ? "bg-brand-100 text-brand-800" : "text-slate-500 hover:bg-slate-100"}`}>{text}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className={LABEL}>Time</p>
                  <input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} className={`${FIELD} mt-1.5`} />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {TIMES.map(([value, text]) => (
                      <button key={value} type="button" onClick={() => set("time", value)}
                        className={`rounded-[7px] px-2 py-1 text-[11.5px] font-semibold ${form.time === value ? "bg-brand-100 text-brand-800" : "text-slate-500 hover:bg-slate-100"}`}>{text}</button>
                    ))}
                    <button type="button" onClick={() => set("time", "")}
                      className={`rounded-[7px] px-2 py-1 text-[11.5px] font-semibold ${!form.time ? "bg-gold-100 text-gold-800" : "text-slate-500 hover:bg-slate-100"}`}>Any time</button>
                  </div>
                </div>
              </div>

              <ReminderField value={form.remind} onChange={(v) => set("remind", v)} allDay={!form.time} labelClassName={LABEL}
                assigneeName={form.assignee && form.assignee !== selfId ? people.find((p) => p.user_id === form.assignee)?.name : ""} />

              <div className={`grid gap-3 ${people.length ? "sm:grid-cols-2" : ""}`}>
                <div>
                  <p className={LABEL}>Priority</p>
                  <div className="mt-1.5 grid grid-cols-4 gap-1 rounded-[10px] bg-slate-100 p-1">
                    {PRIORITIES.map(([key, text, dot]) => (
                      <button key={key} type="button" onClick={() => set("priority", key)} aria-pressed={form.priority === key}
                        className={`flex items-center justify-center gap-1.5 rounded-[8px] py-1.5 text-xs font-semibold ${form.priority === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                        <span className={`h-2 w-2 rounded-full ${dot}`} />{text}
                      </button>
                    ))}
                  </div>
                </div>
                {people.length ? (
                  <label className="block"><span className={LABEL}>Assign to</span>
                    <select value={form.assignee} onChange={(e) => set("assignee", e.target.value)} className={`${FIELD} mt-1.5`}>
                      {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.user_id === selfId ? `${p.name} (me)` : p.name}</option>)}
                    </select>
                  </label>
                ) : null}
              </div>

              <button type="button" onClick={toggleMore} className="flex w-full items-center gap-2 rounded-[10px] px-1 py-1 text-left text-[13px] font-semibold text-brand-700 hover:text-brand-900">
                <Icon d="m6 9 6 6 6-6" className={`h-4 w-4 transition ${more ? "rotate-180" : ""}`} />
                {more ? "Fewer details" : "More details"}
                <span className="font-normal text-slate-400">link a lead, status, repeat, checklist, notes</span>
              </button>

              {more ? (
                <div className="space-y-4 rounded-[14px] bg-slate-50/80 p-4 ring-1 ring-slate-100">
                  <div>
                    <p className={LABEL}>Link to lead or customer</p>
                    <div className="mt-1.5"><RecordPicker token={token} value={form.record} onChange={(record) => set("record", record)} /></div>
                  </div>
                  <div className={`grid gap-3 ${editing ? "" : "sm:grid-cols-2"}`}>
                    <label className="block"><span className={LABEL}>Status</span>
                      <select value={form.status} onChange={(e) => set("status", e.target.value)} className={`${FIELD} mt-1.5`}>
                        <option value="pending">To do</option>
                        <option value="in-progress">In progress</option>
                        {editing ? <option value="done">Done</option> : null}
                      </select>
                    </label>
                    {!editing ? (
                      <div>
                        <span className={LABEL}>Repeat</span>
                        <div className="mt-1.5 flex gap-2">
                          <select value={form.repeat} onChange={(e) => set("repeat", e.target.value)} className={FIELD}>
                            {REPEATS.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
                          </select>
                          {form.repeat !== "none" ? (
                            <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">×
                              <input type="number" min={2} max={30} value={form.count} onChange={(e) => set("count", e.target.value)} className={`${FIELD} w-16 px-2`} />
                            </label>
                          ) : null}
                        </div>
                        {form.repeat !== "none" ? <p className="mt-1 text-[11.5px] text-slate-500">{dates.length} tasks: {fmt(dates[0], { day: "numeric", month: "short" })} → {fmt(dates[dates.length - 1], { day: "numeric", month: "short" })}</p> : null}
                      </div>
                    ) : null}
                  </div>
                  {!editing ? (
                    <div>
                      <p className={LABEL}>Checklist</p>
                      {form.checklist.length ? (
                        <ul className="mt-1.5 space-y-1">
                          {form.checklist.map((c, i) => (
                            <li key={`${c}-${i}`} className="flex items-center gap-2 rounded-[8px] bg-white px-2.5 py-1.5 text-sm text-slate-800 ring-1 ring-slate-200">
                              <span className="h-3.5 w-3.5 rounded-[4px] ring-1 ring-slate-300" />
                              <span className="flex-1">{c}</span>
                              <button type="button" onClick={() => set("checklist", form.checklist.filter((_, j) => j !== i))} aria-label={`Remove ${c}`} className="text-slate-400 hover:text-rose-600"><Icon d="m6 6 12 12M18 6 6 18" /></button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-1.5 flex gap-2">
                        <input value={checkInput} onChange={(e) => setCheckInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCheck(); } }}
                          placeholder="Add a step, e.g. Share price list" className={FIELD} />
                        <button type="button" onClick={addCheck} className="shrink-0 rounded-[10px] bg-white px-3 text-sm font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50">Add</button>
                      </div>
                    </div>
                  ) : null}
                  <label className="block"><span className={LABEL}>Notes</span>
                    <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={editing ? 4 : 2} className={`${FIELD} mt-1.5 resize-y`} placeholder="Anything to remember for this task" />
                  </label>
                </div>
              ) : null}

              {error ? <p className="rounded-[10px] bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </div>

            <aside className="hidden border-l border-slate-100 bg-slate-50/60 px-4 py-4 md:block">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Already on this day</p>
              {dayItems.length ? (
                <ul className="mt-2 space-y-1.5">
                  {dayItems.slice(0, 9).map((item) => (
                    <li key={item.key} className="flex items-start gap-2 rounded-[8px] bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${styleOf(item).dot}`} />
                      <span className="min-w-0">
                        <span className={`block truncate text-[12.5px] font-medium text-slate-800 ${item.done ? "line-through opacity-60" : ""}`}>{item.title}</span>
                        <span className="block text-[11px] text-slate-400">{item.timed ? formatTime(item.at) : "Any time"}{item.owner ? ` · ${item.owner}` : ""}</span>
                      </span>
                    </li>
                  ))}
                  {dayItems.length > 9 ? <li className="px-1 text-[11.5px] text-slate-400">+{dayItems.length - 9} more</li> : null}
                </ul>
              ) : <p className="mt-2 text-[12.5px] text-slate-400">Nothing planned yet — a free day.</p>}
              {clash.length ? <p className="mt-3 rounded-[8px] bg-amber-50 px-2.5 py-2 text-[11.5px] font-medium text-amber-800 ring-1 ring-amber-200">Something else is already at this time.</p> : null}
              <div className="mt-4 rounded-[10px] bg-white p-3 text-[11.5px] leading-relaxed text-slate-500 ring-1 ring-slate-200">
                <b className="text-slate-700">Tip:</b> press <kbd className="rounded bg-slate-100 px-1">Enter</kbd> to save, <kbd className="rounded bg-slate-100 px-1">Esc</kbd> to close.
              </div>
            </aside>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            {editing && onDelete ? (
              <button type="button" onClick={() => onDelete(draft.task)} className="rounded-[10px] px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
            ) : null}
            <span className="flex-1" />
            <button type="button" onClick={onClose} className="rounded-[10px] px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            {!editing ? (
              <button type="button" disabled={saving} onClick={(e) => submit(e, true)} className="rounded-[10px] bg-white px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">Save & add another</button>
            ) : null}
            <button type="submit" disabled={saving} className="rounded-[10px] bg-brand-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Save changes" : dates.length > 1 ? `Create ${dates.length} tasks` : "Create task"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
