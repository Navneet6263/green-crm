import { apiClient } from './client.js';

export const notesApi = {
  /**
   * Get all notes with filters
   * @param {Object} params - Filter parameters
   * @param {string} params.search - Search query
   * @param {string} params.tag - Filter by tag
   * @param {boolean} params.pinned - Filter by pinned status
   * @param {boolean} params.archived - Filter by archived status
   */
  async list(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.tag) queryParams.append('tag', params.tag);
    if (params.pinned !== undefined) queryParams.append('pinned', String(params.pinned));
    if (params.archived !== undefined) queryParams.append('archived', String(params.archived));

    const query = queryParams.toString();
    const url = `/notes${query ? `?${query}` : ''}`;
    
    return apiClient.get(url);
  },

  /**
   * Get single note by ID
   */
  async getById(id) {
    return apiClient.get(`/notes/${id}`);
  },

  /**
   * Create new note
   */
  async create(data) {
    return apiClient.post('/notes', data);
  },

  /**
   * Update note
   */
  async update(id, data) {
    return apiClient.put(`/notes/${id}`, data);
  },

  /**
   * Delete note (soft delete)
   */
  async delete(id) {
    await apiClient.delete(`/notes/${id}`);
  },

  /**
   * Toggle pin status
   */
  async togglePin(id) {
    return apiClient.post(`/notes/${id}/pin`);
  },

  /**
   * Get all user tags
   */
  async getTags() {
    return apiClient.get('/notes/tags/all');
  },
};
