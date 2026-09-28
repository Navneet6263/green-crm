import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Session, Task } from '../../api/types';
import { completeTask } from '../../api/sales';
import { Badge, Button, Card, Notice } from '../../ui/components';
import { Icon } from '../../ui/Icon';
import { label, when } from '../../ui/format';
import { colors, styles } from '../../ui/theme';

export function TaskCard({ task, session, onChanged }: { task: Task; session: Session; onChanged: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const done = ['done', 'completed', 'closed'].includes(task.status);
  const overdue = !done && Boolean(task.due_date && Date.parse(task.due_date) < Date.now());
  const accent = done ? '#287B52' : overdue ? '#AD4C31' : task.priority === 'high' ? '#8655A5' : '#36799D';
  const tint = done ? '#E6F4EB' : overdue ? '#FFF0E8' : task.priority === 'high' ? '#F2EAFB' : '#EAF3FB';
  const change = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await completeTask(session, task.task_id, !done); onChanged(); }
    catch (failure) { setError(`${(failure as Error).message} Refresh tasks before retrying if the connection dropped.`); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Card style={{ borderLeftWidth: 4, borderLeftColor: accent }}><View style={styles.spread}>
    <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: tint }}><Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{overdue ? 'Overdue' : label(task.status)}</Text></View>
    {task.priority ? <Text style={{ color: accent, fontSize: 12, fontWeight: '700' }}>{label(task.priority)} priority</Text> : null}</View>
    <Text style={styles.heading}>{task.title}</Text><View style={styles.row}><Icon name="clock" size={16} color={colors.muted} /><Text style={styles.small}>{task.due_date ? when(task.due_date) : 'No due date'}</Text></View>
    {task.notes ? <Text style={styles.subtitle}>{task.notes}</Text> : null}
    {error ? <Notice error message={error} /> : null}
    <Pressable accessibilityRole="button" accessibilityLabel={done ? 'Reopen task' : 'Mark as done'} accessibilityState={{ disabled: busy, busy }} disabled={busy}
      onPress={() => void change()} style={({ pressed }) => ({ minHeight: 46, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 9, flexDirection: 'row', alignItems: 'center', gap: 9, opacity: pressed || busy ? 0.65 : 1 })}>
      {busy ? <ActivityIndicator size="small" color={colors.green} /> : <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: colors.mint, justifyContent: 'center', alignItems: 'center' }}><Icon name={done ? 'refresh' : 'check'} size={16} color={colors.green} /></View>}
      <Text style={{ color: colors.green, fontWeight: '600', fontSize: 13 }}>{busy ? 'Saving…' : done ? 'Reopen task' : 'Mark as done'}</Text>
    </Pressable>
    {task.related_to === 'lead' && task.related_id ? <Button secondary title="Open linked lead" onPress={() => router.push({ pathname: '/leads/[id]', params: { id: task.related_id! } })} /> : null}
  </Card>;
}
