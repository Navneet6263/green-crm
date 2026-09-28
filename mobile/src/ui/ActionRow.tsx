import { Pressable, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, styles } from './theme';

export function ActionRow({ title, icon, onPress, last = false }: { title: string; icon: IconName; onPress: () => void; last?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 56, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line, opacity: pressed ? 0.65 : 1 })}>
    <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={18} color={colors.green} /></View>
    <Text style={[styles.body, { flex: 1, fontSize: 14, fontWeight: '500' }]}>{title}</Text><Icon name="chevron" size={17} color={colors.muted} />
  </Pressable>;
}
