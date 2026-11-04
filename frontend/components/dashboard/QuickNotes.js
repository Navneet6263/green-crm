"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { notesApi } from "../../lib/api/notes";

const escapeHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const parse = (content) => { try { return JSON.parse(content || "{}"); } catch (_e) { return { html: String(content || "") }; } };
const plain = (html) => String(html || "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const ago = (value) => {
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 60) return mins < 2 ? "just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** Small panel from the header: jot a note fast, see the latest ones, open the full notes page. */
export default function QuickNotes({ open, onClose }) {
  const [notes, setNotes] = useState(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    setError("");
    notesApi.list().then((r) => setNotes(Array.isArray(r) ? r : r?.data || r?.items || [])).catch(() => setNotes([]));
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  async function save() {
    if (!text.trim() && !title.trim()) return;
    setBusy(true);
    setError("");
    try {
      const html = text.trim().split(/\n/).map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`).join("");
      const res = await notesApi.create({ title: title.trim() || text.trim().split("\n")[0].slice(0, 60) || "Note", content: JSON.stringify({ html, list: [], target: "", deals: "", tags: [], colorIdx: 0 }) });
      const note = res?.data || res;
      setNotes((list) => [note, ...(list || [])]);
      setTitle("");
      setText("");
    } catch (err) {
      setError(err.message || "The note could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  const sorted = [...(notes || [])].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />
      <aside role="dialog" aria-label="Quick notes" className="tw-buttons fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-[#fffdf6] shadow-[-24px_0_60px_-30px_rgba(15,23,42,0.45)]">
        <header className="flex items-center justify-between border-b border-gold-100 px-5 py-3.5">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">My notes</h2>
            <p className="text-[12px] text-slate-500">Only you can see these</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-400 hover:bg-gold-50">×</button>
        </header>
        <div className="border-b border-gold-100 p-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" aria-label="Note title" maxLength={120}
            className="mb-2 h-9 w-full rounded-[10px] border border-gold-100 bg-white px-3 text-[13.5px] font-semibold outline-none focus:border-gold-300" />
          <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="Write a quick note… (Ctrl+Enter to save)" aria-label="Note"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }}
            className="w-full resize-none rounded-[10px] border border-gold-100 bg-white px-3 py-2 text-[13.5px] leading-relaxed outline-none focus:border-gold-300" />
          <div className="mt-2 flex items-center justify-between">
            {error ? <p role="alert" className="text-[12px] text-rose-700">{error}</p> : <span />}
            <button type="button" onClick={save} disabled={busy || (!text.trim() && !title.trim())} className="rounded-[10px] bg-slate-900 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40">{busy ? "Saving…" : "Save note"}</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!notes ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-[10px] bg-gold-50" />)}</div>
            : sorted.length ? (
              <ul className="space-y-2">
                {sorted.slice(0, 20).map((n) => {
                  const body = plain(parse(n.content).html);
                  return (
                    <li key={n.id}>
                      <Link href={`/notes/${n.id}`} prefetch={false} onClick={onClose} className="block rounded-[12px] bg-white px-3 py-2.5 ring-1 ring-gold-100 hover:ring-gold-300">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate text-[13.5px] font-semibold text-slate-900">{n.is_pinned ? "📌 " : ""}{n.title || "Untitled"}</span>
                          <span className="shrink-0 text-[11px] text-slate-400">{ago(n.updated_at || n.created_at)}</span>
                        </span>
                        {body ? <span className="mt-0.5 line-clamp-2 block whitespace-pre-line text-[12.5px] text-slate-500">{body}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="py-8 text-center text-[13px] text-slate-400">No notes yet.</p>}
        </div>
        <footer className="border-t border-gold-100 px-5 py-3">
          <Link href="/notes" prefetch={false} onClick={onClose} className="text-[13px] font-semibold text-brand-700 hover:underline">Open all notes →</Link>
        </footer>
      </aside>
    </>
  );
}
