import { Image, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, styles } from '../ui/theme';

export function LoginIntro() {
  return <View style={{ gap: 26, paddingTop: 16, paddingHorizontal: 4 }}>
    <View style={styles.spread}>
      <Image source={require('../../assets/greencrm-logo.png')} accessibilityLabel="GreenCRM" accessibilityRole="image"
        resizeMode="contain" style={{ width: 180, height: 33, maxWidth: '70%' }} />
      <View style={{ borderWidth: 1, borderColor: '#BBD1C5', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 }}>
        <Text style={{ color: colors.green, fontSize: 10, letterSpacing: 1, fontWeight: '700' }}>SALES</Text>
      </View>
    </View>
    <View style={[styles.row, { alignItems: 'center', gap: 8 }]}>
      <View style={{ flex: 1, gap: 9 }}>
        <Text style={{ color: colors.ink, fontSize: 32, lineHeight: 37, fontWeight: '700', letterSpacing: -1.2 }}>Your work,{ '\n' }<Text style={{ color: colors.green }}>in focus.</Text></Text>
        <Text style={styles.small}>Leads. Follow-ups. Field visits.</Text>
      </View>
      <View accessible={false} style={{ width: 82, height: 100, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={82} height={100} viewBox="0 0 82 100">
          <Circle cx="42" cy="51" r="37" fill="#C9DFCA" />
          <Path d="M20 72V54c0-7 7-8 14-8h14c10 0 12-6 12-15V20" stroke="#658C72" strokeWidth="2" strokeDasharray="3 5" fill="none" />
          <Circle cx="20" cy="72" r="10" fill="#FFFFFF" stroke="#D5E3DA" />
          <Circle cx="20" cy="72" r="3" fill="#155C46" />
          <Circle cx="60" cy="20" r="16" fill="#155C46" />
          <Path d="m54 20 4 4 8-8" stroke="#EDFACD" strokeWidth="2" fill="none" />
        </Svg>
      </View>
    </View>
  </View>;
}
