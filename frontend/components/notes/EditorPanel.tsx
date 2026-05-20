'use client';

import { Note, NOTE_COLORS } from '@/types/note';
import { Pin, Lock, X } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import EditorToolbar from './EditorToolbar';

interface EditorPanelProps {
  note: Note | null;
  onUpdate: (noteId: string, data: Partial<Note>) => void;
  onClose: () => void;
}

export default function EditorPanel({ note, onUpdate, onClose }: EditorPanelProps) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table,
      TableRow,
      TableCell,
      TableHeader,
      Image,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      scheduleAutoSave(JSON.stringify(json));
    },
  });

  const scheduleAutoSave = useCallback((content: string) => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      if (note) {
        onUpdate(note.id, { content, title, tags });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }, 2000);

    setAutoSaveTimer(timer);
  }, [note, title, tags, onUpdate, autoSaveTimer]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setTags(note.tags || []);
      
      if (editor) {
        try {
          const content = note.content ? JSON.parse(note.content) : '';
          editor.commands.setContent(content);
        } catch {
          editor.commands.setContent('');
        }
      }
    }
  }, [note?.id, editor]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (note) {
      scheduleAutoSave(JSON.stringify(editor?.getJSON()));
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      setTagInput('');
      if (note) {
        onUpdate(note.id, { tags: newTags });
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    if (note) {
      onUpdate(note.id, { tags: newTags });
    }
  };

  const handleTogglePin = () => {
    if (note) {
      onUpdate(note.id, { is_pinned: !note.is_pinned });
    }
  };

  const getWordCount = () => {
    if (!editor) return 0;
    const text = editor.getText();
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">Select a note to edit</p>
          <p className="text-sm">or create a new one</p>
        </div>
      </div>
    );
  }

  const colorClass = NOTE_COLORS.find(c => c.value === note.color)?.class || 'bg-white';

  return (
    <div className={`flex-1 flex flex-col h-screen ${colorClass}`}>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none flex-1"
            placeholder="Note title..."
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded-lg transition-colors ${
                note.is_pinned
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={note.is_pinned ? 'Unpin' : 'Pin'}
            >
              <Pin size={18} className={note.is_pinned ? 'fill-current' : ''} />
            </button>
          </div>
        </div>

        {saveStatus !== 'idle' && (
          <div className="text-xs text-gray-500">
            {saveStatus === 'saving' ? 'Saving...' : 'Saved just now'}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-6">
        <EditorContent editor={editor} className="prose max-w-none" />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white p-4">
        {/* Tags Input */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-600"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag and press Enter..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Lock size={12} />
            <span>Only you can see this</span>
          </div>
          <div>{getWordCount()} words</div>
        </div>
      </div>
    </div>
  );
}
