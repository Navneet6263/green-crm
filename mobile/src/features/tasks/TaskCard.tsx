import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
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
  const change = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await completeTask(session, task.task_id, !done); onChanged(); }
    catch (failure) { setError(`${(failure as Error).message} Refresh tasks before retrying if the connection dropped.`); }
    finally { lock.current = false; setBusy(false); }
  };
  return <Card><View style={styles.spread}><Badge warm={!done}>{label(task.status)}</Badge>{task.priority === 'high' ? <Text style={{ color: colors.orange, fontSize: 12, fontWeight: '700' }}>High priority</Text> : null}</View>
    <Text style={styles.heading}>{task.title}</Text><View style={styles.row}><Icon name="clock" size={16} color={colors.muted} /><Text style={styles.small}>{task.due_date ? when(task.due_date) : 'No due date'}</Text></View>
    {task.notes ? <Text style={styles.subtitle}>{task.notes}</Text> : null}
    {error ? <Notice error message={error} /> : null}
    <Button secondary={done} icon={done ? 'refresh' : 'check'} title={done ? 'Reopen task' : 'Mark as done'} loading={busy} onPress={() => void change()} />
    {task.related_to === 'lead' && task.related_id ? <Button secondary title="Open linked lead" onPress={() => router.push({ pathname: '/leads/[id]', params: { id: task.related_id! } })} /> : null}
  </Card>;
}
