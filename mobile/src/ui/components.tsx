import { ActivityIndicator, Pressable, ScrollView, Text, View, RefreshControl, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { colors, styles } from './theme';
import { Icon, type IconName } from './Icon';
import { Glass, GlassBackdrop } from './Glass';

export function Button({ title, onPress, loading = false, disabled = false, secondary = false, icon }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean; icon?: IconName;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading} onPress={onPress} style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 18,
      paddingVertical: 13, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      backgroundColor: secondary ? colors.mint : colors.green, opacity: disabled || loading ? 0.5 : pressed ? 0.75 : 1 })}>
    {loading ? <ActivityIndicator color={secondary ? colors.green : colors.white} />
      : <View style={[styles.row, { maxWidth: '100%' }]}>{icon ? <Icon name={icon} size={18} color={secondary ? colors.green : colors.white} /> : null}<Text style={{ color: secondary ? colors.green : colors.white, fontWeight: '700', fontSize: 14, flexShrink: 1, textAlign: 'center' }}>{title}</Text></View>}
  </Pressable>;
}
export function Badge({ children, warm = false }: { children: ReactNode; warm?: boolean }) {
  return <View style={{ alignSelf: 'flex-start', backgroundColor: warm ? colors.sand : colors.mint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
    <Text style={{ color: warm ? colors.orange : colors.green, fontSize: 11, fontWeight: '700' }}>{children}</Text>
  </View>;
}
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <Glass style={{ ...styles.card, ...style }}>{children}</Glass>;
}
export function Notice({ message, error = false }: { message: string; error?: boolean }) {
  return <View accessibilityRole={error ? 'alert' : undefined} style={{ borderRadius: 14, padding: 14, backgroundColor: error ? colors.error : colors.sand }}>
    <Text style={{ color: error ? colors.red : colors.orange, fontSize: 13, lineHeight: 20 }}>{message}</Text>
  </View>;
}
export function Screen({ title, eyebrow = '', subtitle, children, scroll = true, action, top, onRefresh, refreshing = false }: {
  title: string; eyebrow?: string; subtitle?: string; children: ReactNode; scroll?: boolean;
  action?: ReactNode; top?: ReactNode; onRefresh?: () => void; refreshing?: boolean;
}) {
  const header = <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, gap: 7 }}>
    {top}
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<View style={styles.spread}><Text accessibilityRole="header" style={[styles.title, { flex: 1 }]}>{title}</Text>{action}</View>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>;
  return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
    <GlassBackdrop />
    <View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} /> : undefined}
        contentContainerStyle={{ paddingBottom: 20 }}>{header}<View style={styles.content}>{children}</View></ScrollView> : <>{header}{children}</>}
    </View>
  </SafeAreaView>;
}
export function IconButton({ name, label, onPress }: { name: IconName; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.6 : 1 })}>
    <Icon name={name} color={colors.green} />
  </Pressable>;
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return <Card><Text style={styles.heading}>{title}</Text><Text style={styles.subtitle}>{detail}</Text></Card>;
}
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <View style={styles.spread}><Button title="Previous" secondary disabled={page <= 1} onPress={() => onChange(page - 1)} />
    <Text style={styles.small}>{page} / {totalPages}</Text><Button title="Next" secondary disabled={page >= totalPages} onPress={() => onChange(page + 1)} /></View>;
}
