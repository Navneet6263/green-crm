'use client';

import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, List, ListOrdered,
  CheckSquare, Quote, Code, Undo, Redo, Highlighter,
} from 'lucide-react';

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  const btn = (
    onClick,
    icon,
    title,
    isActive = false,
  ) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors text-sm ${
        isActive
          ? 'bg-blue-100 text-blue-600'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >
      {icon}
    </button>
  );

  const sep = () => (
    <div className="w-px h-5 bg-gray-200 mx-0.5 self-center" />
  );

  return (
    <div className="flex items-center flex-wrap gap-0.5 px-4 py-2 border-b border-gray-100 bg-gray-50/60">
      {btn(() => editor.chain().focus().toggleBold().run(), <Bold size={15} />, 'Bold', editor.isActive('bold'))}
      {btn(() => editor.chain().focus().toggleItalic().run(), <Italic size={15} />, 'Italic', editor.isActive('italic'))}
      {btn(() => editor.chain().focus().toggleUnderline().run(), <Underline size={15} />, 'Underline', editor.isActive('underline'))}
      {btn(() => editor.chain().focus().toggleStrike().run(), <Strikethrough size={15} />, 'Strikethrough', editor.isActive('strike'))}
      {btn(() => editor.chain().focus().toggleHighlight().run(), <Highlighter size={15} />, 'Highlight', editor.isActive('highlight'))}

      {sep()}

      {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 size={15} />, 'Heading 1', editor.isActive('heading', { level: 1 }))}
      {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={15} />, 'Heading 2', editor.isActive('heading', { level: 2 }))}

      {sep()}

      {btn(() => editor.chain().focus().toggleBulletList().run(), <List size={15} />, 'Bullet list', editor.isActive('bulletList'))}
      {btn(() => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={15} />, 'Numbered list', editor.isActive('orderedList'))}
      {btn(() => editor.chain().focus().toggleTaskList().run(), <CheckSquare size={15} />, 'Checklist', editor.isActive('taskList'))}

      {sep()}

      {btn(() => editor.chain().focus().toggleBlockquote().run(), <Quote size={15} />, 'Quote', editor.isActive('blockquote'))}
      {btn(() => editor.chain().focus().toggleCode().run(), <Code size={15} />, 'Code', editor.isActive('code'))}

      {sep()}

      {btn(() => editor.chain().focus().undo().run(), <Undo size={15} />, 'Undo')}
      {btn(() => editor.chain().focus().redo().run(), <Redo size={15} />, 'Redo')}
    </div>
  );
}
