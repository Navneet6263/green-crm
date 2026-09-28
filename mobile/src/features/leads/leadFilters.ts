export type LeadFilters = { status: string; priority: string; lead_source: string; team_id: string; product_id: string;
  from_date: string; to_date: string; notes_search: string; quick_filter: string };
export const emptyLeadFilters: LeadFilters = { status: '', priority: '', lead_source: '', team_id: '', product_id: '', from_date: '', to_date: '', notes_search: '', quick_filter: '' };
export function filterParams(filters: Partial<LeadFilters>) {
  const params = new URLSearchParams();
  for (const key of Object.keys(emptyLeadFilters) as (keyof LeadFilters)[]) {
    const value = filters[key]?.trim(); if (value) params.set(key, value);
  }
  return params;
}
export function validateFilters(filters: LeadFilters) {
  for (const value of [filters.from_date, filters.to_date]) {
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('Enter a valid date as YYYY-MM-DD.');
  }
  if (filters.from_date && filters.to_date && filters.from_date > filters.to_date) throw new Error('From date must not be after To date.');
}
