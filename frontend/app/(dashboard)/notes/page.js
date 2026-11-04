"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession } from "../../../lib/session";
import { notesApi } from "../../../lib/api/notes";
import NotesView from "./NotesView";
import Link from "next/link";
import { ArrowLeft, FileText, MessageCircle } from "lucide-react";

export default function WorkspacePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login"); return; }
    setSession(s);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    notesApi.list().then(r => setNotes(Array.isArray(r) ? r : r?.data || [])).catch(console.error);
  }, [session]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="flex h-screen w-full overflow-hidden bg-white">
      <aside className="flex w-16 shrink-0 flex-col items-center gap-3 border-r border-gray-100 py-5 bg-gray-50">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-xs font-black text-white shadow-md shadow-green-200">
          G
        </div>
        <span title="Notes" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-green-600 shadow-sm"><FileText size={20} /></span>
        {/* Team chat moved to Discuss. */}
        <Link href="/discuss" title="Discuss" aria-label="Open Discuss" className="flex h-11 w-11 items-center justify-center rounded-2xl text-gray-400 transition-all duration-200 hover:bg-gray-200 hover:text-gray-600"><MessageCircle size={20} /></Link>
        <Link href="/dashboard" title="Back to dashboard" aria-label="Back to dashboard" className="flex h-11 w-11 items-center justify-center rounded-2xl text-gray-400 transition-all duration-200 hover:bg-gray-200 hover:text-gray-600"><ArrowLeft size={20} /></Link>
        <div className="mt-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white shadow">
          {session?.user?.name?.[0]?.toUpperCase() || "U"}
        </div>
      </aside>

      <NotesView session={session} notes={notes} setNotes={setNotes} />
    </div>
  );
}
