"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EditorPanel from "@/components/notes/EditorPanel";
import { ArrowLeft } from "lucide-react";

export default function NoteViewPage() {
  const params = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/notes/${params.id}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setNote(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params?.id]);

  const handleUpdate = async (noteId, data) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (res.ok) setNote((await res.json()).data);
    } catch (error) { console.error(error); }
  };

  const handleClose = () => window.close();

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-gray-500">Loading note...</div></div>;

  if (!note) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-gray-500 mb-4">Note not found</p>
        <button onClick={handleClose} className="text-blue-500 hover:text-blue-600">Close window</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Close">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Note Editor</h1>
      </div>
      <EditorPanel note={note} onUpdate={handleUpdate} onClose={handleClose} />
    </div>
  );
}
