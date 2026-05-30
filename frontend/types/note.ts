export interface Note {
  id: string;
  title: string;
  content: string;
  color: string | null;
  is_pinned: boolean;
  tags: string[];
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteTag {
  tag: string;
  count: number;
}

export const NOTE_COLORS = [
  { value: null, name: 'Default', class: 'bg-white' },
  { value: 'red', name: 'Red', class: 'bg-red-50' },
  { value: 'orange', name: 'Orange', class: 'bg-orange-50' },
  { value: 'yellow', name: 'Yellow', class: 'bg-yellow-50' },
  { value: 'green', name: 'Green', class: 'bg-green-50' },
  { value: 'teal', name: 'Teal', class: 'bg-teal-50' },
  { value: 'blue', name: 'Blue', class: 'bg-blue-50' },
  { value: 'purple', name: 'Purple', class: 'bg-purple-50' },
  { value: 'pink', name: 'Pink', class: 'bg-pink-50' },
];
