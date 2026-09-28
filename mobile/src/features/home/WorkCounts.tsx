import { Pressable, Text, View } from 'react-native';
import { Glass } from '../../ui/Glass';
import { Icon } from '../../ui/Icon';
import { colors, styles } from '../../ui/theme';

export function WorkCounts({ overdue, tasks, onOverdue, onTasks }: {
  overdue: string | number; tasks: string | number; onOverdue: () => void; onTasks: () => void;
}) {
  return <Glass style={{ flexDirection: 'row', borderRadius: 20 }}>
    {[{ title: 'Overdue', value: overdue, action: onOverdue, color: colors.orange, icon: 'clock' as const },
      { title: 'Open tasks', value: tasks, action: onTasks, color: colors.green, icon: 'tasks' as const }].map((item, i) =>
      <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`${item.title}: ${item.value}`} onPress={item.action}
        style={({ pressed }) => ({ flex: 1, padding: 16, minHeight: 88, gap: 7, opacity: pressed ? 0.65 : 1,
          borderLeftWidth: i ? 1 : 0, borderLeftColor: colors.line })}>
        <View style={styles.spread}><Text style={{ color: item.color, fontSize: 25, fontWeight: '700' }}>{item.value}</Text><Icon name={item.icon} color={item.color} size={18} /></View>
        <Text style={styles.small}>{item.title}</Text>
      </Pressable>)}
  </Glass>;
}
