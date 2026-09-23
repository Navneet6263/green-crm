import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { getFollowUps, getTasks } from '../../src/api/crm';
import type { Bucket } from '../../src/api/types';
import { useResource } from '../../src/hooks/useResource';
import { LeadCard } from '../../src/features/leads/LeadCard';
import { Button, Card, Empty, IconButton, Notice, Pagination, Screen } from '../../src/ui/components';
import { Chips } from '../../src/ui/fields';
import { Icon } from '../../src/ui/Icon';
import { when } from '../../src/ui/format';
import { colors, styles } from '../../src/ui/theme';

const buckets = [{ value: 'today', label: 'Today' }, { value: 'overdue', label: 'Overdue' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'unscheduled', label: 'No date' }];
export default function Today() {
  const { session } = useSession();
  const [bucket, setBucket] = useState<Bucket>('today'), [page, setPage] = useState(1);
  const queue = useResource(`queue:${session?.user.user_id}:${bucket}:${page}`, () => getFollowUps(session!, bucket, page));
  const overdue = useResource(`overdue-count:${session?.user.user_id}`, () => getFollowUps(session!, 'overdue', 1, 1));
  const tasks = useResource(`open-tasks:${session?.user.user_id}`, () => getTasks(session!, 'all', 1));
  if (!session) return null;
  const refresh = () => { queue.reload(); overdue.reload(); tasks.reload(); };
  const firstLead = queue.data?.items[0];
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  return <Screen title={`Hi, ${session.user.name.split(' ')[0] || 'there'}.`} subtitle={date}
    action={<IconButton name="plus" label="Create a lead" onPress={() => router.push('/leads/new')} />} onRefresh={refresh} refreshing={queue.loading}>
    <LinearGradient colors={['#123F31', '#226B4F']} style={{ borderRadius: 25, padding: 23, gap: 16, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', right: -42, bottom: -85, width: 230, height: 230, borderRadius: 115, borderWidth: 32, borderColor: '#FFFFFF07' }} />
      <View style={styles.spread}><Text style={{ color: '#C8DECC', fontWeight: '700', fontSize: 10, letterSpacing: 2 }}>YOUR {buckets.find(item => item.value === bucket)?.label.toUpperCase()} QUEUE</Text><Icon name="calendar" color="#C8DECC" size={21} /></View>
      <Text numberOfLines={2} style={{ color: 'white', fontSize: 25, fontWeight: '700', lineHeight: 31 }}>{queue.loading ? 'Getting your next step…' : queue.error ? 'Unable to load your queue' : firstLead?.company_name || 'Your queue is clear'}</Text>
      <Text numberOfLines={2} style={{ color: '#D6E8DC', fontSize: 13, lineHeight: 20 }}>{firstLead ? `${firstLead.contact_person} · ${when(firstLead.follow_up_date)}` : 'Keep every conversation moving with a clear next action.'}</Text>
      <Button secondary icon={firstLead ? 'arrow' : 'plus'} disabled={queue.loading || Boolean(queue.error)} title={firstLead ? 'Open lead & follow up' : 'Add a new lead'}
        onPress={() => firstLead ? router.push({ pathname: '/leads/[id]', params: { id: firstLead.lead_id } }) : router.push('/leads/new')} />
    </LinearGradient>
    <View style={[styles.row, { alignItems: 'stretch' }]}>
      <Pressable accessibilityRole="button" onPress={() => { setBucket('overdue'); setPage(1); }} style={[styles.card, { flex: 1, backgroundColor: colors.sand, borderColor: '#F0E2C8' }]}>
        <Icon name="clock" color={colors.orange} size={20} /><Text style={{ fontSize: 29, fontWeight: '800', color: colors.orange }}>{overdue.loading ? '…' : overdue.error ? '—' : overdue.data?.total ?? '—'}</Text><Text style={styles.small}>Overdue follow-ups</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/tasks')} style={[styles.card, { flex: 1 }]}>
        <Icon name="tasks" color={colors.green} size={20} /><Text style={{ fontSize: 29, fontWeight: '800', color: colors.ink }}>{tasks.loading ? '…' : tasks.error ? '—' : tasks.data?.total ?? '—'}</Text><Text style={styles.small}>Open tasks</Text>
      </Pressable>
    </View>
    {overdue.error || tasks.error ? <><Notice error message="Some work counts could not be loaded. They are not being shown as zero." /><Button secondary title="Retry counts" onPress={() => { overdue.reload(); tasks.reload(); }} /></> : null}
    <View style={styles.spread}><Text style={styles.heading}>Your follow-ups</Text><IconButton name="refresh" label="Refresh workday" onPress={refresh} /></View>
    <Chips options={buckets} value={bucket} onChange={value => { setBucket(value as Bucket); setPage(1); }} />
    <Text style={styles.small}>{queue.loading ? 'Updating your queue…' : queue.error ? 'Queue unavailable' : `${queue.data?.total ?? 0} follow-ups in this queue`} · IST</Text>
    {queue.loading ? <ActivityIndicator color={colors.green} /> : queue.error ? <><Notice error message={queue.error} /><Button secondary title="Retry follow-ups" onPress={queue.reload} /></>
      : queue.data?.items.length ? queue.data.items.map(lead => <LeadCard key={lead.lead_id} lead={lead} />)
      : <Empty title="Nothing in this queue" detail="Switch the date filter or open My Leads to schedule your next conversation." />}
    {queue.data ? <Pagination page={page} totalPages={queue.data.totalPages} onChange={setPage} /> : null}
    <Card><View style={styles.row}><Icon name="leads" color={colors.green} /><View style={{ flex: 1, gap: 4 }}><Text style={styles.heading}>Keep the pipeline moving</Text><Text style={styles.small}>Find a lead. Make a call. Save the next step.</Text></View></View>
      <Button secondary title="Go to My Leads" icon="arrow" onPress={() => router.push('/leads')} /></Card>
  </Screen>;
}
