'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import { Note } from '@/types/note';
import EditorToolbar from '@/components/notes/EditorToolbar';
import { Lock, Pin, X } from 'lucide-react';

interface EditorPanelProps {
  note: Note;
  onUpdate: (noteId: string, data: Partial<Note>) => void;
  onClose: () => void;
}

export default function EditorPanel({ note, onUpdate, onClose }: EditorPanelProps) {
  const [title, setTitle] = useState(note.title);
  const [tags, setTags] = useState<string[]>(note.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((content: string, currentTags: string[]) => {
    onUpdate(note.id, { content, tags: currentTags });
    setSavedAt(new Date());
  }, [note.id, onUpdate]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: (() => { try { return JSON.parse(note.content); } catch { return note.content; } })(),
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);

      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        save(JSON.stringify(editor.getJSON()), tags);
      }, 2000);
    },
  });

  useEffect(() => {
    setTitle(note.title);
    setTags(note.tags ?? []);
    if (editor && note.content) {
      try {
        editor.commands.setContent(JSON.parse(note.content));
      } catch {
        editor.commands.setContent(note.content);
      }
    }
  }, [note.id]);

  useEffect(() => () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); }, []);

  const handleTitleBlur = () => {
    if (title !== note.title) onUpdate(note.id, { title });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        const newTags = [...tags, newTag];
        setTags(newTags);
        if (editor) save(JSON.stringify(editor.getJSON()), newTags);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    if (editor) save(JSON.stringify(editor.getJSON()), newTags);
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
        <input
          className="flex-1 text-xl font-semibold text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Untitled Note"
        />
        <button
          onClick={() => onUpdate(note.id, { is_pinned: !note.is_pinned })}
          className={`p-1.5 rounded-lg transition-colors ${note.is_pinned ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-blue-500 hover:bg-gray-50'}`}
          title={note.is_pinned ? 'Unpin' : 'Pin'}
        >
          <Pin size={16} className={note.is_pinned ? 'fill-current' : ''} />
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Editor */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none min-h-full focus:outline-none text-gray-800 leading-relaxed
            [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px]
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-300
            [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none
            [&_.ProseMirror_ul[data-type=taskList]]:list-none [&_.ProseMirror_ul[data-type=taskList]]:pl-0"
        />
      </div>

      {/* Tags */}
      <div className="px-5 py-2 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          placeholder="Add tag..."
          className="text-xs outline-none bg-transparent text-gray-500 placeholder:text-gray-300 min-w-[70px]"
        />
      </div>

      {/* Status bar */}
      <div className="px-5 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Lock size={11} /> Only you
        </span>
        <span>
          {savedAt ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not saved yet'}
        </span>
        <span className="ml-auto">{wordCount} words</span>
      </div>
    </div>
  );
}
