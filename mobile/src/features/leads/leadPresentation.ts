import type { Lead } from '../../api/types';
import { label, when } from '../../ui/format';
export const hasValue = (value: unknown) => value !== null && value !== undefined && (typeof value !== 'string' || value.trim().length > 0);
export type LeadField = { key: keyof Lead; title: string; section: string; kind?: 'date' | 'label' | 'money' };
export const leadFields: LeadField[] = [
  { key: 'lead_id', title: 'Lead ID', section: 'Record' },
  { key: 'company_name', title: 'Business', section: 'Contact' }, { key: 'contact_person', title: 'Contact person', section: 'Contact' },
  { key: 'phone', title: 'Phone', section: 'Contact' }, { key: 'email', title: 'Email', section: 'Contact' },
  { key: 'status', title: 'Status', section: 'Opportunity', kind: 'label' }, { key: 'priority', title: 'Priority', section: 'Opportunity', kind: 'label' },
  { key: 'product_name', title: 'Product', section: 'Opportunity' }, { key: 'team_name', title: 'Team', section: 'Opportunity' },
  { key: 'industry', title: 'Industry', section: 'Opportunity', kind: 'label' }, { key: 'lead_source', title: 'Source', section: 'Opportunity', kind: 'label' },
  { key: 'follow_up_date', title: 'Follow-up (IST)', section: 'Opportunity', kind: 'date' },
  { key: 'estimated_value', title: 'Estimated value (INR)', section: 'Commercial', kind: 'money' },
  { key: 'advance_received', title: 'Advance received (INR)', section: 'Commercial', kind: 'money' },
  { key: 'remaining_payment', title: 'Remaining payment (INR)', section: 'Commercial', kind: 'money' },
  { key: 'number_of_units', title: 'Units', section: 'Commercial' }, { key: 'no_of_employees', title: 'Employees', section: 'Commercial' },
  { key: 'active_users', title: 'Active users', section: 'Commercial' },
  { key: 'address_street', title: 'Street', section: 'Address' }, { key: 'address_city', title: 'City', section: 'Address' },
  { key: 'address_state', title: 'State', section: 'Address' }, { key: 'address_zip', title: 'Postal code', section: 'Address' },
  { key: 'address_country', title: 'Country', section: 'Address' },
  { key: 'requirements', title: 'Requirements', section: 'Context' }, { key: 'latest_note', title: 'Latest note', section: 'Context' },
  { key: 'assigned_to_name', title: 'Assigned to', section: 'Record' }, { key: 'created_by_name', title: 'Created by', section: 'Record' },
  { key: 'created_at', title: 'Created (IST)', section: 'Record', kind: 'date' }, { key: 'onboarded_date', title: 'Onboarded (IST)', section: 'Record', kind: 'date' },
];
export function fieldText(lead: Lead, field: LeadField) {
  const value = lead[field.key];
  if (!hasValue(value)) return '';
  if (field.kind === 'date') return when(String(value));
  if (field.kind === 'label') return label(String(value));
  if (field.kind === 'money') return Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : String(value);
  return String(value).trim();
}
