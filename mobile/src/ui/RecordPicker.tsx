import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Page } from '../api/types';
import { Button, Empty, Notice, Pagination } from './components';
import { Field } from './fields';
import { Icon } from './Icon';
import { colors, styles } from './theme';

type Option = { id: string; name: string; disabled?: boolean };
export function RecordPicker({ label, value, load, onChange, disabled = false }: {
  label: string; value: Option | null; load: (search: string, page: number) => Promise<Page<Option>>;
  onChange: (value: Option) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [data, setData] = useState<Page<Option>>(), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const loader = useRef(load); loader.current = load;
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    if (!open) return;
    let active = true; setLoading(true); setError(''); setData(undefined);
    loader.current(query, page).then(result => { if (active) setData(result); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Could not load options.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, query, page, revision]);
  return <View style={{ gap: 8 }}><Text style={{ fontSize: 13, color: colors.ink, fontWeight: '600' }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => setOpen(true)} style={[styles.input, styles.spread]}>
      <Text style={[styles.body, { flex: 1 }]}>{value?.name || `Choose ${label.toLowerCase()}`}</Text><Icon name="chevron" size={18} /></Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={styles.screen}><View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', flex: 1, padding: 20, gap: 18 }}>
        <Text style={styles.title}>Choose {label.toLowerCase()}</Text><Field label="Search" value={search} onChangeText={setSearch} autoCorrect={false} />
        {error ? <><Notice error message={error} /><Button secondary title="Try again" onPress={() => setRevision(n => n + 1)} /></> : null}
        <FlatList data={data?.items || []} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => <Pressable disabled={item.disabled} accessibilityRole="button" accessibilityState={{ selected: value?.id === item.id, disabled: item.disabled }}
            onPress={() => { onChange(item); setOpen(false); }} style={[styles.card, styles.spread, { opacity: item.disabled ? 0.4 : 1 }]}>
            <Text style={[styles.body, { flex: 1 }]}>{item.name}{item.disabled ? ' (inactive)' : ''}</Text>{value?.id === item.id ? <Icon name="check" color={colors.green} /> : <Icon name="chevron" size={16} />}</Pressable>}
          ListEmptyComponent={loading ? <ActivityIndicator color={colors.green} /> : error ? null : <Empty title="No matches" detail="Try another search or ask your manager to check your team and product access." />}
          ListFooterComponent={data ? <Pagination page={page} totalPages={data.totalPages} onChange={setPage} /> : null} />
        <Button secondary title="Cancel" onPress={() => setOpen(false)} />
      </View></SafeAreaView>
    </Modal>
  </View>;
}
