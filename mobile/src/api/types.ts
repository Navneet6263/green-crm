export type User = { user_id: string; name: string; email: string; role: string; company_id: string };
export type Profile = { user: User; company?: { company_id: string; name: string } | null };
export type Session = Profile & { token: string; offline?: boolean };
export type Page<T> = { items: T[]; total: number; page: number; totalPages: number };
export type Bucket = 'today' | 'overdue' | 'upcoming' | 'unscheduled';
export type Lead = {
  lead_id: string; company_name: string; contact_person: string;
  phone?: string; email?: string; status: string; priority?: string;
  follow_up_date?: string | null; latest_note?: string | null;
  product_name?: string; team_name?: string; requirements?: string;
  product_id?: string; team_id?: string; address_street?: string; address_city?: string;
  address_state?: string; address_zip?: string; created_at?: string;
};
export type Task = { task_id: string; title: string; status: string; due_date?: string; priority?: string; notes?: string; related_to?: string; related_id?: string; team_id?: string };
export type LeadNote = { id: number; content: string; created_at: string; created_by_name?: string };
export type Product = { product_id: string; name: string; is_active?: boolean | number };
export type Team = { team_id: string; name: string };
