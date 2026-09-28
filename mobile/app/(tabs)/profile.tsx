import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useSession } from '../../src/auth/SessionProvider';
import { API_BASE } from '../../src/api/runtime';
import { Badge, Button, Card, Notice, Screen } from '../../src/ui/components';
import { Icon } from '../../src/ui/Icon';
import { colors, styles } from '../../src/ui/theme';
import { ActionRow } from '../../src/ui/ActionRow';

export default function Profile() {
  const { session, signOut } = useSession();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  if (!session) return null;
  const exit = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { await signOut(); }
    catch { setError('Could not clear your saved login. Please retry before handing over this device.'); }
    finally { setBusy(false); }
  };
  let server = API_BASE;
  try { server = new URL(API_BASE).host; } catch { /* Configuration is validated by API client. */ }
  return <Screen title="Your account" subtitle="Your sales workspace.">
    <Card><View style={styles.row}><View style={{ backgroundColor: colors.mint, width: 64, height: 64, justifyContent: 'center', alignItems: 'center', borderRadius: 22 }}>
      <Text style={{ fontSize: 25, color: colors.green, fontWeight: '800' }}>{session.user.name.slice(0, 1).toUpperCase()}</Text></View>
      <View style={{ flex: 1, gap: 5 }}><Text style={styles.heading}>{session.user.name}</Text><Text style={styles.small}>{session.user.email}</Text><Badge>Sales employee</Badge></View></View>
      <View style={styles.divider} /><Text style={styles.eyebrow}>YOUR COMPANY</Text><Text style={styles.body}>{session.company?.name || 'CRM workspace'}</Text>
    </Card>
    <Card style={{ gap: 0 }}><Text style={[styles.heading, { paddingBottom: 8 }]}>Your work</Text>
      <ActionRow title="My tasks" icon="tasks" onPress={() => router.push('/tasks')} />
      <ActionRow title="Notifications" icon="bell" onPress={() => router.push('/notifications')} />
      <ActionRow title="Route & pending uploads" icon="pin" last onPress={() => router.push('/tracking')} />
    </Card>
    <Card><View style={styles.row}><Icon name="lock" color={colors.green} /><Text style={styles.heading}>Privacy & location</Text></View>
      <Text style={styles.small}>Only your permitted company, team and lead data is available.</Text>
      <Text style={styles.small}>{Platform.OS === 'web' ? 'Browser login ends on refresh.' : 'Login is saved in device secure storage.'}</Text>
      <Text style={styles.small}>Tracking starts only when you choose Start. Signing out stops tracking; pending routes stay on this phone for your next login.</Text>
    </Card>
    <Card><View style={styles.row}><Icon name="leads" color={colors.green} /><Text style={styles.heading}>CRM connection</Text></View>
      <Text style={styles.body}>{server}</Text></Card>
    {error ? <Notice error message={error} /> : null}
    <Button secondary icon="logout" title="Sign out" loading={busy} onPress={() => void exit()} />
    <Text style={[styles.small, { textAlign: 'center' }]}>Sales app · {Constants.expoConfig?.version || '—'}</Text>
  </Screen>;
}
