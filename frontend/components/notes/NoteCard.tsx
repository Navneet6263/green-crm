'use client';

import { Note, NOTE_COLORS } from '@/types/note';
import { Pin, Archive, Trash2, Palette } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useRef, useEffect } from 'react';

interface NoteCardProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onColorChange: (color: string | null) => void;
}

export default function NoteCard({
  note, isActive, onClick, onPin, onArchive, onDelete, onColorChange,
}: NoteCardProps) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const colorClass = NOTE_COLORS.find(c => c.value === note.color)?.class || 'bg-white';

  const getPreview = (content: string) => {
    try {
      const parsed = JSON.parse(content);
      const extract = (node: any): string => {
        if (node.text) return node.text;
        if (node.content) return node.content.map(extract).join(' ');
        return '';
      };
      const text = extract(parsed).trim();
      return text.slice(0, 100) + (text.length > 100 ? '...' : '');
    } catch { return ''; }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${colorClass} ${isActive ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); setShowContextMenu(true); }}
    >
      {note.is_pinned && (
        <Pin size={13} className="absolute top-2 right-2 text-blue-500 fill-blue-500" />
      )}

      <h3 className="font-semibold text-gray-900 mb-1 pr-6 truncate text-sm">
        {note.title || 'Untitled Note'}
      </h3>

      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
        {getPreview(note.content)}
      </p>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{note.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="text-xs text-gray-400">
        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
      </div>

      {showContextMenu && (
        <div
          ref={menuRef}
          className="absolute right-2 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[160px]"
          onClick={e => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => { onPin(); setShowContextMenu(false); }}
          >
            <Pin size={13} /> {note.is_pinned ? 'Unpin' : 'Pin'}
          </button>

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => setShowColorPicker(p => !p)}
          >
            <Palette size={13} /> Change color
          </button>

          {showColorPicker && (
            <div className="px-4 py-2 flex gap-2 border-t border-gray-100">
              {NOTE_COLORS.map(color => (
                <button
                  key={color.value || 'none'}
                  className={`w-5 h-5 rounded-full border-2 ${color.class} ${note.color === color.value ? 'border-blue-500' : 'border-gray-300'}`}
                  onClick={() => { onColorChange(color.value); setShowColorPicker(false); setShowContextMenu(false); }}
                  title={color.name}
                />
              ))}
            </div>
          )}

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            onClick={() => { onArchive(); setShowContextMenu(false); }}
          >
            <Archive size={13} /> Archive
          </button>

          <button
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-500"
            onClick={() => { if (confirm('Delete this note?')) { onDelete(); setShowContextMenu(false); } }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
