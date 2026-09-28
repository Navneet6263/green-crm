import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from './components';
import { colors, styles } from './theme';
export function SidePanel({ title, children, onClose, footer }: { title: string; children: ReactNode; onClose: () => void; footer?: ReactNode }) {
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', backgroundColor: '#152C3266' }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <SafeAreaView accessibilityViewIsModal style={{ width: '92%', maxWidth: 460, backgroundColor: '#F5F8F7', borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }}>
        <View style={[styles.spread, { padding: 18, borderBottomWidth: 1, borderColor: colors.line }]}><Text style={[styles.heading, { fontSize: 22, flex: 1 }]}>{title}</Text><IconButton name="back" label={`Close ${title}`} onPress={onClose} /></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 20 }}>{children}</ScrollView>
        {footer ? <View style={{ padding: 18, gap: 10, borderTopWidth: 1, borderColor: colors.line }}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  </Modal>;
}
