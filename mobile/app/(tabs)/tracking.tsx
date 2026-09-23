import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSession } from '../../src/auth/SessionProvider';
import { markReached, nativeTracking, startTracking, stopTracking, syncTracking, trackingState } from '../../src/tracking/engine';
import type { TrackState } from '../../src/tracking/types';
import { RouteSketch } from '../../src/tracking/RouteSketch';
import { Badge, Button, Card, Notice, Screen } from '../../src/ui/components';
import { Field } from '../../src/ui/fields';
import { when } from '../../src/ui/format';
import { styles } from '../../src/ui/theme';

export default function Tracking() {
  const { session } = useSession();
  const [state, setState] = useState<TrackState>(), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [consent, setConsent] = useState(false), [label, setLabel] = useState('');
  const lock = useRef(false);
  const reload = useCallback(async () => {
    if (session && nativeTracking) setState(await trackingState(session));
  }, [session]);
  useFocusEffect(useCallback(() => {
    let active = true;
    const update = async () => { try { if (session && nativeTracking) { const value = await trackingState(session); if (active) setState(value); } } catch (failure) { if (active) setError((failure as Error).message); } };
    void update(); const timer = setInterval(() => void update(), 5000);
    return () => { active = false; clearInterval(timer); };
  }, [session]));
  const run = async (action: () => Promise<unknown>, success: string) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(success); await reload(); }
    catch (failure) { setError((failure as Error).message); }
    finally { lock.current = false; setBusy(false); }
  };
  if (!nativeTracking) return <Screen title="Geo tracker" subtitle="Your route, recorded on your phone."><Notice message="Offline/background tracking requires the Android/iOS development build. The browser does not record a route." /></Screen>;
  const recent = (state?.events || []).filter(event => event.kind === 'reach').slice(-10).reverse();
  const tripEvents = state?.active ? state.events.filter(event => event.session_id === state.active!.sessionId) : state?.events.filter(event => event.session_id === state.events.at(-1)?.session_id) || [];
  return <Screen title="Geo tracker" subtitle="Start your route. Mark each stop. Sync when online.">
    {session?.offline ? <Notice message="Offline sign-in: using your last verified identity (up to 12 hours). Pending locations upload only after the server accepts your session." /> : null}
    {error ? <Notice error message={error} /> : null}{notice ? <Notice message={notice} /> : null}
    {state?.error ? <Notice error message={state.error} /> : null}
    {!state && !error ? <ActivityIndicator /> : null}
    <Card><View style={styles.spread}><Text style={styles.heading}>Tracking status</Text><Badge warm={!state?.running}>{state?.active && state.running ? 'ON' : state?.active ? 'Interrupted' : 'OFF'}</Badge></View>
      <Text style={styles.body}>{state?.pending ?? '—'} locations/events waiting to upload</Text>
      {state?.active ? <><Text style={styles.small}>Started {when(state.active.startedAt)}</Text>
        {!state.running ? <Notice message="The OS location service is not running. End this session and start again. Missing route segments cannot be reconstructed." /> : null}
        <Button title="Stop tracking" loading={busy} onPress={() => void run(() => stopTracking(), 'Tracking stopped. Pending locations remain saved.')} /></>
        : <><Text style={styles.subtitle}>Your route is collected only after Start. GPS continues while the app is backgrounded, with a visible system indicator. Stop anytime. Sessions stop at the 12-hour safety limit when the app/OS task next runs.</Text>
          <Text style={styles.small}>GPS accuracy/battery/OS restrictions affect sampling. Force-closing the app can stop recording. Stored coordinates are device-reported, not tamper-proof attendance evidence.</Text>
          <Button secondary title={consent ? '✓ I agree to record and upload my work route' : 'I agree to record and upload my work route'} disabled={busy} onPress={() => setConsent(!consent)} />
          <Button title="Start tracking" icon="pin" disabled={!consent || !state} loading={busy} onPress={() => void run(() => startTracking(session!), 'Tracking started. You can work without internet.')} /></>}
      <Button secondary title="Upload pending now" icon="refresh" disabled={!state || busy} onPress={() => void run(() => syncTracking(session!, true), 'Sync checked. See the pending count for any remaining batches.')} />
    </Card>
    <Card><Text style={styles.heading}>Reached a location</Text><Field label="Store / location name" value={label} onChangeText={setLabel} maxLength={160} editable={!busy} placeholder="For example: customer store name" />
      <Button title="Mark reached here" icon="pin" disabled={!state?.active || busy || !label.trim()} onPress={() => void run(async () => { await markReached(session!, label); setLabel(''); void syncTracking(session!).catch(() => {}); }, 'Reached location saved on this phone.')} />
      <Text style={styles.small}>Requires a fresh GPS fix (accuracy within 100 metres). Works offline; this is your manual check-in, not an automatic geofence.</Text>
    </Card>
    <Card><Text style={styles.heading}>Current / last route</Text><RouteSketch events={tripEvents} /></Card>
    <Text style={styles.heading}>Recent reached locations</Text>
    {recent.length ? recent.map(event => <Card key={event.event_id}><Text style={styles.heading}>{event.label}</Text><Text style={styles.small}>{when(event.captured_at)} · ±{Math.round(event.accuracy || 0)} m</Text>
      <Text style={styles.small}>{event.latitude?.toFixed(6)}, {event.longitude?.toFixed(6)}</Text><Button secondary title="Open in Maps" onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`).catch(() => setError('Could not open Maps.'))} /></Card>)
      : <Text style={styles.small}>Your reached stops will appear here after you mark them.</Text>}
    <Text style={styles.small}>Do not uninstall or clear app data while uploads are pending. Signing out stops tracking; pending data stays encrypted for the same account. This screen shows local history; uploaded records stay on the server.</Text>
  </Screen>;
}
