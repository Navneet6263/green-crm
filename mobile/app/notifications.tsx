import { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../src/auth/SessionProvider';
import { getNotifications, markNotificationRead } from '../src/api/notifications';
import { useResource } from '../src/hooks/useResource';
import { Badge, Button, Card, Empty, IconButton, Notice, Pagination, Screen } from '../src/ui/components';
import { colors, styles } from '../src/ui/theme';
import { when } from '../src/ui/format';

export default function Notifications() {
  const { session } = useSession();
  const [page, setPage] = useState(1), [busyId, setBusyId] = useState(''), [error, setError] = useState('');
  const lock = useRef(false);
  const result = useResource(`notifications:${session?.user.user_id}:${page}`, () => getNotifications(session!, page));
  const markRead = async (id: string) => {
    if (lock.current || !session) return;
    lock.current = true; setBusyId(id); setError('');
    try { await markNotificationRead(session, id); result.reload(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update this notification.'); }
    finally { lock.current = false; setBusyId(''); }
  };
  return <Screen title="Notifications" subtitle="Updates for your account." onRefresh={result.reload} refreshing={result.loading}
    action={<IconButton name="back" label="Back to Today" onPress={() => router.replace('/')} />}>
    {error ? <Notice error message={error} /> : null}
    {result.loading ? <ActivityIndicator color={colors.green} /> : result.error ? <><Notice error message={result.error} /><Button title="Retry notifications" onPress={result.reload} /></>
      : result.data?.items.length ? result.data.items.map(item => <Card key={item.notif_id}>
        <View style={styles.spread}><Text style={[styles.heading, { flex: 1 }]}>{item.title}</Text>{!item.is_read ? <Badge>New</Badge> : null}</View>
        {item.message ? <Text style={styles.body}>{item.message}</Text> : null}
        <Text style={styles.small}>{when(item.created_at)}</Text>
        {item.lead_id ? <Button title="Open related lead" secondary onPress={() => router.push({ pathname: '/leads/[id]', params: { id: item.lead_id! } })} /> : null}
        {!item.is_read ? <Button title="Mark as read" secondary loading={busyId === item.notif_id} disabled={Boolean(busyId)} onPress={() => void markRead(item.notif_id)} /> : null}
      </Card>) : <Empty title="You're all caught up" detail="Your CRM notifications will appear here." />}
    {result.data ? <Pagination page={page} totalPages={result.data.totalPages} onChange={setPage} /> : null}
  </Screen>;
}
