import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Icon, type IconName } from '../../ui/Icon';
import { colors, styles } from '../../ui/theme';

const actions: { title: string; icon: IconName; path: '/leads/new' | '/tasks' | '/tracking' }[] = [
  { title: 'Add lead', icon: 'plus', path: '/leads/new' },
  { title: 'My tasks', icon: 'tasks', path: '/tasks' },
  { title: 'Start visit', icon: 'pin', path: '/tracking' },
];
export function QuickActions() {
  return <View style={[styles.row, { alignItems: 'stretch', gap: 9, paddingVertical: 4 }]}>
    {actions.map(action => <Pressable key={action.path} accessibilityRole="button" accessibilityLabel={action.title}
      onPress={() => router.push(action.path)} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.65 : 1 })}>
      <View style={{ minHeight: 78, gap: 9, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#FFFFFFC9', borderWidth: 1, borderColor: 'white', alignItems: 'center', justifyContent: 'center' }}><Icon name={action.icon} size={21} /></View>
        <Text style={{ color: colors.ink, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{action.title}</Text></View>
    </Pressable>)}
  </View>;
}
