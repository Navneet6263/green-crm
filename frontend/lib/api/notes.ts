import { apiClient } from './client';
import type { Note, NoteTag, CreateNoteDto, UpdateNoteDto } from '@/types/note';

interface NotesListParams {
  search?: string;
  tag?: string;
  pinned?: boolean;
  archived?: boolean;
}

export const notesApi = {
  /**
   * Get all notes with filters
   */
  async list(params?: NotesListParams): Promise<Note[]> {
    const queryParams = new URLSearchParams();
    
    if (params?.search) queryParams.append('search', params.search);
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.pinned !== undefined) queryParams.append('pinned', String(params.pinned));
    if (params?.archived !== undefined) queryParams.append('archived', String(params.archived));

    const query = queryParams.toString();
    const url = `/notes${query ? `?${query}` : ''}`;
    
    return apiClient.get<Note[]>(url);
  },

  /**
   * Get single note by ID
   */
  async getById(id: string): Promise<Note> {
    return apiClient.get<Note>(`/notes/${id}`);
  },

  /**
   * Create new note
   */
  async create(data: CreateNoteDto): Promise<Note> {
    return apiClient.post<Note>('/notes', data);
  },

  /**
   * Update note
   */
  async update(id: string, data: UpdateNoteDto): Promise<Note> {
    return apiClient.put<Note>(`/notes/${id}`, data);
  },

  /**
   * Delete note (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/notes/${id}`);
  },

  /**
   * Toggle pin status
   */
  async togglePin(id: string): Promise<Note> {
    return apiClient.post<Note>(`/notes/${id}/pin`);
  },

  /**
   * Get all user tags
   */
  async getTags(): Promise<NoteTag[]> {
    return apiClient.get<NoteTag[]>('/notes/tags/all');
  },
};
