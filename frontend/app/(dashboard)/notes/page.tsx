'use client';

import { useState, useEffect, useCallback } from 'react';
import { notesApi } from '@/lib/api/notes';
import { Note, NoteTag } from '@/types/note';
import NotesListPanel from '@/components/notes/NotesListPanel';
import EditorPanel from '@/components/notes/EditorPanel';
import { toast } from 'react-hot-toast';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<NoteTag[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeNote = notes.find((note) => note.id === activeNoteId) || null;

  const fetchNotes = useCallback(async () => {
    try {
      const fetchedNotes = await notesApi.list({
        search: searchQuery || undefined,
        tag: selectedTag || undefined,
      });
      setNotes(fetchedNotes);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast.error('Failed to load notes');
    }
  }, [searchQuery, selectedTag]);

  const fetchTags = useCallback(async () => {
    try {
      const fetchedTags = await notesApi.getTags();
      setTags(fetchedTags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchNotes(), fetchTags()]);
      setLoading(false);
    };
    loadData();
  }, [fetchNotes, fetchTags]);

  const handleCreateNote = async () => {
    try {
      const newNote = await notesApi.create({
        title: 'Untitled Note',
        content: JSON.stringify({ type: 'doc', content: [] }),
      });
      setNotes([newNote, ...notes]);
      setActiveNoteId(newNote.id);
      toast.success('Note created');
    } catch (error) {
      console.error('Failed to create note:', error);
      toast.error('Failed to create note');
    }
  };

  const handleUpdateNote = async (noteId: string, data: Partial<Note>) => {
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.is_pinned !== undefined) updateData.isPinned = data.is_pinned;
      if (data.tags !== undefined) updateData.tags = data.tags;

      const updatedNote = await notesApi.update(noteId, updateData);
      
      setNotes(notes.map((note) => (note.id === noteId ? updatedNote : note)));
      
      // Refresh tags if tags were updated
      if (data.tags !== undefined) {
        fetchTags();
      }
    } catch (error) {
      console.error('Failed to update note:', error);
      toast.error('Failed to update note');
    }
  };

  const handlePinNote = async (noteId: string) => {
    try {
      const updatedNote = await notesApi.togglePin(noteId);
      setNotes(notes.map((note) => (note.id === noteId ? updatedNote : note)));
      toast.success(updatedNote.is_pinned ? 'Note pinned' : 'Note unpinned');
    } catch (error) {
      console.error('Failed to pin note:', error);
      toast.error('Failed to pin note');
    }
  };

  const handleArchiveNote = async (noteId: string) => {
    try {
      await notesApi.delete(noteId);
      setNotes(notes.filter((note) => note.id !== noteId));
      if (activeNoteId === noteId) {
        setActiveNoteId(null);
      }
      toast.success('Note archived');
    } catch (error) {
      console.error('Failed to archive note:', error);
      toast.error('Failed to archive note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await notesApi.delete(noteId);
      setNotes(notes.filter((note) => note.id !== noteId));
      if (activeNoteId === noteId) {
        setActiveNoteId(null);
      }
      toast.success('Note deleted');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleColorChange = async (noteId: string, color: string | null) => {
    try {
      const updatedNote = await notesApi.update(noteId, { color });
      setNotes(notes.map((note) => (note.id === noteId ? updatedNote : note)));
      toast.success('Color changed');
    } catch (error) {
      console.error('Failed to change color:', error);
      toast.error('Failed to change color');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading notes...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <NotesListPanel
        notes={notes}
        tags={tags}
        activeNoteId={activeNoteId}
        searchQuery={searchQuery}
        selectedTag={selectedTag}
        onSearchChange={setSearchQuery}
        onTagSelect={setSelectedTag}
        onNoteSelect={setActiveNoteId}
        onNotePin={handlePinNote}
        onNoteArchive={handleArchiveNote}
        onNoteDelete={handleDeleteNote}
        onNoteColorChange={handleColorChange}
        onCreateNote={handleCreateNote}
      />
      <EditorPanel
        note={activeNote}
        onUpdate={handleUpdateNote}
        onClose={() => setActiveNoteId(null)}
      />
    </div>
  );
}
