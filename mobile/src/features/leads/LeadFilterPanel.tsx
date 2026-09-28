import { useState } from 'react';
import { Text, View } from 'react-native';
import type { Session } from '../../api/types';
import { getProducts, getTeams } from '../../api/crm';
import { leadStatuses } from '../../api/sales';
import { sourceOptions } from '../../api/leadFields';
import { SidePanel } from '../../ui/SidePanel';
import { Button, Notice } from '../../ui/components';
import { Chips, Field, priorityOptions } from '../../ui/fields';
import { RecordPicker } from '../../ui/RecordPicker';
import { label } from '../../ui/format';
import { styles } from '../../ui/theme';
import { emptyLeadFilters, validateFilters, type LeadFilters } from './leadFilters';

export function LeadFilterPanel({ value, session, onApply, onClose }: { value: LeadFilters; session: Session; onApply: (value: LeadFilters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(value), [error, setError] = useState('');
  const [team, setTeam] = useState<{ id: string; name: string } | null>(value.team_id ? { id: value.team_id, name: value.team_id } : null);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(value.product_id ? { id: value.product_id, name: value.product_id } : null);
  const change = (key: keyof LeadFilters, next: string) => setDraft(old => ({ ...old, [key]: next }));
  return <SidePanel title="Filter leads" onClose={onClose} footer={<>
    {error ? <Notice error message={error} /> : null}
    <Button title="Apply filters" onPress={() => { try { validateFilters(draft); onApply(draft); } catch (e) { setError((e as Error).message); } }} />
    <Button secondary title="Reset filters" onPress={() => { setDraft({ ...emptyLeadFilters }); setTeam(null); setProduct(null); setError(''); }} />
  </>}>
    <Text style={styles.small}>Filters apply to all leads you can access, not just the records already loaded.</Text>
    <View style={{ gap: 9 }}><Text style={styles.heading}>Status</Text><Chips options={[{ value: '', label: 'Any status' }, ...leadStatuses.map(value => ({ value, label: label(value) }))]} value={draft.status} onChange={value => change('status', value)} /></View>
    <View style={{ gap: 9 }}><Text style={styles.heading}>Priority</Text><Chips options={[{ value: '', label: 'Any priority' }, ...priorityOptions]} value={draft.priority} onChange={value => change('priority', value)} /></View>
    <View style={{ gap: 9 }}><Text style={styles.heading}>Pipeline</Text><Chips options={[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'working', label: 'Working' }, { value: 'pending', label: 'Pending' }]} value={draft.quick_filter} onChange={value => change('quick_filter', value)} /></View>
    <View style={{ gap: 9 }}><Text style={styles.heading}>Source</Text><Chips options={[{ value: '', label: 'Any source' }, ...sourceOptions.map(value => ({ value, label: label(value) }))]} value={draft.lead_source} onChange={value => change('lead_source', value)} /></View>
    <Field label="Custom source (exact name)" value={draft.lead_source} onChangeText={value => change('lead_source', value)} placeholder="Or choose a source above" maxLength={100} />
    <RecordPicker label="Team" value={team} load={async (search, page) => { const data = await getTeams(session, search, page); return { ...data, items: data.items.map(item => ({ id: item.team_id, name: item.name })) }; }}
      onChange={item => { setTeam(item); setProduct(null); setDraft(old => ({ ...old, team_id: item.id, product_id: '' })); }} />
    {team ? <Button secondary title="Any team" onPress={() => { setTeam(null); setProduct(null); setDraft(old => ({ ...old, team_id: '', product_id: '' })); }} /> : null}
    <RecordPicker key={draft.team_id} label="Product" value={product} load={async (search, page) => { const data = await getProducts(session, draft.team_id, search, page); return { ...data, items: data.items.map(item => ({ id: item.product_id, name: item.name })) }; }} onChange={item => { setProduct(item); change('product_id', item.id); }} />
    {product ? <Button secondary title="Any product" onPress={() => { setProduct(null); change('product_id', ''); }} /> : null}
    <Field label="Created from" value={draft.from_date} onChangeText={value => change('from_date', value)} placeholder="YYYY-MM-DD" maxLength={10} />
    <Field label="Created to" value={draft.to_date} onChangeText={value => change('to_date', value)} placeholder="YYYY-MM-DD" maxLength={10} />
    <Field label="Search notes" value={draft.notes_search} onChangeText={value => change('notes_search', value)} maxLength={120} />
  </SidePanel>;
}
