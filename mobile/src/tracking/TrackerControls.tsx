import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Button } from '../ui/components';
import { Icon } from '../ui/Icon';
import { styles } from '../ui/theme';
import { when } from '../ui/format';
import { trackingLabels } from './status';
import type { TrackState } from './types';
import { buildRoute, type RouteModel } from './routeModel';

type Props = { state?: TrackState; route?: RouteModel; loading: boolean; busy: boolean; supported?: boolean; onStart: () => void; onStop: () => void; onSync: () => void };
export function TrackerControls({ state, route: supplied, loading, busy, supported = true, onStart, onStop, onSync }: Props) {
  const trip = state?.active?.sessionId || state?.events.at(-1)?.session_id;
  const events = state?.events.filter(event => event.session_id === trip) || [];
  const route = supplied || buildRoute(events, trip, state?.routeTruncated);
  const stops = events.filter(event => event.kind === 'reach').length;
  const status = loading ? 'Loading...' : state?.status ? trackingLabels[state.status] : 'Unavailable';
  const heading = !supported ? 'Take your work on the road.' : state?.status === 'recording' ? 'Your route is recording.'
    : state?.active ? 'Your route, at a glance.' : 'Ready for your next visit?';
  return <LinearGradient colors={['#285A48', '#153C32']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    style={{ padding: 20, borderRadius: 24, gap: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFFB0' }}>
    <View style={[styles.spread, { flexWrap: 'wrap' }]}><View style={styles.row}><Icon name="pin" color="#C9E4BC" size={18} /><Text style={{ color: '#D6E7DB', fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>FIELD ROUTE</Text></View>
      <Badge warm={state?.status !== 'recording'}>{busy ? 'Please wait...' : status}</Badge></View>
    <Text style={{ fontSize: 25, lineHeight: 31, color: '#FFFFFF', fontWeight: '600', letterSpacing: -0.5 }}>{heading}</Text>
    {state?.active ? <Text style={lightText}>Started {when(state.active.startedAt)}</Text> : null}
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#FFFFFF26', paddingVertical: 14 }}>
      {[{ value: state && route.fixes ? (route.metres / 1000).toFixed(2) : '—', title: route.partial ? 'Partial km' : 'Est. km' }, { value: state ? stops : '—', title: 'Stops' }, { value: state?.pending ?? '—', title: 'To sync' }].map((item, index) =>
        <View key={item.title} style={{ flex: 1, gap: 5, paddingLeft: index ? 12 : 0, borderLeftWidth: index ? 1 : 0, borderLeftColor: '#FFFFFF26' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '600' }}>{item.value}</Text><Text style={lightText}>{item.title}</Text>
        </View>)}
    </View>
    {state?.lastFixAt ? <Text style={lightText}>Last GPS: {when(state.lastFixAt)}</Text> : null}
    {state?.status === 'waiting_gps' ? <Text style={lightText}>Finding GPS. Move outdoors for a better signal.</Text> : null}
    {state?.status === 'gps_idle' ? <Text style={lightText}>No recent GPS. You may be stationary or have a weak signal.</Text> : null}
    {state?.status === 'location_off' ? <Text style={lightText}>Switch on your phone's Location.</Text> : null}
    {state?.status === 'interrupted' ? <Text style={lightText}>Route interrupted. Stop this session, then start again.</Text> : null}
    <Button title={state?.active ? 'Stop tracking' : 'Start tracking'} secondary icon="pin" loading={busy} disabled={loading || !supported}
      onPress={state?.active ? onStop : onStart} />
    {!state?.active && supported ? <Text style={lightText}>Start saves and uploads your work route, including while locked, until you stop.</Text> : null}
    {(state?.pending || 0) > 0 ? <Button title="Sync now" secondary icon="refresh" disabled={busy} onPress={onSync} /> : null}
    {state ? <Text style={{ ...lightText, fontSize: 10 }}>GPS estimate for this trip, not an odometer reading.{route.partial ? ' Local history is incomplete.' : ''}</Text> : null}
  </LinearGradient>;
}
const lightText = { color: '#D4E4DB', fontSize: 12, lineHeight: 18 };
