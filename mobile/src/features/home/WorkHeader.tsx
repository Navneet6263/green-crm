import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '../../auth/SessionProvider';
import { getNotifications } from '../../api/notifications';
import { useResource } from '../../hooks/useResource';
import { Icon } from '../../ui/Icon';
import { colors, styles } from '../../ui/theme';

export function WorkHeader() {
  const { session } = useSession();
  const inbox = useResource(`inbox-count:${session?.user.user_id}`, () => getNotifications(session!, 1, 1));
  if (!session) return null;
  const unread = inbox.data?.unread;
  const label = inbox.loading ? 'Notifications, loading' : inbox.error ? 'Notifications, count unavailable' : `Notifications${unread == null ? '' : `, ${unread} unread`}`;
  const initials = session.user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  return <View style={[styles.spread, { paddingBottom: 17 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => router.push('/profile')}
      style={[styles.row, { flex: 1, minHeight: 52 }]}>
      <View style={{ width: 48, height: 48, borderRadius: 18, backgroundColor: '#244D3F', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#E7F2D2' }}>{initials || 'S'}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={{ color: colors.ink, fontSize: 14, fontWeight: '700' }}>{session.user.name}</Text>
        <Text numberOfLines={1} style={styles.small}>{session.company?.name || 'Sales workspace'}</Text></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => router.push('/notifications')}
      style={{ width: 48, height: 48, borderRadius: 18, backgroundColor: '#FFFFFFC9', borderWidth: 1, borderColor: 'white', justifyContent: 'center', alignItems: 'center' }}>
      <Icon name="bell" />
      {unread != null && unread > 0 ? <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, paddingHorizontal: 4, height: 20, borderRadius: 10, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>{unread > 99 ? '99+' : unread}</Text>
      </View> : null}
    </Pressable>
  </View>;
}
