"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../components/dashboard/DashboardShell";
import AgendaView from "../../components/calendar/AgendaView";
import ItemDetail from "../../components/calendar/ItemDetail";
import TaskComposer from "../../components/calendar/TaskComposer";
import TaskDownload from "../../components/calendar/TaskDownload";
import MiniMonth from "../../components/calendar/MiniMonth";
import MonthView from "../../components/calendar/MonthView";
import WeekView from "../../components/calendar/WeekView";
import {
  CATEGORIES, addDays, addMonths, byTime, fmt, formatTime, fromFollowUp, fromTask, istInstant, rangeTitle, todayKey, viewRange,
} from "../../components/calendar/calendarUtils";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

const VIEWS = [["month", "Month"], ["week", "Week"], ["agenda", "Agenda"]];
const TEAM_ROLES = ["admin", "manager", "super-admin", "platform-admin", "platform-manager"];
const VIEW_KEY = "greencrm:calendar-view";
const MAX_PAGES = 5;

async function fetchAll(path, token) {
  const items = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await apiRequest(`${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=100`, { token, fresh: true });
    items.push(...(response?.items || response?.data || []));
    if (page >= Number(response?.meta?.total_pages || 1)) break;
  }
  return items;
}

export default function CalendarPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [view, setView] = useState("month");
  const [anchor, setAnchor] = useState(todayKey());
  const [scope, setScope] = useState("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [teams, setTeams] = useState([]);
  const [people, setPeople] = useState([]);
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState("");
  const [hidden, setHidden] = useState([]);
  const [hideDone, setHideDone] = useState(false);
  const [items, setItems] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const stored = loadSession();
    if (!stored) { router.replace("/login"); return; }
    setSession(stored);
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (VIEWS.some(([key]) => key === saved)) setView(saved);
      else if (window.innerWidth < 768) setView("agenda");
    } catch (_error) { /* storage unavailable */ }
  }, [router]);

  const role = session?.user?.role || "";
  const userId = session?.user?.user_id || session?.user?.id || "";
  const canSeeTeam = TEAM_ROLES.includes(role);
  const isAdmin = canSeeTeam && role !== "manager";
  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);

  // Teams and people the viewer may filter by. The server scopes both: managers get their teams only.
  useEffect(() => {
    if (!session?.token || !canSeeTeam) return;
    apiRequest("/teams?page_size=100", { token: session.token }).then((r) => setTeams(r?.items || r?.data || [])).catch(() => setTeams([]));
  }, [session?.token, canSeeTeam]);
  useEffect(() => {
    if (!session?.token || !canSeeTeam) return;
    const team = teamFilter ? `&team_ids=${encodeURIComponent(teamFilter)}` : "";
    apiRequest(`/users?page_size=100${team}`, { token: session.token })
      .then((r) => setPeople((r?.items || r?.data || []).filter((u) => u.is_active !== false && u.is_active !== 0)))
      .catch(() => setPeople([]));
  }, [session?.token, canSeeTeam, teamFilter]);

  // Query filters for the chosen scope. Tasks use assigned_to/team_ids; follow-ups use user_id/team_ids.
  const filterParams = useMemo(() => {
    if (!canSeeTeam || scope === "mine") return { tasks: "&mine=1", followUps: canSeeTeam && userId ? `&user_id=${encodeURIComponent(userId)}` : "" };
    if (personFilter) return { tasks: `&assigned_to=${encodeURIComponent(personFilter)}`, followUps: `&user_id=${encodeURIComponent(personFilter)}` };
    if (teamFilter) return { tasks: `&team_ids=${encodeURIComponent(teamFilter)}`, followUps: `&team_ids=${encodeURIComponent(teamFilter)}` };
    return { tasks: "", followUps: "" };
  }, [canSeeTeam, scope, personFilter, teamFilter, userId]);
  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.user_id, p.name])), [people]);

  useEffect(() => {
    if (!session?.token) return undefined;
    let cancelled = false;
    const window_ = `due_from=${encodeURIComponent(istInstant(range.from))}&due_to=${encodeURIComponent(istInstant(range.to))}`;
    setLoading(true);
    setError("");
    Promise.all([
      fetchAll(`/tasks?${window_}${filterParams.tasks}`, session.token),
      fetchAll(`/leads/reminders?${window_}${filterParams.followUps}`, session.token).catch(() => []),
      apiRequest(`/tasks?due_bucket=overdue&open_only=1&page=1&page_size=100${filterParams.tasks}`, { token: session.token, fresh: true }).catch(() => ({ items: [] })),
      apiRequest(`/leads/reminders?due_to=${encodeURIComponent(istInstant(todayKey()))}&page=1&page_size=100${filterParams.followUps}`, { token: session.token, fresh: true }).catch(() => ({ items: [] })),
    ])
      .then(([tasks, followUps, overdueTasks, overdueFollowUps]) => {
        if (cancelled) return;
        const now = Date.now();
        setItems([...tasks.map((t) => fromTask(t, now)), ...followUps.map((f) => fromFollowUp(f, now))].sort(byTime));
        setOverdue([
          ...(overdueTasks?.items || []).map((t) => fromTask(t, now)),
          ...(overdueFollowUps?.items || []).map((f) => fromFollowUp(f, now)),
        ].filter((i) => i.overdue).sort(byTime));
      })
      .catch((err) => { if (!cancelled) setError(err.message || "Could not load the calendar."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.token, range.from, range.to, filterParams, refreshKey]);

  // Follow-ups carry only the owner's ID; add the name once the people list is known.
  const named = useCallback((list) => list.map((i) => (i.kind === "followup" && i.assignedTo && peopleById[i.assignedTo]
    ? { ...i, owner: peopleById[i.assignedTo], subtitle: `${i.subtitle} · ${peopleById[i.assignedTo]}` } : i)), [peopleById]);
  const namedItems = useMemo(() => named(items), [named, items]);
  const namedOverdue = useMemo(() => named(overdue), [named, overdue]);

  const assignees = useMemo(() => {
    if (!canSeeTeam) return [];
    const list = people.some((p) => p.user_id === userId) ? people : [{ user_id: userId, name: session?.user?.name || "Me" }, ...people];
    return [...list].sort((a, b) => (a.user_id === userId ? -1 : b.user_id === userId ? 1 : a.name.localeCompare(b.name)));
  }, [canSeeTeam, people, userId, session?.user?.name]);
  const startCreate = useCallback((date, time) => setDraft({ date: date || todayKey(), time }), []);
  const flash = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(""), 3500);
  };
  const onSaved = (form, again) => {
    if (!again) setDraft(null);
    const day = form.date === todayKey() ? "today" : fmt(form.date, { day: "numeric", month: "short" });
    flash(form.edited ? "Task updated." : form.count > 1 ? `${form.count} tasks created, starting ${day}.` : `Task created for ${day}${form.time ? ` at ${formatTime(`${form.date}T${form.time}:00+05:30`)}` : ""}.`);
    setRefreshKey((k) => k + 1);
  };

  // Task actions from the side panel; the Tasks page is no longer needed for these.
  const patchTask = async (task, body, message) => {
    setBusy(true);
    setActionError("");
    try {
      await apiRequest(`/tasks/${encodeURIComponent(task.task_id)}`, { method: "PATCH", token: session.token, body });
      setOpen(null);
      flash(message);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message || "The task could not be changed.");
    } finally {
      setBusy(false);
    }
  };
  const toggleDone = (item) => patchTask(item.raw, { status: item.done ? "pending" : "done" }, item.done ? "Task reopened." : "Nice — task marked done.");
  const moveTask = (item, key) => {
    const minutes = item.timed ? item.minutes : 0;
    const due = new Date(`${key}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+05:30`);
    return patchTask(item.raw, { due_date: due.toISOString() }, `Task moved to ${fmt(key, { weekday: "short", day: "numeric", month: "short" })}.`);
  };
  const editTask = (item) => { setOpen(null); setActionError(""); setDraft({ task: item.raw }); };
  const deleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    setBusy(true);
    setActionError("");
    try {
      await apiRequest(`/tasks/${encodeURIComponent(task.task_id)}`, { method: "DELETE", token: session.token });
      setOpen(null);
      setDraft(null);
      flash("Task deleted.");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setActionError(err.message || "The task could not be deleted.");
      if (draft) window.alert(err.message || "The task could not be deleted.");
    } finally {
      setBusy(false);
    }
  };

  const visible = useMemo(
    () => namedItems.filter((i) => !hidden.includes(i.category) && !(hideDone && i.done)),
    [namedItems, hidden, hideDone]
  );
  const itemsByDay = useMemo(() => {
    const map = new Map();
    for (const item of visible) {
      if (!map.has(item.dayKey)) map.set(item.dayKey, []);
      map.get(item.dayKey).push(item);
    }
    return map;
  }, [visible]);
  const counts = useMemo(() => Object.fromEntries([...itemsByDay].map(([k, v]) => [k, v.length])), [itemsByDay]);
  const itemsOn = useCallback((key) => namedItems.filter((i) => i.dayKey === key), [namedItems]);
  const personName = people.find((p) => p.user_id === personFilter)?.name;
  const teamName = teams.find((t) => t.team_id === teamFilter)?.name;
  const scopeLabel = !canSeeTeam || scope === "mine" ? "My tasks" : personName ? `${personName}'s tasks` : teamName ? `${teamName} team` : isAdmin ? "Everyone" : "My team";
  const categoryCounts = useMemo(() => {
    const out = {};
    for (const item of items) out[item.category] = (out[item.category] || 0) + 1;
    return out;
  }, [items]);

  const today = todayKey();
  const todayItems = namedItems.filter((i) => i.dayKey === today && !i.done);
  const next = todayItems.find((i) => i.timed && new Date(i.at).getTime() >= Date.now());

  const step = useCallback((direction) => {
    setAnchor((current) => (view === "month" ? addMonths(current, direction) : addDays(current, direction * (view === "week" ? 7 : 14))));
  }, [view]);
  const chooseView = (key) => {
    setView(key);
    try { window.localStorage.setItem(VIEW_KEY, key); } catch (_error) { /* ignore */ }
  };
  const showDay = (key) => { setAnchor(key); chooseView("agenda"); };

  useEffect(() => {
    const onKey = (event) => {
      if (open || draft || downloadOpen || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target?.tagName)) return;
      if (event.key === "n" || event.key === "N") { event.preventDefault(); startCreate(anchor < todayKey() ? todayKey() : anchor); }
      if (event.key === "t" || event.key === "T") setAnchor(todayKey());
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, open, draft, downloadOpen, anchor, startCreate]);

  const toggleCategory = (key) => setHidden((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  return (
    <DashboardShell session={session} title="Calendar" hideTitle heroStats={[]}>
      <div className="tw-buttons space-y-4">
        {/* Today strip */}
        <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[14px] border border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-brand-700 text-white">
              <span className="text-center leading-none">
                <span className="block text-[9px] font-bold uppercase tracking-wider opacity-80">{new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", month: "short" })}</span>
                <span className="block text-lg font-bold">{Number(today.slice(8))}</span>
              </span>
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">{todayItems.length ? `${todayItems.length} thing${todayItems.length === 1 ? "" : "s"} to do today` : "Your day is clear"}</p>
              <p className="text-xs text-slate-500">
                {next ? <>Next: <b className="font-semibold text-slate-700">{next.title}</b> at {formatTime(next.at)}</> : "No more timed items today"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {overdue.length ? (
              <button type="button" onClick={() => { setAnchor(today); chooseView("agenda"); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />{overdue.length} overdue
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" />Nothing overdue</span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-xs font-bold text-gold-800">
              {categoryCounts.followup || 0} follow-ups in view
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setDownloadOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-white px-3 text-[13px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-800">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" /></svg>Download tasks
            </button>
            <button type="button" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading} title="Refresh"
              className="grid h-9 w-9 place-items-center rounded-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
              <svg className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></svg>
            </button>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Side panel */}
          <aside className="order-2 space-y-4 lg:order-none">
            <button type="button" onClick={() => startCreate(anchor < todayKey() ? todayKey() : anchor)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-brand-700 text-sm font-semibold text-white shadow-sm hover:bg-brand-800">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>New task
            </button>
            <section className="rounded-[14px] border border-slate-200 bg-white p-3">
              <MiniMonth selected={anchor} onSelect={setAnchor} counts={counts} range={view === "week" ? range : null} />
            </section>
            <section className="rounded-[14px] border border-slate-200 bg-white p-3">
              <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Show</p>
              <ul className="space-y-0.5">
                {CATEGORIES.map((c) => {
                  const on = !hidden.includes(c.key);
                  return (
                    <li key={c.key}>
                      <button type="button" onClick={() => toggleCategory(c.key)} aria-pressed={on}
                        className="flex w-full items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left text-[13px] hover:bg-slate-50">
                        <span className={`grid h-4 w-4 place-items-center rounded-[4px] border ${on ? `${c.dot} border-transparent text-white` : "border-slate-300 bg-white"}`}>
                          {on ? <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7" /></svg> : null}
                        </span>
                        <span className={on ? "text-slate-700" : "text-slate-400"}>{c.label}</span>
                        <span className="ml-auto text-xs tabular-nums text-slate-400">{categoryCounts[c.key] || 0}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <label className="mt-2 flex items-center gap-2 border-t border-slate-100 px-2 pt-3 text-[13px] text-slate-600">
                <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-4 w-4 accent-[#0c605d]" />
                Hide done and closed
              </label>
            </section>
            {canSeeTeam ? (
              <section className="space-y-2.5 rounded-[14px] border border-slate-200 bg-white p-3">
                <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Whose work</p>
                <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-slate-100 p-1">
                  {[["mine", "Mine"], ["all", isAdmin ? "Everyone" : "My team"]].map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setScope(key)} aria-pressed={scope === key}
                      className={`rounded-[8px] py-1.5 text-[13px] font-semibold transition ${scope === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {scope === "all" ? (
                  <div className="grid gap-2">
                    {teams.length > 1 || isAdmin ? (
                      <label className="grid gap-1 text-[11px] font-semibold text-slate-500">Team
                        <select value={teamFilter} onChange={(e) => { setTeamFilter(e.target.value); setPersonFilter(""); }}
                          className="rounded-[10px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] font-medium text-slate-800 outline-none focus:border-brand-400">
                          <option value="">{isAdmin ? "All teams" : "All my teams"}</option>
                          {teams.map((t) => <option key={t.team_id} value={t.team_id}>{t.name}</option>)}
                        </select>
                      </label>
                    ) : null}
                    <label className="grid gap-1 text-[11px] font-semibold text-slate-500">Person
                      <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)}
                        className="rounded-[10px] border border-slate-200 bg-white px-2.5 py-2 text-[13px] font-medium text-slate-800 outline-none focus:border-brand-400">
                        <option value="">Everyone{teamFilter ? " in this team" : ""}</option>
                        {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.name}{p.role ? ` · ${String(p.role).replace(/-/g, " ")}` : ""}</option>)}
                      </select>
                    </label>
                  </div>
                ) : null}
              </section>
            ) : null}
            <p className="px-1 text-[11px] leading-relaxed text-slate-400">Click any day or time slot to add a task. Shortcuts: <b>T</b> today · <b>N</b> new task · <b>←</b> <b>→</b> move. Times are in India time.</p>
          </aside>

          {/* Main */}
          <section className="order-1 min-w-0 space-y-3 lg:order-none">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setAnchor(todayKey())} className="h-9 rounded-[10px] border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50">Today</button>
              <div className="flex">
                <button type="button" onClick={() => step(-1)} aria-label="Previous" className="grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 hover:bg-slate-100">‹</button>
                <button type="button" onClick={() => step(1)} aria-label="Next" className="grid h-9 w-9 place-items-center rounded-[10px] text-slate-500 hover:bg-slate-100">›</button>
              </div>
              <h1 className="mr-auto text-xl font-bold tracking-tight text-slate-900">{rangeTitle(view, anchor)}</h1>
              <div className="flex rounded-[10px] bg-slate-100 p-1" role="group" aria-label="Calendar view">
                {VIEWS.map(([key, label]) => (
                  <button key={key} type="button" onClick={() => chooseView(key)} aria-pressed={view === key}
                    className={`rounded-[8px] px-3.5 py-1.5 text-[13px] font-semibold transition ${view === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {error ? <div className="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {notice ? <div className="rounded-[12px] border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800">✓ {notice}</div> : null}

            <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
              {view === "month" ? <MonthView from={range.from} monthKey={anchor} itemsByDay={itemsByDay} onOpen={setOpen} onShowDay={showDay} onCreate={startCreate} /> : null}
              {view === "week" ? <WeekView from={range.from} itemsByDay={itemsByDay} onOpen={setOpen} onCreate={startCreate} /> : null}
              {view === "agenda" ? <AgendaView from={range.from} itemsByDay={itemsByDay} overdueItems={namedOverdue} onOpen={setOpen} onCreate={startCreate} /> : null}
            </div>
          </section>
        </div>
      </div>
      <ItemDetail item={open} onClose={() => { setOpen(null); setActionError(""); }} onEdit={editTask} onToggleDone={toggleDone} onMove={moveTask} onDelete={deleteTask} busy={busy} error={actionError} />
      <TaskComposer draft={draft} onClose={() => setDraft(null)} onSaved={onSaved} onDelete={deleteTask} token={session?.token} people={assignees} selfId={userId} itemsOn={itemsOn} />
      <TaskDownload open={downloadOpen} onClose={() => setDownloadOpen(false)} token={session?.token} scopeQuery={filterParams.tasks} scopeLabel={scopeLabel}
        viewRange={range} viewTitle={rangeTitle(view, anchor)} />
    </DashboardShell>
  );
}
