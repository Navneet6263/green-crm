import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import type { Session } from '../../api/types';
import { request } from '../../api/runtime';
import { readPage } from '../../api/client';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import { Button, Card, Empty, Notice } from '../../ui/components';
import { Chips } from '../../ui/fields';
import { label, when } from '../../ui/format';
import { colors, styles } from '../../ui/theme';
type Entry = { id: number; activity_id?: string; type?: string; description?: string; content?: string; created_at: string; created_by_name?: string };
export function LeadHistory({ session, id, revision }: { session: Session; id: string; revision: number }) {
  const [tab, setTab] = useState('activities');
  const result = useInfiniteList(`history:${session.token}:${session.user.company_id}:${id}:${tab}:${revision}`, async page =>
    readPage<Entry>(await request(`/leads/${encodeURIComponent(id)}/${tab}?page=${page}&page_size=15`, session.token), page), entry => String(entry.activity_id || entry.id));
  return <View style={{ gap: 14 }}><Chips options={[{ value: 'activities', label: 'Activity timeline' }, { value: 'notes', label: 'Conversation notes' }]} value={tab} onChange={setTab} />
    <Button secondary title="Refresh history" onPress={result.reload} />
    {result.loading ? <ActivityIndicator color={colors.green} /> : null}
    {result.items.map(entry => <Card key={entry.activity_id || entry.id} style={{ borderLeftWidth: 3, borderLeftColor: tab === 'notes' ? '#7251A6' : '#3E879D' }}>
      <Text style={styles.heading}>{tab === 'notes' ? 'Conversation note' : label(entry.type || 'Activity')}</Text>
      {entry.description || entry.content ? <Text style={styles.body}>{entry.description || entry.content}</Text> : null}
      <Text style={styles.small}>{entry.created_by_name || 'CRM user'} · {when(entry.created_at)}</Text>
    </Card>)}
    {result.error ? <><Notice error message={result.error} /><Button title="Retry history" onPress={result.loadMore} /></> : null}
    {!result.loading && !result.error && !result.items.length ? <Empty title="No history yet" detail="Saved CRM activity will appear here." /> : null}
    {result.hasMore && !result.loading && !result.error ? <Button secondary title="Load older history" loading={result.moreLoading} onPress={result.loadMore} /> : null}
  </View>;
}
