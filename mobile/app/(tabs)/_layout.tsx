import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../src/ui/Icon';
import { colors } from '../../src/ui/theme';
import { useSession } from '../../src/auth/SessionProvider';
import { crmOn, moduleOn } from '../../src/auth/modules';

const tab = (title: string, icon: IconName) => ({ title,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => <View style={{ width: 44, height: 31, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? '#D8EAB6' : 'transparent' }}><Icon name={icon} color={focused ? '#233F31' : color} size={21} /></View>,
});
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  // Tabs outside the company's plan are hidden (a tracking-only company sees Tracker and Account).
  const crm = crmOn(session), tasks = moduleOn(session, 'tasks'), tracking = moduleOn(session, 'field_tracking');
  const only = (on: boolean, options: ReturnType<typeof tab>) => (on ? options : { ...options, href: null });
  return <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas }, tabBarActiveTintColor: '#EEF5E8', tabBarInactiveTintColor: '#BDCFC4', tabBarHideOnKeyboard: true,
    tabBarStyle: { backgroundColor: '#183C30F5', borderTopWidth: 0, borderWidth: 1, borderColor: '#FFFFFF99', borderRadius: 26,
      marginHorizontal: 12, marginBottom: Math.max(insets.bottom, 10), height: 68, paddingTop: 7, paddingBottom: 7, elevation: 0 },
    tabBarItemStyle: { paddingBottom: 0 }, tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 3 } }}>
    <Tabs.Screen name="index" options={only(crm, tab('Today', 'home'))} />
    <Tabs.Screen name="leads" options={only(crm, tab('My Leads', 'leads'))} />
    <Tabs.Screen name="tasks" options={only(crm && tasks, tab('My Tasks', 'tasks'))} />
    <Tabs.Screen name="tracking" options={only(tracking, tab('Tracker', 'pin'))} />
    <Tabs.Screen name="profile" options={tab('Account', 'user')} />
  </Tabs>;
}
