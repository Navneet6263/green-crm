import { request } from './runtime';
import { readPage, unwrap, ApiError } from './client';
import type { Bucket, Lead, LeadNote, Profile, Session, Task, Team, Product } from './types';
import { filterParams, type LeadFilters } from '../features/leads/leadFilters';

export async function login(email: string, password: string) {
  const result = unwrap<Profile & { token: string }>(await request('/auth/login', '', { email: email.trim().toLowerCase(), password }));
  if (!result?.token || !result.user?.user_id) throw new ApiError('Login response is incomplete.');
  return result;
}
export async function profile(token: string) {
  const result = unwrap<Profile>(await request('/auth/me', token));
  if (!result?.user?.user_id) throw new ApiError('Profile response is incomplete.');
  return result;
}
export async function getLeads(session: Session, search: string, page: number, status = '', filters: Partial<LeadFilters> = {}, pageSize = 20) {
  // /my-leads means "created by me" on this backend. Use /leads to retain
  // server-enforced assigned/shared visibility for the signed-in sales user.
  const query = filterParams(filters);
  query.set('search', search); query.set('status', status || filters.status || '');
  query.set('page', String(page)); query.set('page_size', String(Math.min(100, Math.max(1, pageSize))));
  query.set('include_workflow_summary', '0');
  return readPage<Lead>(await request(`/leads?${query}`, session.token), page);
}
export async function getFollowUps(session: Session, bucket: Bucket, page: number, pageSize = 10) {
  return readPage<Lead>(await request(`/leads/my-day?bucket=${bucket}&page=${page}&page_size=${pageSize}`, session.token), page);
}
export async function getTasks(session: Session, bucket: Bucket | 'all', page: number, completed = false) {
  const query = new URLSearchParams({ mine: '1', page: String(page), page_size: '10' });
  if (completed) query.set('status', 'done'); else query.set('open_only', '1');
  if (bucket !== 'all') query.set('due_bucket', bucket);
  return readPage<Task>(await request(`/tasks?${query}`, session.token), page);
}
export async function getLead(session: Session, id: string) {
  const lead = unwrap<Lead>(await request(`/leads/${encodeURIComponent(id)}?view=core`, session.token));
  if (!lead?.lead_id) throw new ApiError('The server returned incomplete lead details.');
  return lead;
}
export async function addNote(session: Session, id: string, content: string) {
  if (!content.trim()) throw new ApiError('Write a note before saving.');
  if (content.trim().length > 4000) throw new ApiError('Keep the note within 4,000 characters.');
  return request(`/leads/${encodeURIComponent(id)}/notes`, session.token, { content: content.trim() });
}
export async function getNotes(session: Session, id: string, page: number) {
  return readPage<LeadNote>(await request(`/leads/${encodeURIComponent(id)}/notes?page=${page}&page_size=10`, session.token), page);
}
export async function getTeams(session: Session, search: string, page: number) {
  return readPage<Team>(await request(`/teams?${new URLSearchParams({ search, page: String(page), page_size: '20' })}`, session.token), page);
}
export async function getProducts(session: Session, teamId: string, search: string, page: number) {
  const query = new URLSearchParams({ search, page: String(page), page_size: '20' });
  if (teamId) query.set('team_id', teamId);
  return readPage<Product>(await request(`/products?${query}`, session.token), page);
}
