export interface Note {
  id: string;
  user_id: number;
  title: string;
  content: string;
  color: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export interface NoteTag {
  tag: string;
  count: number;
}

export interface CreateNoteDto {
  title?: string;
  content?: string;
  color?: string;
  tags?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  color?: string;
  isPinned?: boolean;
  tags?: string[];
}

export const NOTE_COLORS = [
  { name: 'Default', value: null, class: 'bg-white' },
  { name: 'Red', value: 'red', class: 'bg-red-50 border-red-200' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-50 border-orange-200' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-50 border-yellow-200' },
  { name: 'Green', value: 'green', class: 'bg-green-50 border-green-200' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-50 border-blue-200' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-50 border-purple-200' },
] as const;
