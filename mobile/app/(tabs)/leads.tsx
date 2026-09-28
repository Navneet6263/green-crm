import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { getLeads } from '../../src/api/crm';
import { leadStatuses } from '../../src/api/sales';
import { useInfiniteList } from '../../src/hooks/useInfiniteList';
import { LeadCard } from '../../src/features/leads/LeadCard';
import { Button, Empty, IconButton, Notice, Screen } from '../../src/ui/components';
import { LeadFilterPanel } from '../../src/features/leads/LeadFilterPanel';
import { LeadExportPanel } from '../../src/features/leads/LeadExportPanel';
import { emptyLeadFilters } from '../../src/features/leads/leadFilters';
import { Icon } from '../../src/ui/Icon';
import { Chips } from '../../src/ui/fields';
import { label } from '../../src/ui/format';
import { colors, styles } from '../../src/ui/theme';

export default function Leads() {
  const { session } = useSession();
  const [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ ...emptyLeadFilters }), [panel, setPanel] = useState('');
  useEffect(() => { const timer = setTimeout(() => setQuery(search.trim()), 350); return () => clearTimeout(timer); }, [search]);
  const identity = `${session?.user.company_id}:${session?.user.user_id}:${session?.token}`;
  const result = useInfiniteList(`leads:${identity}:${query}:${JSON.stringify(filters)}`, page => getLeads(session!, query, page, '', filters), lead => lead.lead_id);
  const count = Object.values(filters).filter(Boolean).length;
  return <Screen title="My leads" subtitle="Your contacts. Your next opportunity." scroll={false}
    action={<IconButton name="plus" label="Create lead" onPress={() => router.push('/leads/new')} />}>
    <View style={{ paddingHorizontal: 20, gap: 14, paddingBottom: 16 }}>
      <View style={[styles.input, styles.row, { paddingVertical: 0 }]}><Icon name="search" size={19} color={colors.muted} />
        <TextInput accessibilityLabel="Search leads" value={search} onChangeText={setSearch} style={{ flex: 1, minHeight: 50, color: colors.ink, fontSize: 15 }} placeholder="Business, contact or phone" placeholderTextColor={colors.muted} autoCorrect={false} returnKeyType="search" /></View>
      <Chips options={[{ value: '', label: 'All' }, ...leadStatuses.map(value => ({ value, label: label(value).replace(/\b\w/g, char => char.toUpperCase()) }))]}
        value={filters.status} onChange={status => setFilters(previous => ({ ...previous, status }))} />
      <View style={styles.row}><View style={{ flex: 1 }}><Button secondary title={`Filters${count ? ` · ${count}` : ''}`} onPress={() => setPanel('filters')} /></View>
        <View style={{ flex: 1 }}><Button secondary title="Export" onPress={() => setPanel('export')} /></View>
        {count ? <IconButton name="refresh" label="Clear lead filters" onPress={() => setFilters({ ...emptyLeadFilters })} /> : null}</View>
      <Text style={styles.small}>{result.loading ? 'Loading your leads…' : `${result.items.length} loaded · ${result.total} matching`} · Assigned & shared with you</Text>
    </View>
    <FlatList data={result.items} keyExtractor={lead => lead.lead_id} renderItem={({ item }) => <LeadCard lead={item} />}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }} keyboardShouldPersistTaps="handled"
      refreshing={result.loading} onRefresh={result.reload} initialNumToRender={8} windowSize={5}
      onEndReached={() => { if (!result.error) result.loadMore(); }} onEndReachedThreshold={0.4}
      ListEmptyComponent={result.loading ? <ActivityIndicator color={colors.green} /> : result.error ? null
        : <Empty title="No matching leads" detail="Try another filter or add your first lead using the + button. Your manager controls team and assignment access." />}
      ListFooterComponent={<View style={{ paddingVertical: 12, gap: 10 }}>{result.moreLoading ? <ActivityIndicator color={colors.green} /> : null}
        {result.error ? <><Notice error message={result.error} /><Button title="Retry loading leads" secondary onPress={result.loadMore} /></> : null}
        {!result.hasMore && result.items.length ? <Text style={{ ...styles.small, textAlign: 'center' }}>You're all caught up.</Text> : null}
      </View>} />
    {session && panel === 'filters' ? <LeadFilterPanel key={identity} session={session} value={filters} onClose={() => setPanel('')} onApply={value => { setFilters(value); setPanel(''); }} /> : null}
    {session && panel === 'export' ? <LeadExportPanel key={identity} session={session} filters={filters} search={query} loaded={result.items} onClose={() => setPanel('')} /> : null}
  </Screen>;
}
