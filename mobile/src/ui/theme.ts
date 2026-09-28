import { StyleSheet } from 'react-native';

export const colors = {
  ink: '#17352D', muted: '#526A60', green: '#155C46', mint: '#E0EDE3',
  canvas: '#EDF3EE', white: '#FFFFFF', line: '#D5E2D9', orange: '#9E5916',
  sand: '#FFF3DC', red: '#B43D43', error: '#FCECEE', navy: '#113D30',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 16, paddingBottom: 28 },
  title: { fontSize: 29, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  card: { padding: 16, borderRadius: 20, backgroundColor: '#FFFFFFB8', borderWidth: 1, borderColor: '#FFFFFFE6', gap: 12 },
  input: { minHeight: 50, padding: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white, color: colors.ink, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
});
