import { apiClient } from './client.js';

export const recentActivityApi = {
  /**
   * Get recent notes across leads and customers
   * @param {Object} params - Query parameters
   * @param {number} params.limit - Number of notes to fetch
   * @param {string} params.type - Filter type: 'all' | 'leads' | 'customers'
   * @param {boolean} params.myNotesOnly - Show only current user's notes
   */
  async getRecentNotes(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.type) queryParams.append('type', params.type);
    if (params.myNotesOnly) queryParams.append('myNotesOnly', 'true');
    if (params.users && params.users.length > 0) queryParams.append('users', params.users.join(','));
    if (params.products && params.products.length > 0) queryParams.append('products', params.products.join(','));
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.search) queryParams.append('search', params.search);
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await apiClient.get(
      `/recent-activity/notes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response;
  },

  /**
   * Get activity statistics
   * @param {number} days - Number of days to look back (default: 7)
   */
  async getActivityStats(days = 7) {
    const response = await apiClient.get(`/recent-activity/stats?days=${days}`);
    return response;
  },
};
