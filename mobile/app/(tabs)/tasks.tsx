import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { getTasks } from '../../src/api/crm';
import type { Bucket } from '../../src/api/types';
import { useResource } from '../../src/hooks/useResource';
import { TaskCard } from '../../src/features/tasks/TaskCard';
import { Button, Empty, IconButton, Notice, Pagination, Screen } from '../../src/ui/components';
import { Chips } from '../../src/ui/fields';
import { colors, styles } from '../../src/ui/theme';

const filters = [{ value: 'all', label: 'Open' }, { value: 'today', label: 'Today' }, { value: 'overdue', label: 'Overdue' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'done', label: 'Done' }];
export default function Tasks() {
  const { session } = useSession();
  const [filter, setFilter] = useState('all'), [page, setPage] = useState(1);
  const result = useResource(`tasks:${session?.user.user_id}:${filter}:${page}`, () => getTasks(session!, filter === 'done' ? 'all' : filter as Bucket | 'all', page, filter === 'done'));
  return <Screen title="My tasks" subtitle="A focused list. A productive day." scroll={false} action={<IconButton name="plus" label="Create task" onPress={() => router.push('/tasks/new')} />}>
    <View style={{ paddingHorizontal: 20, gap: 14, paddingBottom: 18 }}><Chips options={filters} value={filter} onChange={value => { setFilter(value); setPage(1); }} />
      <Text style={styles.small}>{result.loading ? 'Updating your tasks…' : result.error ? 'Task list unavailable' : `${result.data?.total ?? 0} tasks`} · Only work assigned to you · IST</Text></View>
    <FlatList data={result.data?.items || []} keyExtractor={task => task.task_id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 16 }} refreshing={result.loading} onRefresh={result.reload}
      renderItem={({ item }) => session ? <TaskCard task={item} session={session} onChanged={result.reload} /> : null}
      ListEmptyComponent={result.loading ? <ActivityIndicator color={colors.green} /> : result.error ? <View style={{ gap: 12 }}><Notice error message={result.error} /><Button secondary title="Retry" onPress={result.reload} /></View>
        : <Empty title="You're clear in this list" detail="Use + to plan a task, or switch filters to see other work." />}
      ListFooterComponent={result.data ? <Pagination page={page} totalPages={result.data.totalPages} onChange={setPage} /> : null} />
  </Screen>;
}
