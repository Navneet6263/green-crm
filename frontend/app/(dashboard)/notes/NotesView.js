"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Plus, Pin, Check, Trash2, FileText, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List } from "lucide-react";
import { notesApi } from "../../../lib/api/notes";

const COLORS = [
  { bg:"#fef9c3", border:"#fde047" }, { bg:"#dcfce7", border:"#86efac" },
  { bg:"#ede9fe", border:"#c4b5fd" }, { bg:"#fee2e2", border:"#fca5a5" },
  { bg:"#dbeafe", border:"#93c5fd" }, { bg:"#f3f4f6", border:"#d1d5db" },
];

function parse(str) {
  try { return JSON.parse(str || "{}"); } catch { return { html:"", list:[], target:"", deals:"", tags:[], colorIdx:5 }; }
}

const Divider = () => <div className="h-5 w-px bg-gray-200 mx-0.5" />;

const Btn = ({ onClick, title, children }) => (
  <button onClick={onClick} title={title}
    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-all text-xs font-bold">
    {children}
  </button>
);

export default function NotesView({ notes, setNotes }) {
  const [sel, setSel] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const editorRef = useRef(null);
  const timer = useRef(null);
  const c = parse(sel?.content);
  const scheme = COLORS[c.colorIdx ?? 5];

  useEffect(() => {
    if (editorRef.current && sel) editorRef.current.innerHTML = parse(sel.content).html || "";
  }, [sel?.id]);

  const exec = (cmd, val = null) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); };

  const save = useCallback((updates = {}) => {
    if (!sel) return;
    const html = editorRef.current?.innerHTML ?? parse(sel.content).html;
    const updated = { ...sel, content: JSON.stringify({ ...parse(sel.content), html, ...updates }), ...updates };
    setSel(updated);
    setNotes(p => p.map(n => n.id === sel.id ? updated : n));
    clearTimeout(timer.current); setSaving(true);
    timer.current = setTimeout(async () => {
      try { await notesApi.update(sel.id, { title: updated.title, content: updated.content }); }
      catch(e) { console.error(e); } finally { setSaving(false); }
    }, 700);
  }, [sel]);

  const patchC = (d) => {
    const updated = { ...parse(sel.content), html: editorRef.current?.innerHTML ?? "", ...d };
    save({ content: JSON.stringify(updated) });
  };

  const create = async () => {
    try {
      const res = await notesApi.create({ title: "Untitled", content: JSON.stringify({ html:"", list:[], target:"", deals:"", tags:[], colorIdx:5 }) });
      setNotes(p => [res.data, ...p]); setSel(res.data);
    } catch(e) { console.error(e); }
  };

  const togglePin = async () => {
    try { const r = await notesApi.togglePin(sel.id); save({ is_pinned: r.data.is_pinned }); } catch(e) { console.error(e); }
  };

  const remove = async () => {
    try { await notesApi.delete(sel.id); setNotes(p => p.filter(n => n.id !== sel.id)); setSel(null); } catch(e) { console.error(e); }
  };

  const filtered = notes.filter(n => n.title?.toLowerCase().includes(search.toLowerCase()));
  const doneCount = (c.list || []).filter(t => t.done).length;
  const wordCount = (c.html || "").replace(/<[^>]*>/g, "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-72 shrink-0 flex-col border-r border-gray-100 bg-[#fafafa]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-sm font-bold text-gray-700">Notes</h2>
          <button onClick={create} className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500 hover:bg-green-600 text-white shadow-sm transition-colors"><Plus size={14} /></button>
        </div>
        <div className="relative mx-4 mb-3">
          <Search size={12} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…"
            className="w-full rounded-xl bg-white border border-gray-200 pl-8 pr-3 py-2 text-xs text-gray-600 outline-none focus:border-green-300 shadow-sm transition-colors" />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
          {filtered.length === 0 && <p className="text-center text-xs text-gray-400 mt-10">No notes yet</p>}
          {filtered.map(n => {
            const nc = parse(n.content);
            const ns = COLORS[nc.colorIdx ?? 5];
            const preview = (nc.html || "").replace(/<[^>]*>/g, "") || nc.text || "";
            return (
              <div key={n.id} onClick={() => setSel(n)}
                style={{ borderLeftColor: ns.border, background: sel?.id === n.id ? ns.bg : "white" }}
                className="rounded-xl p-3 cursor-pointer border border-gray-100 border-l-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="text-xs font-semibold text-gray-800 truncate">{n.title || "Untitled"}</h3>
                  {n.is_pinned && <Pin size={10} className="text-orange-400 shrink-0 mt-0.5" />}
                </div>
                <p className="mt-1 text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{preview || "No content"}</p>
                {(nc.tags || []).length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {nc.tags.slice(0, 2).map(t => <span key={t} className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">#{t}</span>)}
                  </div>
                )}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[9px] text-gray-300">{new Date(n.updated_at || n.created_at).toLocaleDateString("en", { month:"short", day:"numeric" })}</span>
                  {nc.list?.length > 0 && <span className="text-[9px] text-gray-400">{nc.list.filter(x => x.done).length}/{nc.list.length} done</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      {sel ? (
        <div className="flex flex-1 flex-col bg-white overflow-hidden">
          {/* Google Docs-style Toolbar */}
          <div className="flex items-center flex-wrap gap-0.5 border-b border-gray-200 bg-[#f8f9fa] px-3 py-1.5 shadow-sm">
            <select onChange={e => exec("formatBlock", e.target.value)} defaultValue="p"
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none hover:border-gray-300 cursor-pointer mr-1 transition-colors">
              <option value="p">Normal text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
            </select>
            <Divider />
            <Btn onClick={() => exec("bold")} title="Bold (Ctrl+B)"><Bold size={13} /></Btn>
            <Btn onClick={() => exec("italic")} title="Italic (Ctrl+I)"><Italic size={13} /></Btn>
            <Btn onClick={() => exec("underline")} title="Underline (Ctrl+U)"><Underline size={13} /></Btn>
            <Btn onClick={() => exec("strikeThrough")} title="Strikethrough"><span className="line-through">S</span></Btn>
            <Divider />
            <Btn onClick={() => exec("insertUnorderedList")} title="Bullet list"><List size={13} /></Btn>
            <Btn onClick={() => exec("insertOrderedList")} title="Numbered list"><span className="text-[10px]">1.</span></Btn>
            <Divider />
            <Btn onClick={() => exec("justifyLeft")} title="Align left"><AlignLeft size={13} /></Btn>
            <Btn onClick={() => exec("justifyCenter")} title="Align center"><AlignCenter size={13} /></Btn>
            <Btn onClick={() => exec("justifyRight")} title="Align right"><AlignRight size={13} /></Btn>
            <Divider />
            <div className="flex items-center gap-1">
              {COLORS.map((clr, i) => (
                <button key={i} onClick={() => patchC({ colorIdx: i })} style={{ background: clr.border }}
                  className={`h-4 w-4 rounded-full border-2 transition-all hover:scale-110 ${(c.colorIdx ?? 5) === i ? "border-gray-600 scale-110" : "border-transparent"}`} />
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-400">
              {saving && <span className="animate-pulse">Saving…</span>}
              <span>{wordCount} words</span>
              <button onClick={togglePin} className={`p-1.5 rounded-lg transition-colors ${sel.is_pinned ? "text-orange-500 bg-orange-50" : "text-gray-400 hover:bg-gray-200"}`}><Pin size={14} /></button>
              <button onClick={remove} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-14 py-10">
              <input value={sel.title || ""} onChange={e => save({ title: e.target.value })} placeholder="Untitled Note"
                className="w-full bg-transparent text-3xl font-bold text-gray-900 outline-none placeholder:text-gray-200 mb-3 tracking-tight" />
              {/* Tags */}
              <div className="flex items-center flex-wrap gap-1.5 mb-5">
                {(c.tags || []).map(t => (
                  <span key={t} onClick={() => patchC({ tags: (c.tags || []).filter(x => x !== t) })}
                    style={{ background: scheme.bg, borderColor: scheme.border }}
                    className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium cursor-pointer hover:opacity-70 text-gray-600 transition-opacity">
                    #{t} <span className="text-[10px]">×</span>
                  </span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) { patchC({ tags: [...(c.tags||[]), tagInput.trim()] }); setTagInput(""); }}}
                  placeholder="+ Add tag" className="rounded-full bg-gray-50 border border-dashed border-gray-300 px-3 py-0.5 text-xs text-gray-500 outline-none focus:border-green-300 w-24 focus:w-32 transition-all" />
              </div>
              {/* Rich Text Editor */}
              <div ref={editorRef} contentEditable suppressContentEditableWarning
                onInput={() => save({})}
                className="min-h-[200px] text-sm text-gray-700 outline-none leading-7 prose prose-sm max-w-none"
                style={{ whiteSpace: "pre-wrap" }}
                data-placeholder="Start writing…"
              />
              <style>{`[contenteditable]:empty:before{content:attr(data-placeholder);color:#d1d5db}`}</style>

              {/* Checklist */}
              <div style={{ borderTopColor: scheme.border }} className="mt-10 border-t-2 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                    <Check size={13} className="text-green-500" /> Action Items
                    {(c.list || []).length > 0 && <span style={{ background: scheme.bg }} className="ml-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-gray-600">{doneCount}/{c.list.length}</span>}
                  </span>
                  <button onClick={() => { const t = prompt("Task:"); if (t) patchC({ list: [...(c.list||[]), { id: Date.now(), text: t, done: false }] }); }}
                    className="text-[10px] font-bold text-green-600 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition-colors">+ Add Task</button>
                </div>
                {(c.list || []).length > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-gray-100 mb-4 overflow-hidden">
                    <div style={{ width: `${(doneCount / c.list.length) * 100}%`, background: scheme.border }} className="h-full rounded-full transition-all duration-300" />
                  </div>
                )}
                {(c.list || []).map(t => (
                  <div key={t.id} onClick={() => patchC({ list: c.list.map(x => x.id === t.id ? { ...x, done: !x.done } : x) })}
                    className="flex items-center gap-3 py-1.5 cursor-pointer group rounded-lg hover:bg-gray-50 px-2 -mx-2 transition-colors">
                    <div style={t.done ? { background: scheme.border, borderColor: scheme.border } : {}}
                      className={`flex h-4 w-4 items-center justify-center rounded-md border-2 transition-all ${t.done ? "" : "border-gray-300 group-hover:border-green-400"}`}>
                      {t.done && <Check size={9} strokeWidth={3} className="text-white" />}
                    </div>
                    <span className={`text-sm flex-1 ${t.done ? "text-gray-400 line-through" : "text-gray-700"}`}>{t.text}</span>
                    <button onClick={e => { e.stopPropagation(); patchC({ list: c.list.filter(x => x.id !== t.id) }); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[{ label:"Target Revenue", key:"target", prefix:"₹", emoji:"💰" }, { label:"Deals Needed", key:"deals", prefix:"#", emoji:"🎯" }].map(({ label, key, prefix, emoji }) => (
                  <div key={key} style={{ background: scheme.bg, borderColor: scheme.border }} className="rounded-2xl border p-5">
                    <p className="text-[9px] font-black tracking-widest text-gray-500 uppercase mb-1">{emoji} {label}</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-sm text-gray-400">{prefix}</span>
                      <input value={c[key] || ""} onChange={e => patchC({ [key]: e.target.value })} placeholder="0"
                        className="flex-1 bg-transparent text-2xl font-bold text-gray-800 outline-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-lg border border-gray-100">
              <FileText size={32} className="text-green-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-600 mb-1">Your workspace</h3>
            <p className="text-sm text-gray-400 mb-4">Select a note or create a new one</p>
            <button onClick={create} className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow shadow-green-200 transition-colors">+ New Note</button>
          </div>
        </div>
      )}
    </div>
  );
}
