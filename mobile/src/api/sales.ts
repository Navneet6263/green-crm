import { ApiError, unwrap } from './client';
import { request } from './runtime';
import type { Lead, Session, Task } from './types';
import { extendedLeadPayload, type ExtendedLeadInput } from './leadFields';

export const leadStatuses = ['new', 'pending', 'contacted', 'qualified', 'proposal', 'negotiation', 'on-hold', 'booked-demo', 'demo-done', 'trial-started', 'closed-won', 'onboarded', 'closed-lost'];
export type LeadInput = ExtendedLeadInput & {
  company_name: string; contact_person: string; phone: string; email: string;
  product_id: string; team_id: string; address_street: string; address_city: string;
  requirements: string; priority: string; follow_up_date: string | null;
};
export function leadPayload(input: LeadInput) {
  const company_name = input.company_name.trim(), contact_person = input.contact_person.trim();
  const phone = input.phone.trim(), email = input.email.trim().toLowerCase();
  if (!company_name || !contact_person) throw new ApiError('Enter the business name and contact person.');
  if (!phone && !email) throw new ApiError('Add a phone number or email address.');
  if (phone && !/^\+?\d{6,15}$/.test(phone.replace(/[\s()-]/g, ''))) throw new ApiError('Enter a valid phone number.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Enter a valid email address.');
  if (!input.product_id) throw new ApiError('Choose a product for this lead.');
  if (!['low', 'medium', 'high'].includes(input.priority)) throw new ApiError('Choose a valid priority.');
  validateFollowUp(input.follow_up_date);
  return { company_name, contact_person, phone, email, product_id: input.product_id,
    ...(input.team_id ? { team_id: input.team_id } : {}), address_street: input.address_street.trim(),
    address_city: input.address_city.trim(), requirements: input.requirements.trim(),
    priority: input.priority, follow_up_date: input.follow_up_date, status: 'new', ...extendedLeadPayload(input) };
}
function validateFollowUp(value: string | null) {
  if (value !== null && (!value || !Number.isFinite(new Date(value).getTime()))) throw new ApiError('Choose a valid follow-up date.');
}
export async function createLead(session: Session, input: LeadInput) {
  const lead = unwrap<Lead>(await request('/leads', session.token, leadPayload(input)));
  if (!lead?.lead_id) throw new ApiError('The save response is incomplete. Check My Leads before retrying.');
  return lead;
}
export async function updateFollowUp(session: Session, id: string, changes: { status: string; priority: string; follow_up_date: string | null }) {
  if (!leadStatuses.includes(changes.status)) throw new ApiError('Choose a valid lead status.');
  if (!['low', 'medium', 'high'].includes(changes.priority)) throw new ApiError('Choose a valid priority.');
  validateFollowUp(changes.follow_up_date);
  // Whitelist only sales fields. Never send owner, company, access or finance fields.
  return request(`/leads/${encodeURIComponent(id)}`, session.token, {
    status: changes.status, priority: changes.priority, follow_up_date: changes.follow_up_date,
  }, 'PATCH');
}
export async function completeTask(session: Session, id: string, done: boolean) {
  return request(`/tasks/${encodeURIComponent(id)}`, session.token, { status: done ? 'done' : 'pending' }, 'PATCH');
}
export async function createTask(session: Session, input: { title: string; due_date: string; priority: string; notes: string; team_id: string }) {
  if (!input.title.trim()) throw new ApiError('Enter a task title.');
  if (!input.due_date || !Number.isFinite(new Date(input.due_date).getTime())) throw new ApiError('Choose a due date.');
  if (!['low', 'medium', 'high'].includes(input.priority)) throw new ApiError('Choose a valid priority.');
  const task = unwrap<Task>(await request('/tasks', session.token, { title: input.title.trim(), due_date: input.due_date,
    priority: input.priority, notes: input.notes.trim(), ...(input.team_id ? { team_id: input.team_id } : {}), type: 'call' }));
  if (!task?.task_id) throw new ApiError('The save response is incomplete. Check My Tasks before retrying.');
  return task;
}
