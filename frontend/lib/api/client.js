import { apiRequest } from '../api';

function getToken() {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.match(/authToken=([^;]+)/)?.[1];
}

export const apiClient = {
  async get(path) {
    return apiRequest(path, { token: getToken() });
  },
  async post(path, body) {
    return apiRequest(path, { method: 'POST', body, token: getToken() });
  },
  async put(path, body) {
    return apiRequest(path, { method: 'PUT', body, token: getToken() });
  },
  async delete(path) {
    return apiRequest(path, { method: 'DELETE', token: getToken() });
  },
};
