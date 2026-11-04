"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { colorFor } from "../dashboard/home/widgetCatalog";
import { ChatAvatar } from "./ChatList";
import Composer from "./Composer";

const dayLabel = (value) => {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
};
const time = (value) => new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });
// Links in messages become clickable; everything else stays plain text.
const withLinks = (text) => String(text).split(/(https?:\/\/[^\s]+)/g).map((part, i) => (/^https?:\/\//.test(part)
  ? <a key={i} href={part} target="_blank" rel="noreferrer" className="underline underline-offset-2">{part}</a> : part));

function Bubble({ m, showName, onReply, onEdit, onDelete, canDeleteAny }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.text);
  const mine = m.mine;
  return (
    <div className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        {showName && !mine ? <span className="mb-0.5 ml-1 text-[11.5px] font-semibold" style={{ color: colorFor(m.sender_id) }}>{m.sender_name}</span> : null}
        <div className={`relative rounded-[16px] px-3.5 py-2 text-[14px] leading-relaxed ${m.deleted ? "bg-slate-100 italic text-slate-400" : mine ? "rounded-br-[6px] bg-brand-700 text-white" : "rounded-bl-[6px] bg-white text-slate-800 ring-1 ring-slate-200"}`}>
          {m.reply ? (
            <div className={`mb-1.5 rounded-[8px] border-l-[3px] px-2 py-1 text-[12px] ${mine ? "border-white/60 bg-white/10 text-white/85" : "border-brand-500 bg-slate-50 text-slate-500"}`}>
              <b className="block font-semibold">{m.reply.sender}</b><span className="line-clamp-2">{m.reply.text}</span>
            </div>
          ) : null}
          {editing ? (
            <div className="space-y-1.5">
              <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} className="w-64 max-w-full rounded-[8px] p-2 text-[13.5px] text-slate-800 outline-none" />
              <div className="flex justify-end gap-1.5 text-[12px]">
                <button type="button" onClick={() => setEditing(false)} className="rounded-[6px] px-2 py-1 font-semibold opacity-80 hover:opacity-100">Cancel</button>
                <button type="button" onClick={async () => { await onEdit(m.id, draft); setEditing(false); }} className="rounded-[6px] bg-white px-2 py-1 font-semibold text-brand-800">Save</button>
              </div>
            </div>
          ) : m.deleted ? "This message was deleted" : <span className="whitespace-pre-wrap break-words">{withLinks(m.text)}</span>}
          {m.lead ? (
            <Link href={`/leads/${m.lead.lead_id}`} prefetch={false} className={`mt-1.5 flex items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[12.5px] font-semibold ${mine ? "bg-white/15 text-white hover:bg-white/25" : "bg-gold-50 text-gold-900 ring-1 ring-gold-100 hover:bg-gold-100"}`}>
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h5" /></svg>
              <span className="min-w-0 truncate">Lead: {m.lead.name}</span>
            </Link>
          ) : null}
          <span className={`mt-0.5 block text-right text-[10.5px] ${mine && !m.deleted ? "text-white/70" : "text-slate-400"}`}>{m.edited && !m.deleted ? "edited · " : ""}{time(m.created_at)}</span>
        </div>
        {!m.deleted && !editing ? (
          <div className={`mt-0.5 flex gap-2 px-1 text-[11.5px] font-semibold text-slate-400 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 ${mine ? "justify-end" : ""}`}>
            <button type="button" onClick={() => onReply(m)} className="hover:text-brand-700">Reply</button>
            {mine ? <button type="button" onClick={() => { setDraft(m.text); setEditing(true); }} className="hover:text-brand-700">Edit</button> : null}
            {mine || canDeleteAny ? <button type="button" onClick={() => window.confirm("Delete this message for everyone?") && onDelete(m.id)} className="hover:text-rose-600">Delete</button> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The open conversation: messages by day, replies, lead links, typing note and the message box. */
export default function ChatThread({ d, token, isAdmin, onBack, onInfo }) {
  const { thread } = d;
  const [replyTo, setReplyTo] = useState(null);
  const scroller = useRef(null);
  const stick = useRef(true);
  const key = thread?.chat?.key;
  const typingNow = key ? d.typing[key] : null;

  useEffect(() => { setReplyTo(null); stick.current = true; }, [key]);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [thread?.messages?.length, typingNow]);

  if (!thread) {
    return <div className="hidden h-full place-items-center text-center text-[13px] text-slate-400 lg:grid"><div><p className="text-[15px] font-semibold text-slate-600">Pick a chat</p><p>or start a group for your team</p></div></div>;
  }
  const chat = thread.chat;
  const messages = thread.messages || [];
  const subtitle = chat.type === "group" ? `${chat.is_company_wide ? "Everyone in the company" : `${chat.members?.length || 0} members`}${chat.description ? ` · ${chat.description}` : ""}` : chat.online ? "Online" : String(chat.role || "").replace(/-/g, " ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back to chats" className="grid h-8 w-8 place-items-center rounded-[8px] text-slate-500 hover:bg-slate-100 lg:hidden">‹</button>
        {chat.name ? <ChatAvatar chat={chat} size="h-9 w-9 text-[12px]" /> : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-bold text-slate-900">{chat.name || "Loading…"}</p>
          <p className={`truncate text-[12px] text-slate-500 ${chat.type === "direct" && !typingNow ? "capitalize" : ""}`}>{typingNow ? <span className="italic text-brand-700">{typingNow.name} is typing…</span> : subtitle}</p>
        </div>
        {chat.type === "group" ? <button type="button" onClick={onInfo} className="h-8 rounded-[8px] px-2.5 text-[12.5px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Group info</button> : null}
      </header>
      <div ref={scroller} onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-[#f4f6f5] px-3 py-4 sm:px-5">
        {thread.has_more ? <div className="text-center"><button type="button" onClick={() => { stick.current = false; d.loadEarlier(); }} className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Load earlier messages</button></div> : null}
        {thread.loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className={`h-10 w-1/2 animate-pulse rounded-[14px] bg-white ${i % 2 ? "ml-auto" : ""}`} />)}</div> : null}
        {thread.error ? <p role="alert" className="rounded-[10px] bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{thread.error}</p> : null}
        {!thread.loading && !thread.error && !messages.length ? <p className="py-10 text-center text-[13px] text-slate-400">No messages yet. Say hello 👋</p> : null}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
          const showName = chat.type === "group" && (newDay || prev.sender_id !== m.sender_id);
          return (
            <div key={m.id}>
              {newDay ? <div className="my-3 flex justify-center"><span className="rounded-full bg-white px-3 py-0.5 text-[11.5px] font-semibold text-slate-500 ring-1 ring-slate-200">{dayLabel(m.created_at)}</span></div> : null}
              <div className={showName ? "pt-1.5" : ""}>
                <Bubble m={m} showName={showName} onReply={setReplyTo} onEdit={d.edit} onDelete={d.remove} canDeleteAny={isAdmin} />
              </div>
            </div>
          );
        })}
      </div>
      <Composer token={token} chatKey={key} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} onSend={d.send} onTyping={d.pingTyping} disabled={Boolean(thread.error)} />
    </div>
  );
}
