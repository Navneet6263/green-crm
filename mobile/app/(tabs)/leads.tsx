import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { getLeads } from '../../src/api/crm';
import { useResource } from '../../src/hooks/useResource';
import { LeadCard } from '../../src/features/leads/LeadCard';
import { Button, Empty, IconButton, Notice, Pagination, Screen } from '../../src/ui/components';
import { Chips } from '../../src/ui/fields';
import { Icon } from '../../src/ui/Icon';
import { colors, styles } from '../../src/ui/theme';

const filters = [{ value: '', label: 'All leads' }, { value: 'new', label: 'New' }, { value: 'contacted', label: 'Contacted' }, { value: 'qualified', label: 'Qualified' }, { value: 'closed-won', label: 'Won' }, { value: 'closed-lost', label: 'Lost' }];
export default function Leads() {
  const { session } = useSession();
  const [search, setSearch] = useState(''), [query, setQuery] = useState(''), [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 350); return () => clearTimeout(timer); }, [search]);
  const result = useResource(`leads:${session?.user.user_id}:${query}:${page}:${status}`, () => getLeads(session!, query, page, status));
  return <Screen title="My leads" subtitle="Every conversation. One clear next step." scroll={false}
    action={<IconButton name="plus" label="Create lead" onPress={() => router.push('/leads/new')} />}>
    <View style={{ paddingHorizontal: 20, gap: 14, paddingBottom: 16 }}>
      <View style={[styles.input, styles.row, { paddingVertical: 0 }]}><Icon name="search" size={19} color={colors.muted} />
        <TextInput accessibilityLabel="Search leads" value={search} onChangeText={setSearch} style={{ flex: 1, minHeight: 50, color: colors.ink, fontSize: 15 }} placeholder="Business, contact or phone" placeholderTextColor={colors.muted} autoCorrect={false} returnKeyType="search" /></View>
      <Chips options={filters} value={status} onChange={value => { setStatus(value); setPage(1); }} />
      <Text style={styles.small}>{result.loading ? 'Updating leads…' : result.error ? 'Lead list unavailable' : `${result.data?.total ?? 0} matching leads`} · Assigned & shared with you</Text>
    </View>
    <FlatList data={result.data?.items ?? []} keyExtractor={lead => lead.lead_id} renderItem={({ item }) => <LeadCard lead={item} />}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }} keyboardShouldPersistTaps="handled"
      refreshing={result.loading} onRefresh={result.reload} initialNumToRender={8} windowSize={5}
      ListEmptyComponent={result.loading ? <ActivityIndicator color={colors.green} /> : result.error ? <View style={{ gap: 12 }}><Notice error message={result.error} /><Button title="Retry" onPress={result.reload} /></View>
        : <Empty title="No matching leads" detail="Try another filter or add your first lead using the + button. Your manager controls team and assignment access." />}
      ListFooterComponent={result.data ? <Pagination page={page} totalPages={result.data.totalPages} onChange={setPage} /> : null} />
  </Screen>;
}
