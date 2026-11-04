"use client";

import { useState } from "react";
import { colorFor } from "../dashboard/home/widgetCatalog";

export const initials = (name) => String(name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const shortTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  const today = new Date().toDateString() === d.toDateString();
  return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", ...(today ? { hour: "numeric", minute: "2-digit", hour12: true } : { day: "numeric", month: "short" }) });
};

export function ChatAvatar({ chat, size = "h-10 w-10 text-[13px]" }) {
  if (chat.type === "group") {
    return (
      <span className={`relative grid shrink-0 place-items-center rounded-[12px] font-bold text-white ${size}`} style={{ background: chat.is_company_wide ? "#b98300" : colorFor(chat.id) }} aria-hidden="true">
        {chat.is_company_wide ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5M15 14.6c2.6-.3 4.5 1 5.4 4.4" /></svg>
        ) : <span>#</span>}
      </span>
    );
  }
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-full font-bold text-white ${size}`} style={{ background: colorFor(chat.id) }} aria-hidden="true">
      {initials(chat.name)}
      {chat.online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" /> : null}
    </span>
  );
}

/** Left column: groups and people, newest first, with unread counts. */
export default function ChatList({ list, activeKey, onOpen, onNewGroup, typing }) {
  const [search, setSearch] = useState("");
  const [pickPerson, setPickPerson] = useState(false);
  const q = search.trim().toLowerCase();
  const chats = (list?.chats || []).filter((c) => !q || c.name.toLowerCase().includes(q));
  const startable = (list?.people || []).filter((p) => !list.chats.some((c) => c.type === "direct" && c.id === p.id) && (!q || p.name.toLowerCase().includes(q)));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-slate-100 p-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-bold text-slate-900">Discuss</h1>
          <span className="flex gap-1">
            <button type="button" onClick={() => setPickPerson((v) => !v)} aria-pressed={pickPerson} title="New message" className={`h-8 rounded-[8px] px-2.5 text-[12.5px] font-semibold ${pickPerson ? "bg-slate-900 text-white" : "text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>New message</button>
            <button type="button" onClick={onNewGroup} className="h-8 rounded-[8px] bg-brand-700 px-2.5 text-[12.5px] font-semibold text-white hover:bg-brand-800">+ Group</button>
          </span>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={pickPerson ? "Find a person" : "Search chats and people"} aria-label="Search chats"
          className="h-9 w-full rounded-[10px] border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none focus:border-brand-300 focus:bg-white" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!list ? <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-[10px] bg-slate-100" />)}</div> : null}
        {list && !pickPerson ? (
          chats.length ? (
            <ul>
              {chats.map((c) => (
                <li key={c.key}>
                  <button type="button" onClick={() => onOpen(c.key)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${activeKey === c.key ? "bg-brand-50/70" : "hover:bg-slate-50"}`}>
                    <ChatAvatar chat={c} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[13.5px] ${c.unread ? "font-bold text-slate-900" : "font-semibold text-slate-800"}`}>{c.name}</span>
                        <span className={`shrink-0 text-[11px] ${c.unread ? "font-semibold text-brand-700" : "text-slate-400"}`}>{shortTime(c.last?.at)}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[12.5px] ${typing[c.key] ? "italic text-brand-700" : "text-slate-500"}`}>
                          {typing[c.key] ? `${typing[c.key].name} is typing…` : c.last ? `${c.type === "group" || c.last.sender === "You" ? `${c.last.sender}: ` : ""}${c.last.text}` : c.type === "group" ? `${c.member_count} members` : "Say hello"}
                        </span>
                        {c.unread ? <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand-700 px-1.5 text-[11px] font-bold text-white">{c.unread > 99 ? "99+" : c.unread}</span> : null}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-8 text-center text-[13px] text-slate-400">{q ? "No chats match." : "No chats yet. Start a group or message someone."}</p>
        ) : null}
        {list && (pickPerson || q) && startable.length ? (
          <div className="border-t border-slate-100 py-1">
            <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">People</p>
            <ul>
              {startable.slice(0, 60).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setPickPerson(false); setSearch(""); onOpen(`d:${p.id}`); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                    <ChatAvatar chat={{ type: "direct", id: p.id, name: p.name, online: p.online }} size="h-8 w-8 text-[11.5px]" />
                    <span className="min-w-0"><span className="block truncate text-[13px] font-semibold text-slate-800">{p.name}</span><span className="block text-[11.5px] capitalize text-slate-400">{String(p.role || "").replace(/-/g, " ")}{p.online ? " · online" : ""}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
