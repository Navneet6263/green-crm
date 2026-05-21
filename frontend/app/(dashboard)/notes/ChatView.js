"use client";
import { useState, useEffect, useRef } from "react";
import { Search, Plus, Send, Paperclip, Smile, MoreVertical, Phone, Video, Check, X, MessageCircle } from "lucide-react";
import { chatApi } from "../../../lib/api/chat";

const Avatar = ({ name, size = "md", online = false }) => {
  const s = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  const colors = ["from-green-400 to-emerald-500","from-blue-400 to-indigo-500","from-orange-400 to-red-500","from-purple-400 to-pink-500","from-teal-400 to-cyan-500"];
  const color = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div className="relative shrink-0">
      <div className={`flex ${s} items-center justify-center rounded-full bg-gradient-to-br ${color} font-bold text-white`}>
        {name?.[0]?.toUpperCase() || "?"}
      </div>
      {online && <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />}
    </div>
  );
};

export default function ChatView({ session, allUsers: propUsers, chats, setChats }) {
  const [search, setSearch] = useState("");
  const [sel, setSel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState([]);
  const [localUsers, setLocalUsers] = useState([]);
  const bottomRef = useRef(null);

  // Load users directly inside ChatView so search always has fresh data
  useEffect(() => {
    if (!session) return;
    chatApi.getUsers()
      .then(r => { const users = Array.isArray(r) ? r : r?.data || []; setLocalUsers(users); })
      .catch(e => console.error("getUsers failed:", e));
  }, [session]);

  // Merge prop users + locally fetched users (deduplicated by id)
  const allUsers = localUsers.length > 0 ? localUsers : (propUsers || []);

  const myId = Number(session?.user?.id);
  const searchedUsers = search.length > 0
    ? allUsers.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) && Number(u.id) !== myId)
    : [];

  const conversations = search
    ? [...(chats.groups||[]),...(chats.directs||[])].filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))
    : [...(chats.groups||[]),...(chats.directs||[])];

  useEffect(() => {
    if (!sel || !session) return;
    chatApi.getMessages(sel.id, sel.type).then(r => {
      const msgs = Array.isArray(r) ? r : r?.data || r?.messages || [];
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }).catch(console.error);
  }, [sel, session]);

  useEffect(() => {
    if (!session?.token) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
    const es = new EventSource(`${API_BASE}/chat/stream?token=${session.token}`);
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const match = (sel?.type === "group" && msg.group_id === sel?.id) ||
          (sel?.type === "direct" && !msg.group_id && (msg.sender_id === sel?.id || msg.recipient_id === sel?.id));
        if (match) { setMessages(p => [...p, msg]); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60); }
      } catch {}
    };
    return () => es.close();
  }, [sel, session]);

  const send = async () => {
    if (!input.trim() || !sel) return;
    const payload = sel.type === "group" ? { text: input, groupId: sel.id } : { text: input, recipientId: sel.id };
    try { await chatApi.sendMessage(payload); setInput(""); } catch(e) { console.error(e); }
  };

  const createGroup = async () => {
    if (!groupName.trim() || !members.length) return;
    try {
      const res = await chatApi.createGroup({ name: groupName, userIds: members });
      const g = { id: res?.id || res?.data?.id, name: res?.name || res?.data?.name, chat_type: "group" };
      setChats(p => ({ ...p, groups: [...(p.groups||[]), g] }));
      setSel({ id: g.id, name: g.name, type: "group" });
      setShowModal(false); setGroupName(""); setMembers([]);
    } catch(e) { console.error(e); }
  };

  const isMine = (m) => Number(m.sender_id) === session?.user?.id || m.from === "You";
  const fmt = (t) => { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }); };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="flex w-[360px] shrink-0 flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#f0f2f5] px-4 py-3">
          <Avatar name={session?.user?.name} size="sm" online />
          <div className="flex items-center gap-1">
            <button onClick={() => setShowModal(true)} title="New Group"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
              <Plus size={20} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2 rounded-full bg-[#f0f2f5] px-4 py-2.5">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search or start new chat"
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" />
            {search && <button onClick={() => setSearch("")}><X size={14} className="text-gray-400 hover:text-gray-600" /></button>}
          </div>
        </div>

        {/* DB user search results */}
        {searchedUsers.length > 0 && (
          <div className="border-b border-gray-100">
            <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Contacts</p>
            {searchedUsers.slice(0, 5).map(u => (
              <div key={u.id} onClick={() => { setSel({ id: u.id, name: u.name, type: "direct" }); setSearch(""); }}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] transition-colors">
                <Avatar name={u.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map(c => (
            <div key={c.id} onClick={() => setSel({ id: c.id, name: c.name, type: c.chat_type || "direct" })}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition-colors ${sel?.id === c.id ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"}`}>
              <Avatar name={c.name} online={c.chat_type !== "group"} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                  <span className="text-[10px] text-gray-400 shrink-0">Today</span>
                </div>
                <p className="text-xs text-gray-400 truncate">{c.chat_type === "group" ? "👥 Group" : "Tap to chat"}</p>
              </div>
            </div>
          ))}
          {conversations.length === 0 && !search && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <Search size={32} className="text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">Search a colleague's name to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT CHAT AREA */}
      {sel ? (
        <div className="flex flex-1 flex-col">
          {/* Chat header */}
          <div className="flex items-center gap-3 bg-[#f0f2f5] px-4 py-2.5 border-b border-gray-200 shadow-sm">
            <Avatar name={sel.name} online={sel.type === "direct"} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">{sel.name}</p>
              <p className="text-[11px] text-green-500 font-medium">{sel.type === "group" ? "Group chat" : "Online"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><Video size={18} /></button>
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><Phone size={18} /></button>
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><MoreVertical size={18} /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-[6%] py-4 space-y-1"
            style={{ backgroundColor: "#eae6df", backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='52' height='52' viewBox='0 0 52 52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h26v26H0V0zm26 26h26v26H26V26z' fill='%23c5b9a8' fill-opacity='0.1'/%3E%3C/svg%3E\")" }}>
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="bg-[#fffde7] rounded-xl px-6 py-4 shadow-sm text-center border border-yellow-100">
                  <p className="text-sm text-gray-600">🔒 Messages are end-to-end encrypted</p>
                  <p className="text-xs text-gray-400 mt-1">Say hello to <span className="font-semibold">{sel.name}</span></p>
                </div>
              </div>
            )}
            {messages.map((m, i) => {
              const mine = isMine(m);
              const sameAsPrev = i > 0 && isMine(messages[i - 1]) === mine;
              return (
                <div key={i} className={`flex ${mine ? "justify-end" : "justify-start"} ${sameAsPrev ? "mt-0.5" : "mt-3"}`}>
                  <div className={`relative max-w-[65%] rounded-2xl px-4 py-2 shadow-sm ${mine ? "bg-[#d9fdd3] rounded-tr-sm" : "bg-white rounded-tl-sm"}`}>
                    {!mine && sel.type === "group" && (
                      <p className="text-[10px] font-bold text-green-600 mb-1">{m.sender_name || m.from}</p>
                    )}
                    <p className="text-sm text-gray-800 leading-relaxed break-words">{m.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                      <span className="text-[10px] text-gray-400">{fmt(m.created_at || m.time)}</span>
                      {mine && (
                        <span className="text-blue-500 text-[10px] flex">
                          <Check size={11} strokeWidth={2.5} className="-mr-1.5" />
                          <Check size={11} strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 bg-[#f0f2f5] px-4 py-3 border-t border-gray-200">
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><Smile size={22} /></button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 transition-colors"><Paperclip size={20} /></button>
            <div className="flex-1 rounded-full bg-white shadow-sm px-5 py-2.5 border border-gray-100">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                placeholder="Type a message" className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" />
            </div>
            <button onClick={send} disabled={!input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white shadow shadow-green-200 transition-all active:scale-95">
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-[#f8faf7] border-l-4 border-green-100">
          <div className="text-center max-w-xs">
            <div className="mx-auto mb-5 h-24 w-24 rounded-full bg-white shadow-lg flex items-center justify-center border border-gray-100">
              <MessageCircle size={40} className="text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">GreenCRM Chat</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Search your colleagues by name and start real-time conversations instantly.</p>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[400px] rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#f0f2f5] px-5 py-4">
              <h3 className="text-sm font-bold text-gray-800">New Group</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-5">
              <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-400 mb-4 transition-colors" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Add Participants</p>
              <div className="max-h-48 overflow-y-auto space-y-1 mb-4 rounded-xl border border-gray-100 divide-y divide-gray-50">
                {allUsers.filter(u => u.id !== session?.user?.id).map(u => (
                  <div key={u.id} onClick={() => setMembers(p => p.includes(u.id) ? p.filter(x => x !== u.id) : [...p, u.id])}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${members.includes(u.id) ? "bg-green-50" : "hover:bg-gray-50"}`}>
                    <Avatar name={u.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                    <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${members.includes(u.id) ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
                      {members.includes(u.id) && <Check size={10} strokeWidth={3} className="text-white" />}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowModal(false)} className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                <button onClick={createGroup} className="flex-1 rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 transition-colors shadow shadow-green-200">Create Group</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
