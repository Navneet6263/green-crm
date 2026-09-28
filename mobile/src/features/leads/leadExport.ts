import type { Lead, Page } from '../../api/types';
import { fieldText, leadFields, type LeadField } from './leadPresentation';
export const EXPORT_LIMIT = 5000;
export const defaultExportFields = ['company_name', 'contact_person', 'phone', 'email', 'status', 'follow_up_date'];
export function csvCell(value: unknown, text = false) {
  let clean = String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  // Block spreadsheet formulas and preserve leading zeroes in phone/postal IDs.
  if (clean && (text || /^[=+@-]/.test(clean))) clean = `'${clean}`;
  return `"${clean.replaceAll('"', '""')}"`;
}
function exportValue(lead: Lead, field: LeadField) {
  if (field.kind === 'date' && lead[field.key]) {
    const date = new Date(String(lead[field.key]));
    return Number.isFinite(date.getTime()) ? date.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '';
  }
  if (field.kind === 'money') return lead[field.key] ?? '';
  return fieldText(lead, field);
}
export function leadsCsv(leads: Lead[], keys: string[]) {
  const fields = leadFields.filter(field => keys.includes(field.key));
  if (!fields.length) throw new Error('Select at least one export field.');
  if (leads.length > EXPORT_LIMIT) throw new Error(`Export up to ${EXPORT_LIMIT} leads at a time. Narrow your filters.`);
  const rows = [fields.map(field => csvCell(field.title)).join(',')];
  let characters = rows[0].length;
  for (const lead of leads) {
    const row = fields.map(field => csvCell(exportValue(lead, field), ['phone', 'address_zip', 'lead_id'].includes(field.key))).join(',');
    characters += row.length;
    if (characters > 5_000_000) throw new Error('Export is too large for this phone. Select fewer fields or narrow your filters.');
    rows.push(row);
  }
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}
export async function collectExport(load: (page: number) => Promise<Page<Lead>>, cancelled: () => boolean, progress: (count: number) => void) {
  const rows = new Map<string, Lead>();
  for (let page = 1; page <= EXPORT_LIMIT; page++) {
    if (cancelled()) throw new Error('Export cancelled.');
    const result = await load(page);
    if (cancelled()) throw new Error('Export cancelled.');
    if (result.total > EXPORT_LIMIT) throw new Error(`More than ${EXPORT_LIMIT} matching leads. Narrow your filters before exporting.`);
    for (const lead of result.items) rows.set(lead.lead_id, lead);
    if (rows.size > EXPORT_LIMIT) throw new Error('Too many leads. Narrow your filters.');
    progress(rows.size);
    if (page >= result.totalPages) return [...rows.values()];
    if (!result.items.length) throw new Error('The lead list changed during export. Refresh and try again.');
  }
  throw new Error('Export did not finish. Narrow your filters and try again.');
}
