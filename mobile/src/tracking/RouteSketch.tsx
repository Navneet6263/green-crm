import { Text, View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import type { TrackEvent } from './types';
import { styles, colors } from '../ui/theme';
import { Icon } from '../ui/Icon';
export function RouteSketch({ events }: { events: TrackEvent[] }) {
  const points = events.filter(event => Number.isFinite(event.latitude) && Number.isFinite(event.longitude));
  if (!points.length) return <View style={{ minHeight: 142, gap: 10, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: '#EAF1EB', borderRadius: 16 }}>
    <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#D6E6DA', alignItems: 'center', justifyContent: 'center' }}><Icon name="pin" color={colors.green} size={21} /></View>
    <Text style={{ ...styles.small, textAlign: 'center' }}>Your route appears after the first GPS fix.</Text>
  </View>;
  const lat = points.map(point => point.latitude!), lng = points.map(point => point.longitude!);
  const latMin = Math.min(...lat), lngMin = Math.min(...lng);
  const latSpan = Math.max(...lat) - latMin, lngSpan = Math.max(...lng) - lngMin;
  const scale = Math.min(252 / Math.max(0.0001, lngSpan), 124 / Math.max(0.0001, latSpan));
  const plotted = points.map(point => ({ x: 150 + (point.longitude! - lngMin - lngSpan / 2) * scale,
    y: 88 - (point.latitude! - latMin - latSpan / 2) * scale, point }));
  return <View style={{ gap: 10 }}>
    <View accessible accessibilityRole="image" accessibilityLabel="Recorded GPS route sketch" style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: '#EAF1EB' }}>
      <Svg width="100%" height={176} viewBox="0 0 300 176">
        <Path d="M0 44H300M0 88H300M0 132H300M60 0V176M120 0V176M180 0V176M240 0V176" stroke="#D7E2D9" strokeWidth={1} strokeDasharray="3 5" />
        <Polyline points={plotted.map(point => `${point.x},${point.y}`).join(' ')} stroke="#FFFFFF" strokeWidth={7} fill="none" />
        <Polyline points={plotted.map(point => `${point.x},${point.y}`).join(' ')} stroke={colors.green} strokeWidth={3} fill="none" />
        {plotted.filter((point, index) => point.point.kind === 'reach' || index === 0 || index === plotted.length - 1).map(point => <Circle key={point.point.event_id} cx={point.x} cy={point.y} r={point.point.kind === 'reach' ? 6 : 5} stroke="#FFFFFF" strokeWidth={2} fill={point.point.kind === 'reach' ? colors.orange : colors.green} />)}
      </Svg>
    </View>
    <Text style={{ ...styles.small, fontSize: 11 }}>GPS sketch, not a street map. Orange dots mark stops.</Text>
  </View>;
}
