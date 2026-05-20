'use client';

import { Note, NoteTag } from '@/types/note';
import { Search, Plus, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import NoteCard from './NoteCard';

interface NotesListPanelProps {
  notes: Note[];
  tags: NoteTag[];
  activeNoteId: string | null;
  searchQuery: string;
  selectedTag: string | null;
  onSearchChange: (query: string) => void;
  onTagSelect: (tag: string | null) => void;
  onNoteSelect: (noteId: string) => void;
  onNotePin: (noteId: string) => void;
  onNoteArchive: (noteId: string) => void;
  onNoteDelete: (noteId: string) => void;
  onNoteColorChange: (noteId: string, color: string | null) => void;
  onCreateNote: () => void;
}

export default function NotesListPanel({
  notes,
  tags,
  activeNoteId,
  searchQuery,
  selectedTag,
  onSearchChange,
  onTagSelect,
  onNoteSelect,
  onNotePin,
  onNoteArchive,
  onNoteDelete,
  onNoteColorChange,
  onCreateNote,
}: NotesListPanelProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  const pinnedNotes = notes.filter((note) => note.is_pinned);
  const recentNotes = notes.filter((note) => !note.is_pinned);

  return (
    <div className="w-80 border-r border-gray-200 bg-gray-50 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">My Notes</h2>
          <button
            onClick={onCreateNote}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            title="New Note"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.tag}
                onClick={() => onTagSelect(selectedTag === tag.tag ? null : tag.tag)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  selectedTag === tag.tag
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag.tag} ({tag.count})
              </button>
            ))}
            {selectedTag && (
              <button
                onClick={() => onTagSelect(null)}
                className="text-xs px-2 py-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                title="Clear filter"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {pinnedNotes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pinned</h3>
            <div className="space-y-2">
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isActive={note.id === activeNoteId}
                  onClick={() => onNoteSelect(note.id)}
                  onPin={() => onNotePin(note.id)}
                  onArchive={() => onNoteArchive(note.id)}
                  onDelete={() => onNoteDelete(note.id)}
                  onColorChange={(color) => onNoteColorChange(note.id, color)}
                />
              ))}
            </div>
          </div>
        )}

        {recentNotes.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Recent</h3>
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isActive={note.id === activeNoteId}
                  onClick={() => onNoteSelect(note.id)}
                  onPin={() => onNotePin(note.id)}
                  onArchive={() => onNoteArchive(note.id)}
                  onDelete={() => onNoteDelete(note.id)}
                  onColorChange={(color) => onNoteColorChange(note.id, color)}
                />
              ))}
            </div>
          </div>
        )}

        {notes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">No notes found</p>
            <button
              onClick={onCreateNote}
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              Create your first note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
