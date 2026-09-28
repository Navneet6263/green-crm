import { request } from './runtime';
import { readPage } from './client';
import type { Session } from './types';

export type SalesNotification = { notif_id: string; title: string; message?: string; created_at?: string;
  is_read: boolean | number; lead_id?: string | null };
export async function getNotifications(session: Session, page = 1, pageSize = 15) {
  const response = await request<{ meta?: { unread_count?: number } }>(`/notifications?mine=1&page=${page}&page_size=${pageSize}`, session.token);
  const unread = Number(response.meta?.unread_count);
  return { ...readPage<SalesNotification>(response, page), unread: Number.isFinite(unread) && unread >= 0 ? unread : null };
}
export function markNotificationRead(session: Session, id: string) {
  return request(`/notifications/${encodeURIComponent(id)}/read`, session.token, {}, 'PATCH');
}
