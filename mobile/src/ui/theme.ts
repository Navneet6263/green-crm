import { StyleSheet } from 'react-native';

export const colors = {
  ink: '#142E29', muted: '#647771', green: '#167453', mint: '#E8F5ED',
  canvas: '#F4F7F5', white: '#FFFFFF', line: '#E2EAE5', orange: '#9E5916',
  sand: '#FFF3DC', red: '#B43D43', error: '#FCECEE', navy: '#113D30',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 20, paddingBottom: 40 },
  title: { fontSize: 29, fontWeight: '800', color: colors.ink, letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  body: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  small: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  card: { padding: 18, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, gap: 12 },
  input: { minHeight: 52, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, color: colors.ink, fontSize: 16 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
});
