// Web fallback: deliberately does not load Google's billable JavaScript Maps API.
import { Text, View } from 'react-native';
import type { RouteModel } from './routeModel';
import { styles } from '../ui/theme';
export type RouteMapProps = { route: RouteModel; selectedStop?: string; onSelectStop: (id: string) => void };
export function RouteMap(_props: RouteMapProps) {
  return <View style={{ minHeight: 180, padding: 20, justifyContent: 'center', backgroundColor: '#EAF1EB', borderRadius: 16 }}>
    <Text style={styles.heading}>Route map is available in the mobile app.</Text>
    <Text style={styles.small}>Browser preview does not load a paid web map.</Text>
  </View>;
}
