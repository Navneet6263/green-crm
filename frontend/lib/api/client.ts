import { apiRequest } from '@/lib/api';

function getToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.match(/authToken=([^;]+)/)?.[1];
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    return apiRequest(path, { token: getToken() }) as Promise<T>;
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    return apiRequest(path, { method: 'POST', body, token: getToken() }) as Promise<T>;
  },
  async put<T>(path: string, body?: unknown): Promise<T> {
    return apiRequest(path, { method: 'PUT', body, token: getToken() }) as Promise<T>;
  },
  async delete<T>(path: string): Promise<T> {
    return apiRequest(path, { method: 'DELETE', token: getToken() }) as Promise<T>;
  },
};
