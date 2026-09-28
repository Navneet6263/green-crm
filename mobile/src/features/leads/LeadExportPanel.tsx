import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Lead, Session } from '../../api/types';
import { getLeads } from '../../api/crm';
import { SidePanel } from '../../ui/SidePanel';
import { Button, Notice } from '../../ui/components';
import { Chips } from '../../ui/fields';
import { colors, styles } from '../../ui/theme';
import { leadFields } from './leadPresentation';
import { collectExport, defaultExportFields, EXPORT_LIMIT, leadsCsv } from './leadExport';
import { shareExport } from './shareExport';
import type { LeadFilters } from './leadFilters';
export function LeadExportPanel({ session, filters, search, loaded, onClose }: {
  session: Session; filters: LeadFilters; search: string; loaded: Lead[]; onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(defaultExportFields), [scope, setScope] = useState('filtered');
  const [busy, setBusy] = useState(false), [progress, setProgress] = useState(0), [message, setMessage] = useState(''), [error, setError] = useState('');
  const job = useRef(0), lock = useRef(false);
  useEffect(() => () => { job.current++; }, [session.token]);
  const close = () => { job.current++; onClose(); };
  const exportNow = async () => {
    if (lock.current) return;
    lock.current = true; const run = ++job.current;
    setBusy(true); setError(''); setMessage(''); setProgress(0);
    try {
      const rows = scope === 'loaded' ? loaded : await collectExport(page => getLeads(session, search, page, '', filters, 100), () => job.current !== run, setProgress);
      if (job.current !== run) return;
      if (!rows.length) throw new Error('No matching leads to export.');
      await shareExport(leadsCsv(rows, selected));
      if (job.current === run) setMessage('Export prepared. Save or share it only with authorised people.');
    } catch (failure) { if (job.current === run) setError((failure as Error).message); }
    finally { if (job.current === run) { lock.current = false; setBusy(false); } }
  };
  return <SidePanel title="Export leads" onClose={close} footer={<>
    {error ? <Notice error message={error} /> : null}{message ? <Notice message={message} /> : null}
    <Button title={busy ? `Preparing ${progress} leads…` : `Export CSV · ${selected.length} fields`} loading={busy} disabled={!selected.length} onPress={() => void exportNow()} />
    <Button title={busy ? 'Cancel export' : 'Close'} secondary onPress={close} />
  </>}>
    <Text style={styles.small}>Export only your accessible leads. All filtered leads are fetched, not just the visible page. Maximum {EXPORT_LIMIT} records per export.</Text>
    <Chips options={[{ value: 'filtered', label: 'All filtered leads' }, { value: 'loaded', label: `Loaded (${loaded.length})` }]} value={scope} disabled={busy} onChange={setScope} />
    <View style={styles.spread}><Text style={styles.heading}>Choose columns</Text><Button title={selected.length === leadFields.length ? 'Clear all' : 'Select all'} secondary disabled={busy} onPress={() => setSelected(selected.length === leadFields.length ? [] : leadFields.map(field => field.key))} /></View>
    {leadFields.map(field => <Pressable key={field.key} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(field.key), disabled: busy }} disabled={busy}
      onPress={() => setSelected(old => old.includes(field.key) ? old.filter(key => key !== field.key) : [...old, field.key])} style={[styles.spread, { minHeight: 46, padding: 12, borderRadius: 12, backgroundColor: selected.includes(field.key) ? colors.mint : '#FFFFFF' }]}>
      <Text style={[styles.body, { flex: 1 }]}>{field.title}</Text><Text style={{ color: colors.green, fontWeight: '700' }}>{selected.includes(field.key) ? '✓' : '○'}</Text>
    </Pressable>)}
    <Text style={styles.small}>CSV opens in Excel/Sheets. Dates include year and IST. Phone/ID columns are protected as text. Empty values stay blank. The exported file contains customer data.</Text>
  </SidePanel>;
}
