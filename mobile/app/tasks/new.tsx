import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { getTeams } from '../../src/api/crm';
import { createTask } from '../../src/api/sales';
import { useUnsavedChanges } from '../../src/hooks/useUnsavedChanges';
import { Button, Card, IconButton, Notice, Screen } from '../../src/ui/components';
import { Chips, Field, priorityOptions } from '../../src/ui/fields';
import { DateTimeField } from '../../src/ui/DateTimeField';
import { RecordPicker } from '../../src/ui/RecordPicker';
import { Icon } from '../../src/ui/Icon';
import { colors, styles } from '../../src/ui/theme';

export default function NewTask() {
  const { session } = useSession();
  const [title, setTitle] = useState(''), [notes, setNotes] = useState(''), [priority, setPriority] = useState('medium');
  const [date, setDate] = useState<string | null>(null), [team, setTeam] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false), [saved, setSaved] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  useUnsavedChanges(!saved && Boolean(title || notes || date || team || priority !== 'medium'), busy);
  const save = async () => {
    if (!session || lock.current) return;
    if (!team) { setError('Choose a team for this task.'); return; }
    lock.current = true; setBusy(true); setError('');
    try { await createTask(session, { title, notes, priority, due_date: date || '', team_id: team.id }); setSaved(true); }
    catch (failure) { setError(`${(failure as Error).message} If the save timed out, check My Tasks before trying again.`); }
    finally { lock.current = false; setBusy(false); }
  };
  if (saved) return <Screen title="Task created" subtitle="Saved to your personal CRM task list."><Card><Icon name="check" color={colors.green} size={36} /><Text style={styles.heading}>{title}</Text></Card><Button title="Go to My Tasks" onPress={() => router.replace('/tasks')} /></Screen>;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Screen title="New task" subtitle="Give your next action a time and a place." action={<IconButton name="back" label="Back to tasks" onPress={() => router.canGoBack() ? router.back() : router.replace('/tasks')} />}>
      <Card><Field label="Task title *" value={title} onChangeText={setTitle} editable={!busy} maxLength={200} placeholder="Call the contact about their requirements" />
        <RecordPicker label="Team" value={team} onChange={setTeam} disabled={busy} load={async (search, page) => { const result = await getTeams(session!, search, page); return { ...result, items: result.items.map(item => ({ id: item.team_id, name: item.name })) }; }} />
        <DateTimeField label="Due date" value={date} onChange={setDate} disabled={busy} required />
        <Text style={styles.small}>Priority</Text><Chips options={priorityOptions} value={priority} onChange={setPriority} disabled={busy} />
        <Field label="Notes" value={notes} onChangeText={setNotes} editable={!busy} multiline maxLength={4000} placeholder="Anything you need to remember" />
      </Card>
      <Text style={styles.small}>This call task is assigned to you. No other employee's workload is changed.</Text>
      {error ? <Notice error message={error} /> : null}
      <Button title="Create task in CRM" icon="plus" loading={busy} onPress={() => void save()} />
    </Screen>
  </KeyboardAvoidingView>;
}
