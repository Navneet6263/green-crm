import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Icon, type IconName } from '../../src/ui/Icon';
import { colors } from '../../src/ui/theme';

const tab = (title: string, icon: IconName) => ({ title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => <Icon name={icon} color={color} size={focused ? 24 : 22} />,
});
export default function TabLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, paddingTop: 8 },
    tabBarItemStyle: { paddingBottom: 3 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={tab('Today', 'home')} />
    <Tabs.Screen name="leads" options={tab('My Leads', 'leads')} />
    <Tabs.Screen name="tasks" options={tab('My Tasks', 'tasks')} />
    <Tabs.Screen name="tracking" options={tab('Tracker', 'pin')} />
    <Tabs.Screen name="profile" options={tab('Account', 'user')} />
  </Tabs>;
}
