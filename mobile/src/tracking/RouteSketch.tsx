import { Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import type { TrackEvent } from './types';
import { styles, colors } from '../ui/theme';
export function RouteSketch({ events }: { events: TrackEvent[] }) {
  const points = events.filter(event => event.latitude !== undefined && event.longitude !== undefined);
  if (!points.length) return <Text style={styles.small}>Your route appears after the first GPS fix.</Text>;
  const lat = points.map(point => point.latitude!), lng = points.map(point => point.longitude!);
  const latMin = Math.min(...lat), lngMin = Math.min(...lng);
  const latSpan = Math.max(0.0001, Math.max(...lat) - latMin), lngSpan = Math.max(0.0001, Math.max(...lng) - lngMin);
  const plotted = points.map(point => ({ x: 20 + (point.longitude! - lngMin) / lngSpan * 260, y: 170 - (point.latitude! - latMin) / latSpan * 140, point }));
  return <View style={{ gap: 8 }}><Svg width="100%" height={190} viewBox="0 0 300 190">
    <Polyline points={plotted.map(point => `${point.x},${point.y}`).join(' ')} stroke={colors.green} strokeWidth={3} fill="none" />
    {plotted.filter((point, index) => point.point.kind === 'reach' || index === 0 || index === plotted.length - 1).map(point => <Circle key={point.point.event_id} cx={point.x} cy={point.y} r={point.point.kind === 'reach' ? 6 : 4} fill={point.point.kind === 'reach' ? colors.orange : colors.green} />)}
  </Svg><Text style={styles.small}>Offline route sketch, not a street map. Orange dots are your manual reached check-ins. Shows up to 500 locally retained events.</Text></View>;
}
