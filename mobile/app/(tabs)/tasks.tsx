import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { getTasks } from '../../src/api/crm';
import type { Bucket } from '../../src/api/types';
import { useInfiniteList } from '../../src/hooks/useInfiniteList';
import { TaskCard } from '../../src/features/tasks/TaskCard';
import { Button, Empty, IconButton, Notice, Screen } from '../../src/ui/components';
import { Chips } from '../../src/ui/fields';
import { colors, styles } from '../../src/ui/theme';

const filters = [{ value: 'all', label: 'Open' }, { value: 'today', label: 'Today' }, { value: 'overdue', label: 'Overdue' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'done', label: 'Done' }];
export default function Tasks() {
  const { session } = useSession();
  const [filter, setFilter] = useState('all');
  const result = useInfiniteList(`tasks:${session?.token}:${session?.user.company_id}:${filter}`, page => getTasks(session!, filter === 'done' ? 'all' : filter as Bucket | 'all', page, filter === 'done'), task => task.task_id);
  return <Screen title="My tasks" subtitle="Your next actions, sorted." scroll={false} action={<IconButton name="plus" label="Create task" onPress={() => router.push('/tasks/new')} />}>
    <View style={{ paddingHorizontal: 20, gap: 14, paddingBottom: 18 }}><Chips options={filters} value={filter} onChange={setFilter} />
      <View style={{ padding: 16, borderRadius: 18, backgroundColor: filter === 'overdue' ? '#FFF0E5' : filter === 'done' ? '#E4F4E8' : '#EAF0FC', gap: 4 }}>
        <Text style={[styles.heading, { color: filter === 'overdue' ? '#9C5226' : '#345A94' }]}>{filter === 'today' ? "Today's focus" : filter === 'overdue' ? 'Needs your attention' : filter === 'done' ? 'Work completed' : 'One next step at a time'}</Text>
        <Text style={styles.small}>{result.loading ? 'Updating your tasks…' : `${result.total} tasks · ${result.items.length} loaded`} · Assigned to you · IST</Text></View></View>
    <FlatList data={result.items} keyExtractor={task => task.task_id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }} refreshing={result.loading} onRefresh={result.reload}
      onEndReached={() => { if (!result.error) result.loadMore(); }} onEndReachedThreshold={0.4} initialNumToRender={8} windowSize={5}
      renderItem={({ item }) => session ? <TaskCard task={item} session={session} onChanged={result.reload} /> : null}
      ListEmptyComponent={result.loading ? <ActivityIndicator color={colors.green} /> : result.error ? null
        : <Empty title="You're clear in this list" detail="Use + to plan a task, or switch filters to see other work." />}
      ListFooterComponent={<View style={{ gap: 10, paddingVertical: 10 }}>{result.moreLoading ? <ActivityIndicator color={colors.green} /> : null}
        {result.error ? <><Notice error message={result.error} /><Button secondary title="Retry tasks" onPress={result.loadMore} /></> : null}
        {!result.hasMore && result.items.length ? <Text style={{ ...styles.small, textAlign: 'center' }}>All matching tasks loaded.</Text> : null}</View>} />
  </Screen>;
}
