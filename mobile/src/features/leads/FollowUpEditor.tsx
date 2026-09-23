import { useRef, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../../auth/SessionProvider';
import type { Lead } from '../../api/types';
import { leadStatuses, updateFollowUp } from '../../api/sales';
import { Button, Notice } from '../../ui/components';
import { Chips, priorityOptions } from '../../ui/fields';
import { DateTimeField } from '../../ui/DateTimeField';
import { label } from '../../ui/format';
import { styles } from '../../ui/theme';

export function FollowUpEditor({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [status, setStatus] = useState(lead.status), [priority, setPriority] = useState(lead.priority || 'medium');
  const [date, setDate] = useState<string | null>(lead.follow_up_date || null);
  const lock = useRef(false);
  const show = () => { setStatus(lead.status); setPriority(lead.priority || 'medium'); setDate(lead.follow_up_date || null); setError(''); setOpen(true); };
  const save = async () => {
    if (!session || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await updateFollowUp(session, lead.lead_id, { status, priority, follow_up_date: date }); setOpen(false); onSaved(); }
    catch (failure) { setError(`${(failure as Error).message} Refresh the lead to check its saved state if the connection dropped.`); }
    finally { lock.current = false; setBusy(false); }
  };
  return <><Button title="Update status & follow-up" icon="calendar" onPress={show} />
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!busy) setOpen(false); }}>
      <SafeAreaView style={styles.screen}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 22, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <View style={{ gap: 6 }}><Text style={styles.eyebrow}>LEAD UPDATE</Text><Text style={styles.title}>Plan the next step</Text><Text style={styles.subtitle}>{lead.company_name}</Text></View>
        <View style={{ gap: 10 }}><Text style={styles.heading}>Status</Text><Chips disabled={busy} options={leadStatuses.map(value => ({ value, label: label(value) }))} value={status} onChange={setStatus} /></View>
        <View style={{ gap: 10 }}><Text style={styles.heading}>Priority</Text><Chips disabled={busy} options={priorityOptions} value={priority} onChange={setPriority} /></View>
        <DateTimeField value={date} onChange={setDate} disabled={busy} />
        <Text style={styles.small}>This updates the real CRM lead. Closed leads do not appear in open follow-up queues.</Text>
        {error ? <Notice error message={error} /> : null}
        <Button title="Save changes to CRM" loading={busy} onPress={() => void save()} />
        <Button secondary title="Cancel changes" disabled={busy} onPress={() => setOpen(false)} />
      </ScrollView></SafeAreaView>
    </Modal></>;
}
