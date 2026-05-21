"use client";

import { useState, useEffect, useCallback } from "react";
import { notesApi } from "@/lib/api/notes";
import CompactNotesPanel from "@/components/notes/CompactNotesPanel";
import EditorPanel from "@/components/notes/EditorPanel";
import { toast } from "react-hot-toast";
import { FileText, Sparkles, Pin, Tag } from "lucide-react";

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const fetched = await notesApi.list({ search: searchQuery || undefined, tag: selectedTag || undefined });
      setNotes(fetched);
    } catch {
      toast.error("Failed to load notes");
    }
  }, [searchQuery, selectedTag]);

  const fetchTags = useCallback(async () => {
    try { setTags(await notesApi.getTags()); } catch {}
  }, []);

  useEffect(() => {
    const load = async () => { setLoading(true); await Promise.all([fetchNotes(), fetchTags()]); setLoading(false); };
    load();
  }, [fetchNotes, fetchTags]);

  const handleCreateNote = async () => {
    try {
      const newNote = await notesApi.create({ title: "Untitled Note", content: JSON.stringify({ type: "doc", content: [] }) });
      setNotes((prev) => [newNote, ...prev]);
      setSelectedNote(newNote);
      toast.success("Note created");
    } catch { toast.error("Failed to create note"); }
  };

  const handleUpdateNote = async (noteId, data) => {
    try {
      const updated = await notesApi.update(noteId, data);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setSelectedNote(updated);
    } catch { toast.error("Failed to save"); }
  };

  const handlePinNote = async (noteId) => {
    try {
      const updated = await notesApi.togglePin(noteId);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      if (selectedNote?.id === noteId) setSelectedNote(updated);
      toast.success(updated.is_pinned ? "Pinned" : "Unpinned");
    } catch { toast.error("Failed to pin"); }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await notesApi.delete(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (selectedNote?.id === noteId) setSelectedNote(null);
      toast.success("Deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const handleColorChange = async (noteId, color) => {
    try {
      const updated = await notesApi.update(noteId, { color });
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      if (selectedNote?.id === noteId) setSelectedNote(updated);
    } catch { toast.error("Failed to change color"); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <CompactNotesPanel
        notes={notes} tags={tags} searchQuery={searchQuery}
        selectedTag={selectedTag} selectedNoteId={selectedNote?.id ?? null}
        onSearchChange={setSearchQuery} onTagSelect={setSelectedTag}
        onNoteSelect={setSelectedNote} onNotePin={handlePinNote}
        onNoteDelete={handleDeleteNote} onNoteColorChange={handleColorChange}
        onCreateNote={handleCreateNote}
      />
      {selectedNote ? (
        <EditorPanel note={selectedNote} onUpdate={handleUpdateNote} onClose={() => setSelectedNote(null)} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-6">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="text-blue-400" size={28} />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">
              {notes.length === 0 ? "No notes yet" : "Select a note"}
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              {notes.length === 0 ? "Create your first note to get started" : "Click any note on the left to open it here"}
            </p>
            {notes.length === 0 ? (
              <button onClick={handleCreateNote} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors">
                <Sparkles size={15} /> Create first note
              </button>
            ) : (
              <div className="space-y-2.5 text-xs text-gray-400 text-left bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-2"><Pin size={13} /> Pin important notes to top</div>
                <div className="flex items-center gap-2"><Tag size={13} /> Use tags to organize</div>
                <div className="flex items-center gap-2"><Sparkles size={13} /> Auto-saves as you type</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
