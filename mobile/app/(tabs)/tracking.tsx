import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useSession } from '../../src/auth/SessionProvider';
import { markReached, nativeTracking, startTracking, stopTracking, syncTracking } from '../../src/tracking/engine';
import { useTracker } from '../../src/tracking/useTracker';
import { TrackerControls } from '../../src/tracking/TrackerControls';
import { RouteMap } from '../../src/tracking/RouteMap';
import { buildRoute } from '../../src/tracking/routeModel';
import { StopHistory } from '../../src/tracking/StopHistory';
import { Button, Card, Notice, Screen } from '../../src/ui/components';
import { Field } from '../../src/ui/fields';
import { colors, styles } from '../../src/ui/theme';
import { Icon } from '../../src/ui/Icon';

export default function Tracking() {
  const { session } = useSession();
  const { state, error, notice, loading, busy, run, refresh, setError } = useTracker(session);
  const [label, setLabel] = useState('');
  const [selectedStop, setSelectedStop] = useState<string>();
  const message = error || state?.serviceError || state?.error;
  const trip = state?.active?.sessionId || state?.events.at(-1)?.session_id;
  const events = state?.events.filter(event => event.session_id === trip) || [];
  const route = useMemo(() => buildRoute(state?.events || [], trip, state?.routeTruncated), [state?.events, trip, state?.routeTruncated]);
  return <Screen title="Geo tracker" subtitle="Your route. Every stop, in one place." onRefresh={nativeTracking ? () => void refresh() : undefined} refreshing={nativeTracking && loading}>
    {!nativeTracking ? <Notice message="Use the Android/iOS app to record a route." /> : null}
    {message ? <Notice error message={message} /> : notice ? <Notice message={notice} /> : null}
    <TrackerControls state={state} route={route} loading={nativeTracking && loading} busy={busy} supported={nativeTracking}
      onStart={() => void run(() => startTracking(session!))}
      onStop={() => void run(() => stopTracking(), 'Tracking stopped.')}
      onSync={() => void run(() => syncTracking(session!, true), 'Sync checked.')} />
    {!state && !loading && nativeTracking ? <Button title="Retry" secondary onPress={() => void refresh()} /> : null}
    {state?.active ? <Card><View style={styles.row}><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}><Icon name="pin" size={19} /></View>
      <View style={{ flex: 1, gap: 2 }}><Text style={styles.heading}>Check in at a store</Text><Text style={styles.small}>Saved offline when you're out of range.</Text></View></View>
      <Field label="Store / location" value={label} onChangeText={setLabel} maxLength={160} editable={!busy} placeholder="Enter store name" />
      <Button title="Mark reached" icon="pin" disabled={!state.running || busy || !label.trim()} onPress={() => void run(async () => {
        await markReached(session!, label); setLabel(''); void syncTracking(session!).catch(() => {});
      }, 'Stop saved.')} />
      <Text style={{ ...styles.small, fontSize: 11 }}>Uses your current GPS location.</Text>
    </Card> : null}
    <Card><View style={styles.spread}><Text style={styles.heading}>{state?.active ? 'Route preview' : events.length ? 'Last route' : 'Route preview'}</Text><Icon name="pin" size={18} color={colors.muted} /></View>
      <RouteMap key={trip || 'empty'} route={route} selectedStop={selectedStop} onSelectStop={setSelectedStop} />
      {route.rejected || route.gaps ? <Text style={{ ...styles.small, fontSize: 11 }}>Weak GPS / gaps excluded from distance. Missing travel is not estimated.</Text> : null}
    </Card>
    <StopHistory key={trip || 'empty'} events={events} stops={route.stops} selectedStop={selectedStop} onSelectStop={setSelectedStop} onError={setError} />
  </Screen>;
}
