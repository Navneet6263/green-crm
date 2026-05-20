'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Note } from '@/types/note';
import EditorPanel from '@/components/notes/EditorPanel';
import { ArrowLeft } from 'lucide-react';

export default function NoteViewPage() {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    
    const fetchNote = async () => {
      try {
        const response = await fetch(`/api/notes/${params.id}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setNote(data.data);
        } else {
          console.error('Failed to fetch note');
        }
      } catch (error) {
        console.error('Error fetching note:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [params?.id]);

  const handleUpdate = async (noteId: string, data: Partial<Note>) => {
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.is_pinned !== undefined) updateData.isPinned = data.is_pinned;
      if (data.tags !== undefined) updateData.tags = data.tags;

      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        setNote(result.data);
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const handleClose = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading note...</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Note not found</p>
          <button
            onClick={handleClose}
            className="text-blue-500 hover:text-blue-600"
          >
            Close window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Close"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Note Editor</h1>
      </div>
      
      <EditorPanel note={note} onUpdate={handleUpdate} onClose={handleClose} />
    </div>
  );
}
