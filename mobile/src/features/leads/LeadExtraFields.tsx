import { Text } from 'react-native';
import type { LeadInput } from '../../api/sales';
import { industryOptions, sourceOptions } from '../../api/leadFields';
import { Card } from '../../ui/components';
import { Field, Chips } from '../../ui/fields';
import { label } from '../../ui/format';
import { styles } from '../../ui/theme';
export function LeadExtraFields({ form, update, busy }: { form: LeadInput; update: <K extends keyof LeadInput>(key: K, value: LeadInput[K]) => void; busy: boolean }) {
  const remaining = Number(form.estimated_value || 0) - Number(form.advance_received || 0);
  return <><Card><Text style={styles.eyebrow}>04 / SOURCE & COMMERCIAL DETAILS</Text>
    <Text style={styles.small}>Industry</Text><Chips value={form.industry || ''} disabled={busy} options={industryOptions.map(value => ({ value, label: value ? label(value) : 'Not set' }))} onChange={value => update('industry', value)} />
    <Text style={styles.small}>Lead source</Text><Chips value={form.lead_source || 'website'} disabled={busy} options={sourceOptions.map(value => ({ value, label: label(value) }))} onChange={value => update('lead_source', value)} />
    {form.lead_source === 'other' ? <Field label="Custom source *" value={form.custom_lead_source || ''} onChangeText={value => update('custom_lead_source', value)} editable={!busy} maxLength={100} /> : null}
    <Field label="Estimated value (₹)" value={form.estimated_value || ''} onChangeText={value => update('estimated_value', value)} editable={!busy} keyboardType="decimal-pad" maxLength={15} />
    <Field label="Advance received (₹)" value={form.advance_received || ''} onChangeText={value => update('advance_received', value)} editable={!busy} keyboardType="decimal-pad" maxLength={15} />
    <Field label="Remaining payment (₹)" value={Number.isFinite(remaining) ? String(remaining) : 'Invalid amount'} editable={false} hint="Calculated from estimated value minus advance. A lead value is not proof of collected payment." />
    <Field label="Number of units" value={form.number_of_units || ''} onChangeText={value => update('number_of_units', value)} editable={!busy} keyboardType="number-pad" maxLength={10} />
    <Field label="No. of employees" value={form.no_of_employees || ''} onChangeText={value => update('no_of_employees', value)} editable={!busy} maxLength={100} placeholder="For example: 100–500" />
    <Field label="Active users" value={form.active_users || ''} onChangeText={value => update('active_users', value)} editable={!busy} keyboardType="number-pad" maxLength={10} />
  </Card><Card><Text style={styles.eyebrow}>05 / ADDRESS DETAILS</Text>
    <Field label="State" value={form.address_state || ''} onChangeText={value => update('address_state', value)} editable={!busy} maxLength={100} />
    <Field label="Postal code" value={form.address_zip || ''} onChangeText={value => update('address_zip', value)} editable={!busy} maxLength={20} />
    <Field label="Country" value={form.address_country ?? 'India'} onChangeText={value => update('address_country', value)} editable={!busy} maxLength={100} />
  </Card></>;
}
