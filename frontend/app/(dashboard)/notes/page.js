"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "../../../lib/session";
import { notesApi } from "../../../lib/api/notes";
import { chatApi } from "../../../lib/api/chat";
import NotesView from "./NotesView";
import ChatView from "./ChatView";
import { FileText, MessageCircle } from "lucide-react";

export default function WorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("notes");
  const [notes, setNotes] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [chats, setChats] = useState({ groups: [], directs: [] });

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login"); return; }
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    notesApi.list().then(r => setNotes(Array.isArray(r) ? r : r?.data || [])).catch(console.error);
    chatApi.listChats().then(r => setChats(r?.groups || r?.data?.groups ? r : r?.data || r || { groups: [], directs: [] })).catch(console.error);
    chatApi.getUsers().then(r => setAllUsers(Array.isArray(r) ? r : r?.data || [])).catch(console.error);
  }, [session]);

  const NAV = [{ id: "notes", Icon: FileText }, { id: "chat", Icon: MessageCircle }];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex h-screen w-full overflow-hidden bg-white">
      <aside className="flex w-16 shrink-0 flex-col items-center gap-3 border-r border-gray-100 py-5 bg-gray-50">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-xs font-black text-white shadow-md shadow-green-200">
          G
        </div>
        {NAV.map(({ id, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${tab === id ? "bg-green-100 text-green-600 shadow-sm" : "text-gray-400 hover:bg-gray-200 hover:text-gray-600"}`}>
            <Icon size={20} />
          </button>
        ))}
        <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white shadow">
          {session?.user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </aside>

      {tab === "notes"
        ? <NotesView session={session} notes={notes} setNotes={setNotes} />
        : <ChatView session={session} allUsers={allUsers} chats={chats} setChats={setChats} />
      }
    </div>
  );
}
