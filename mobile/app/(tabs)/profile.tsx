import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useSession } from '../../src/auth/SessionProvider';
import { API_BASE } from '../../src/api/runtime';
import { Badge, Button, Card, Notice, Screen } from '../../src/ui/components';
import { Icon } from '../../src/ui/Icon';
import { colors, styles } from '../../src/ui/theme';

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
  return <Screen title="Your account" subtitle="Your workspace, connection and privacy.">
    <Card><View style={styles.row}><View style={{ backgroundColor: colors.mint, width: 64, height: 64, justifyContent: 'center', alignItems: 'center', borderRadius: 22 }}>
      <Text style={{ fontSize: 25, color: colors.green, fontWeight: '800' }}>{session.user.name.slice(0, 1).toUpperCase()}</Text></View>
      <View style={{ flex: 1, gap: 5 }}><Text style={styles.heading}>{session.user.name}</Text><Text style={styles.small}>{session.user.email}</Text><Badge>Sales employee</Badge></View></View>
      <View style={styles.divider} /><Text style={styles.eyebrow}>YOUR COMPANY</Text><Text style={styles.body}>{session.company?.name || 'CRM workspace'}</Text>
    </Card>
    <Card><View style={styles.row}><Icon name="lock" color={colors.green} /><Text style={styles.heading}>Private by design</Text></View>
      <Text style={styles.subtitle}>Your company, team and assigned/shared leads are checked by the CRM server on every request.</Text>
      <Text style={styles.subtitle}>{Platform.OS === 'web' ? 'This browser keeps your token only in memory. Refreshing signs you out.' : 'Your login token is kept in device secure storage. Your session is checked when the app opens.'}</Text>
      <View style={styles.divider} /><Text style={styles.small}>Location is recorded only after you start Geo tracker. Stop it anytime. Offline locations remain encrypted on this phone until acknowledged by the CRM. Signing out stops tracking but keeps pending data for this account.</Text>
    </Card>
    <Card><View style={styles.row}><Icon name="leads" color={colors.green} /><Text style={styles.heading}>CRM connection</Text></View>
      <Text style={styles.body}>{server}</Text><Text style={styles.small}>Lead updates, conversation notes and task changes are saved to this CRM.</Text></Card>
    {error ? <Notice error message={error} /> : null}
    <Button secondary icon="logout" title="Sign out" loading={busy} onPress={() => void exit()} />
    <Text style={[styles.small, { textAlign: 'center' }]}>GreenCRM Sales · 0.1.0</Text>
  </Screen>;
}
