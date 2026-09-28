import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import type { RouteMapProps } from './RouteMap';
import { mapSegments } from './routeModel';
import { Button } from '../ui/components';
import { colors, styles } from '../ui/theme';
import { when } from '../ui/format';

function MapCanvas({ route, selectedStop, onSelectStop, expanded = false }: RouteMapProps & { expanded?: boolean }) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const fitted = useRef(false);
  const segments = useMemo(() => mapSegments(route.segments), [route]);
  // Keep native marker load bounded; older visits remain in the paginated log.
  const stops = useMemo(() => route.stops.filter(stop => stop.coordinate), [route]);
  const markers = stops.slice(-100);
  const selected = stops.find(stop => stop.event.event_id === selectedStop);
  if (selected && !markers.includes(selected)) markers.push(selected);
  const frame = () => {
    const coordinates = [...segments.flat(), ...markers.map(stop => stop.coordinate!), ...(route.first ? [route.first] : []), ...(route.last ? [route.last] : [])];
    if (coordinates.length === 1) map.current?.animateToRegion({ ...coordinates[0], latitudeDelta: 0.008, longitudeDelta: 0.008 }, 300);
    else if (coordinates.length) map.current?.fitToCoordinates(coordinates, { edgePadding: { top: 55, right: 45, bottom: 65, left: 45 }, animated: true });
  };
  useEffect(() => {
    if (ready && route.first && !fitted.current) { fitted.current = true; frame(); }
  }, [ready, route.first]);
  useEffect(() => {
    if (ready && selected?.coordinate) map.current?.animateToRegion({ ...selected.coordinate, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 300);
  }, [ready, selectedStop]);
  const initial = route.first || route.last;
  return <View style={{ flex: expanded ? 1 : undefined, gap: 10 }}>
    <View style={{ height: expanded ? undefined : 300, flex: expanded ? 1 : undefined, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.mint }}>
      <MapView ref={map} style={{ flex: 1 }} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        mapType="standard" showsUserLocation={false} showsMyLocationButton={false}
        showsTraffic={false} showsBuildings={false} showsIndoors={false} toolbarEnabled={false}
        initialRegion={initial ? { ...initial, latitudeDelta: 0.012, longitudeDelta: 0.012 } : undefined}
        onMapReady={() => setReady(true)}>
        {segments.map((points, index) => <Polyline key={index} coordinates={points} strokeWidth={4} strokeColor={colors.green} geodesic={false} />)}
        {route.first ? <Marker identifier="route-start" coordinate={route.first} title="First recorded location" pinColor={colors.green} /> : null}
        {route.last ? <Marker identifier="route-latest" coordinate={route.last} title="Latest recorded location" pinColor="#2878C8" /> : null}
        {markers.map(stop => <Marker key={stop.event.event_id} identifier={stop.event.event_id} coordinate={stop.coordinate!}
          title={`${stop.number}. ${stop.event.label || 'Visited location'}`} description={when(stop.event.captured_at)}
          onPress={() => onSelectStop(stop.event.event_id)} tracksViewChanges={false}>
          <View collapsable={false} style={{ minWidth: 34, height: 34, paddingHorizontal: 7, borderRadius: 17, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>{stop.number}</Text>
          </View>
        </Marker>)}
      </MapView>
    </View>
    <View style={styles.row}><View style={{ flex: 1 }}><Button title="Fit route" secondary onPress={frame} disabled={!route.first} /></View>
      <View style={{ flex: 1 }}><Button title="Latest location" secondary disabled={!route.last} onPress={() => {
        if (route.last) map.current?.animateToRegion({ ...route.last, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 300);
      }} /></View></View>
    {selected ? <Text style={styles.small}>{selected.number}. {selected.event.label || 'Visited location'} · {when(selected.event.captured_at)}</Text> : null}
  </View>;
}

export function RouteMap(props: RouteMapProps) {
  const [expanded, setExpanded] = useState(false);
  if (Platform.OS === 'android' && !Constants.expoConfig?.extra?.androidGoogleMapsConfigured) return <View style={{ padding: 18, gap: 8, backgroundColor: colors.sand, borderRadius: 16 }}>
    <Text style={styles.heading}>Map setup pending</Text><Text style={styles.small}>Add the Android Maps SDK key and rebuild the APK. Tracking and check-ins still work.</Text>
  </View>;
  if (!props.route.first) return <View style={{ padding: 24, minHeight: 150, justifyContent: 'center', gap: 8, backgroundColor: colors.mint, borderRadius: 16 }}>
    <Text style={styles.heading}>Waiting for a clear GPS location</Text><Text style={styles.small}>Your street map and route will appear here.</Text>
  </View>;
  return <View style={{ gap: 10 }}>
    {!expanded ? <MapCanvas {...props} /> : null}
    <Button title="Full-screen map" secondary onPress={() => setExpanded(true)} />
    <Text style={{ ...styles.small, fontSize: 11 }}>GPS route · Map needs internet. Latest 100 visit pins; all saved visits are in the log.</Text>
    {props.route.segments.filter(segment => segment.length > 1).length > 128 ? <Text style={styles.small}>Many GPS gaps: map shows the latest 128 route sections. Distance uses all available sections.</Text> : null}
    <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.white, padding: 16, gap: 12 }}>
        <Button title="Back to tracker" secondary onPress={() => setExpanded(false)} />
        {expanded ? <MapCanvas {...props} expanded /> : null}
      </SafeAreaView>
    </Modal>
  </View>;
}
