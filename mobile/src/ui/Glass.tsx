import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Frosted colour layers on native avoid a live blur pass on every scrolling card.
// Web adds backdrop blur; all platforms retain an opaque-enough readable surface.
export function Glass({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const webBlur = Platform.OS === 'web' ? { backdropFilter: 'blur(18px)' } as ViewStyle : {};
  return <View style={[{ borderRadius: 26, borderWidth: 1, borderColor: '#FFFFFFE6',
    backgroundColor: '#FFFFFFB8', overflow: 'hidden' }, webBlur, style]}>
    <LinearGradient colors={['#FFFFFF85', '#FFFFFF08', '#FFFFFF30']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]} />
    {children}
  </View>;
}

export function GlassBackdrop({ vivid = false }: { vivid?: boolean }) {
  return <View accessible={false} style={[StyleSheet.absoluteFill, { pointerEvents: 'none', overflow: 'hidden' }]}>
    <LinearGradient colors={vivid ? ['#DEEFE9', '#E8F1E6', '#F2F4ED'] : ['#E7F0EB', '#F2F5EF', '#E5EEEA']}
      style={StyleSheet.absoluteFill} />
    <LinearGradient colors={['#A9D7C34A', '#BDE6CF05']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ position: 'absolute', width: 330, height: 380, borderRadius: 170, right: -100, top: vivid ? 80 : -140, transform: [{ rotate: '30deg' }] }} />
    <LinearGradient colors={['#EDD99330', '#EEE4B805']} style={{ position: 'absolute', width: 300, height: 320, borderRadius: 160, left: -160, top: vivid ? 380 : 240 }} />
  </View>;
}
