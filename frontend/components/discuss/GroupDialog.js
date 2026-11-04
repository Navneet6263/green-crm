"use client";

import { useEffect, useState } from "react";
import { ChatAvatar } from "./ChatList";

const FIELD = "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-[13.5px] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50";

/** New group, or the info panel of an open group (rename, members, leave, delete). */
export default function GroupDialog({ open, onClose, people, canCompanyWide, group, myId, onCreate, onUpdate, onLeave }) {
  const editing = Boolean(group);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [companyWide, setCompanyWide] = useState(false);
  const [picked, setPicked] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const original = (group?.members || []).map((m) => Number(m.id));

  useEffect(() => {
    if (!open) return;
    setName(group?.name || ""); setDescription(group?.description || ""); setCompanyWide(Boolean(group?.is_company_wide));
    setPicked(original.filter((id) => id !== myId)); setSearch(""); setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group?.id]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  const readOnly = editing && !group.can_manage;
  const q = search.trim().toLowerCase();
  const shown = people.filter((p) => !q || p.name.toLowerCase().includes(q));
  const toggle = (id) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!editing) await onCreate({ name, description, company_wide: companyWide, member_ids: picked });
      else {
        const add = picked.filter((id) => !original.includes(id));
        const remove = original.filter((id) => id !== myId && !picked.includes(id));
        await onUpdate(group.id, { name, description, add_ids: add, remove_ids: remove });
      }
      onClose();
    } catch (err) {
      setError(err.message || "The group could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-label={editing ? "Group info" : "New group"} onClick={(e) => e.stopPropagation()} className="tw-buttons flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[18px] bg-white shadow-2xl sm:rounded-[18px]">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-[16px] font-bold text-slate-900">{editing ? "Group info" : "New group"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-slate-100">×</button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <label className="block text-[12px] font-semibold text-slate-600">Group name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={readOnly} placeholder="e.g. Delhi sales, Big deals" className={`${FIELD} mt-1`} />
          </label>
          <label className="block text-[12px] font-semibold text-slate-600">What is it for? <span className="font-normal text-slate-400">(optional)</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} disabled={readOnly} className={`${FIELD} mt-1`} />
          </label>
          {!editing && canCompanyWide ? (
            <label className="flex items-start gap-2 rounded-[10px] bg-gold-50 px-3 py-2 text-[13px] text-gold-900 ring-1 ring-gold-100">
              <input type="checkbox" checked={companyWide} onChange={(e) => setCompanyWide(e.target.checked)} className="mt-0.5" />
              <span><b className="font-semibold">Everyone in the company</b><span className="block text-[12px] text-gold-800">New people join automatically. Good for announcements.</span></span>
            </label>
          ) : null}
          {companyWide || group?.is_company_wide ? null : (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-slate-600">Members <span className="font-normal text-slate-400">({picked.length + 1} with you)</span></p>
                {!readOnly ? <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find" aria-label="Find people" className="h-8 w-36 rounded-[8px] border border-slate-200 px-2 text-[12.5px] outline-none" /> : null}
              </div>
              <ul className="max-h-[260px] divide-y divide-slate-100 overflow-y-auto rounded-[10px] ring-1 ring-slate-200">
                {(readOnly ? people.filter((p) => picked.includes(p.id)) : shown).map((p) => (
                  <li key={p.id}>
                    <label className={`flex items-center gap-3 px-3 py-2 ${readOnly ? "" : "cursor-pointer hover:bg-slate-50"}`}>
                      {!readOnly ? <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} disabled={editing && p.id === Number(group.created_by)} /> : null}
                      <ChatAvatar chat={{ type: "direct", id: p.id, name: p.name, online: p.online }} size="h-8 w-8 text-[11.5px]" />
                      <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-slate-800">{p.name}</span><span className="block text-[11.5px] capitalize text-slate-400">{String(p.role || "").replace(/-/g, " ")}</span></span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error ? <p role="alert" className="text-[12.5px] text-rose-700">{error}</p> : null}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
          <span className="flex gap-1">
            {editing && !group.is_company_wide ? <button type="button" onClick={() => window.confirm("Leave this group?") && onLeave(group.id, false).then(onClose)} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">Leave</button> : null}
            {editing && group.can_manage ? <button type="button" onClick={() => window.confirm("Delete this group for everyone? Messages will be hidden.") && onLeave(group.id, true).then(onClose)} className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-rose-700 hover:bg-rose-50">Delete group</button> : null}
          </span>
          {!readOnly ? <button type="button" onClick={save} disabled={busy || !name.trim()} className="rounded-[10px] bg-brand-700 px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-800 disabled:opacity-50">{busy ? "Saving…" : editing ? "Save" : "Create group"}</button> : null}
        </footer>
      </div>
    </div>
  );
}
