import { ApiError } from './client';
export type ExtendedLeadInput = {
  industry?: string; lead_source?: string; custom_lead_source?: string; estimated_value?: string;
  number_of_units?: string; no_of_employees?: string; active_users?: string; advance_received?: string;
  address_state?: string; address_zip?: string; address_country?: string;
};
export const industryOptions = ['', 'technology', 'healthcare', 'finance', 'education', 'manufacturing', 'retail', 'real-estate', 'staffing', 'services', 'other'];
export const sourceOptions = ['website', 'google', 'facebook', 'instagram', 'linkedin', 'referral', 'cold-call', 'email-campaign', 'partner', 'trade-show', 'walk-in', 'other'];
function number(value: string | undefined, title: string, integer = false): number | null {
  if (!value?.trim()) return integer ? null : 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > (integer ? 2147483647 : 999999999999) || (integer && !Number.isInteger(parsed))) throw new ApiError(`${title} must be a valid non-negative ${integer ? 'whole number' : 'amount'}.`);
  return parsed;
}
export function extendedLeadPayload(input: ExtendedLeadInput) {
  const estimated_value = number(input.estimated_value, 'Estimated value')!;
  const advance_received = number(input.advance_received, 'Advance received')!;
  if (advance_received > estimated_value) throw new ApiError('Advance received cannot exceed estimated value.');
  const source = input.lead_source || 'website';
  if (!sourceOptions.includes(source)) throw new ApiError('Choose a valid lead source.');
  if (source === 'other' && !input.custom_lead_source?.trim()) throw new ApiError('Enter the custom lead source.');
  if (input.industry && !industryOptions.includes(input.industry)) throw new ApiError('Choose a valid industry.');
  return { industry: input.industry || '', lead_source: source === 'other' ? input.custom_lead_source!.trim() : source,
    estimated_value, advance_received, number_of_units: number(input.number_of_units, 'Number of units', true),
    active_users: number(input.active_users, 'Active users', true), no_of_employees: input.no_of_employees?.trim() || '',
    address_state: input.address_state?.trim() || '', address_zip: input.address_zip?.trim() || '', address_country: input.address_country?.trim() || 'India' };
}
