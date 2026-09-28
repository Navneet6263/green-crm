import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import type { TrackEvent } from './types';
import { Button, Card, IconButton } from '../ui/components';
import { buildRoute, type RouteStop } from './routeModel';
import { Icon } from '../ui/Icon';
import { when } from '../ui/format';
import { colors, styles } from '../ui/theme';

export function StopHistory({ events, stops: supplied, onError, onSelectStop, selectedStop }: {
  events: TrackEvent[]; stops?: RouteStop[]; onError: (message: string) => void;
  onSelectStop?: (id: string) => void; selectedStop?: string;
}) {
  const [page, setPage] = useState(0);
  const all = supplied || buildRoute(events).stops;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(all.length / 10) - 1));
  const stops = all.slice(currentPage * 10, currentPage * 10 + 10);
  if (!stops.length) return <View style={[styles.row, { paddingHorizontal: 4, paddingBottom: 4 }]}>
    <Icon name="pin" size={18} color={colors.muted} /><Text style={[styles.small, { flex: 1 }]}>Your check-ins will appear here as you visit stores.</Text>
  </View>;
  return <Card><View style={styles.spread}><Text style={styles.heading}>Visit log</Text><Text style={styles.small}>{all.length} stops</Text></View>
    {stops.map(({ event, number, coordinate }, index) => <View key={event.event_id} style={{ flexDirection: 'row', gap: 12, paddingTop: index ? 12 : 0, borderTopWidth: index ? 1 : 0, borderTopColor: colors.line, backgroundColor: selectedStop === event.event_id ? colors.mint : 'transparent' }}>
      <View style={{ width: 28, height: 28, marginTop: 4, borderRadius: 14, backgroundColor: colors.mint, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: colors.green, fontWeight: '700' }}>{number}</Text></View>
      <View style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.ink, fontWeight: '600', fontSize: 14 }}>{event.label || 'Visited location'}</Text>
        <Text style={styles.small}>{when(event.captured_at)}</Text>
        {Number.isFinite(event.accuracy) ? <Text style={{ ...styles.small, fontSize: 11 }}>GPS accuracy ±{Math.round(event.accuracy!)} m</Text> : null}
      </View>
      {coordinate ? <IconButton name="pin" label={`Open ${event.label || 'stop'} in Maps`} onPress={() => {
        if (onSelectStop) { onSelectStop(event.event_id); return; }
        void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coordinate.latitude},${coordinate.longitude}`).catch(() => onError('Could not open Maps.'));
      }} /> : null}
    </View>)}
    {all.length > 10 ? <View style={styles.spread}><Button title="Previous" secondary disabled={currentPage === 0} onPress={() => setPage(currentPage - 1)} />
      <Text style={styles.small}>{currentPage + 1} / {Math.ceil(all.length / 10)}</Text>
      <Button title="Next" secondary disabled={(currentPage + 1) * 10 >= all.length} onPress={() => setPage(currentPage + 1)} /></View> : null}
  </Card>;
}
