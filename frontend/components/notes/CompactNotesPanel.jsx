'use client';

import { Note, NoteTag, NOTE_COLORS } from '@/types/note';
import { Search, Plus, Pin, X, Trash2, MoreVertical, Palette } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface CompactNotesPanelProps {
  notes: Note[];
  tags: NoteTag[];
  searchQuery: string;
  selectedTag: string | null;
  selectedNoteId: string | null;
  onSearchChange: (query: string) => void;
  onTagSelect: (tag: string | null) => void;
  onNoteSelect: (note: Note) => void;
  onNotePin: (noteId: string) => void;
  onNoteDelete: (noteId: string) => void;
  onNoteColorChange: (noteId: string, color: string | null) => void;
  onCreateNote: () => void;
}

export default function CompactNotesPanel({
  notes, tags, searchQuery, selectedTag, selectedNoteId,
  onSearchChange, onTagSelect, onNoteSelect,
  onNotePin, onNoteDelete, onNoteColorChange, onCreateNote,
}: CompactNotesPanelProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => onSearchChange(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearchChange]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuNoteId(null);
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getPreview = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      const extract = (node: any): string => {
        if (node.text) return node.text;
        if (node.content) return node.content.map(extract).join(' ');
        return '';
      };
      const text = extract(parsed).trim();
      return text.length > 0 ? text.slice(0, 80) : 'Empty note';
    } catch { return 'Empty note'; }
  };

  const pinnedNotes = notes.filter(n => n.is_pinned);
  const recentNotes = notes.filter(n => !n.is_pinned);

  const NoteItem = ({ note }: { note: Note }) => {
    const colorBg = NOTE_COLORS.find(c => c.value === note.color)?.class || '';
    const isActive = note.id === selectedNoteId;

    return (
      <div
        onClick={() => onNoteSelect(note)}
        className={`relative p-3 border-b border-gray-100 cursor-pointer transition-all group
          ${colorBg}
          ${isActive
            ? 'bg-blue-50 border-l-[3px] border-l-blue-500'
            : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'
          }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-medium text-sm truncate flex-1 ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
            {note.title || 'Untitled Note'}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onNotePin(note.id); }}
              className={`transition-opacity ${note.is_pinned ? 'opacity-100 text-blue-500' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500'}`}
            >
              <Pin size={13} className={note.is_pinned ? 'fill-current' : ''} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setMenuNoteId(note.id); setShowColorPicker(false); }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
            >
              <MoreVertical size={13} />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">
          {getPreview(note.content)}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 flex-wrap">
            {note.tags.slice(0, 2).map(tag => (
              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-xs text-gray-400">+{note.tags.length - 2}</span>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
          </span>
        </div>

        {menuNoteId === note.id && (
          <div
            ref={menuRef}
            onClick={e => e.stopPropagation()}
            className="absolute right-2 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 min-w-[160px]"
          >
            <button
              onClick={() => { setShowColorPicker(p => !p); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Palette size={13} /> Change color
            </button>

            {showColorPicker && (
              <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-gray-100">
                {NOTE_COLORS.map(color => (
                  <button
                    key={color.value || 'none'}
                    className={`w-5 h-5 rounded-full border-2 ${color.class} ${note.color === color.value ? 'border-blue-500' : 'border-gray-300'}`}
                    onClick={() => { onNoteColorChange(note.id, color.value); setMenuNoteId(null); setShowColorPicker(false); }}
                    title={color.name}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => { if (confirm('Delete this note?')) { onNoteDelete(note.id); setMenuNoteId(null); } }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-500"
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-72 border-r border-gray-200 bg-white flex flex-col h-full flex-shrink-0">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">My Notes</h2>
          <button
            onClick={onCreateNote}
            className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {tags.length > 0 && (
        <div className="px-3 py-2 border-b border-gray-100 flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <button
              key={tag.tag}
              onClick={() => onTagSelect(selectedTag === tag.tag ? null : tag.tag)}
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${selectedTag === tag.tag ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {tag.tag} ({tag.count})
            </button>
          ))}
          {selectedTag && (
            <button onClick={() => onTagSelect(null)} className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-500">
              <X size={11} />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {pinnedNotes.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pinned</span>
            </div>
            {pinnedNotes.map(note => <NoteItem key={note.id} note={note} />)}
          </>
        )}

        {recentNotes.length > 0 && (
          <>
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent</span>
            </div>
            {recentNotes.map(note => <NoteItem key={note.id} note={note} />)}
          </>
        )}

        {notes.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm mb-2">No notes found</p>
            <button onClick={onCreateNote} className="text-blue-500 text-sm hover:underline">Create one</button>
          </div>
        )}
      </div>
    </div>
  );
}
