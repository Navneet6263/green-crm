import { ActivityIndicator, Image, Text, View } from 'react-native';
import { colors, styles } from './theme';

export function Brand({ centered = false }: { centered?: boolean }) {
  return <View style={{ gap: 12, alignItems: centered ? 'center' : 'flex-start' }}>
    <Image source={require('../../assets/greencrm-logo.png')} accessibilityLabel="GreenCRM" accessibilityRole="image"
      resizeMode="contain" style={{ width: 230, height: 42, maxWidth: '100%' }} />
    <Text style={[styles.eyebrow, { fontSize: 10, letterSpacing: 3 }]}>SALES WORKSPACE</Text>
  </View>;
}

export function BrandedLoading() {
  return <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 32 }}>
    <Brand centered />
    <View accessibilityRole="progressbar" accessibilityLabel="Opening your workspace" style={{ alignItems: 'center', gap: 12 }}>
      <ActivityIndicator size="small" color={colors.green} />
      <Text style={styles.small}>Opening your workspace…</Text>
    </View>
  </View>;
}
