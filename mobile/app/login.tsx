import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/auth/SessionProvider';
import { API_BASE } from '../src/api/runtime';
import { Button, Notice } from '../src/ui/components';
import { Field } from '../src/ui/fields';
import { Icon } from '../src/ui/Icon';
import { colors, styles } from '../src/ui/theme';

export default function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const submit = async () => {
    if (lock.current) return;
    if (!email.trim() || !password) { setError('Enter your work email and password.'); return; }
    lock.current = true; setBusy(true); setError('');
    try { await signIn(email, password); setPassword(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Sign in failed.'); }
    finally { lock.current = false; setBusy(false); }
  };
  let server = API_BASE;
  try { server = new URL(API_BASE).host; } catch { /* API client validates configuration. */ }
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: 24, gap: 28 }}>
        <View style={[styles.row, { paddingTop: 16 }]}><View style={{ backgroundColor: colors.green, borderRadius: 16, padding: 13 }}><Icon name="leads" color="white" size={26} /></View>
          <View><Text style={{ fontSize: 23, color: colors.ink, fontWeight: '800', letterSpacing: -0.7 }}>GreenCRM</Text><Text style={[styles.eyebrow, { marginTop: 4 }]}>SALES WORKSPACE</Text></View>
        </View>
        <LinearGradient colors={['#113E30', '#1C6248']} style={{ borderRadius: 28, padding: 26, gap: 16, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 30, borderColor: '#FFFFFF08', right: -80, top: -65 }} />
          <View style={styles.row}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#BCE69A' }} /><Text style={{ color: '#D2E5D9', letterSpacing: 2, fontSize: 10, fontWeight: '700' }}>BUILT FOR YOUR WORKDAY</Text></View>
          <Text style={{ color: 'white', fontSize: 34, fontWeight: '800', lineHeight: 40, letterSpacing: -1 }}>Your next sale.{ '\n' }Starts here.</Text>
          <Text style={{ color: '#D4E6DB', fontSize: 14, lineHeight: 22 }}>Your leads, your follow-ups, your tasks.{ '\n' }Connected to the CRM you already use.</Text>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: '#FFFFFF22', paddingTop: 16 }]}><Icon name="lock" size={16} color="#D2E5D9" /><Text style={{ color: '#D2E5D9', fontSize: 12 }}>Your company. Your assigned work.</Text></View>
        </LinearGradient>
        <View style={{ gap: 18 }}>
          <View style={{ gap: 6 }}><Text style={[styles.title, { fontSize: 26 }]}>Welcome back</Text><Text style={styles.subtitle}>Sign in with your sales account to get started.</Text></View>
          {error ? <Notice message={error} error /> : null}
          <Field label="Work email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="you@company.com" editable={!busy} />
          <View style={{ gap: 5 }}><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry={!visible}
            autoComplete="current-password" placeholder="Enter your password" editable={!busy} onSubmitEditing={() => void submit()} />
            <Pressable accessibilityRole="button" onPress={() => setVisible(!visible)} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.green, fontWeight: '600', fontSize: 12 }}>{visible ? 'Hide password' : 'Show password'}</Text></Pressable>
          </View>
          <Button title="Sign in" icon="arrow" loading={busy} onPress={() => void submit()} />
          <Text style={[styles.small, { textAlign: 'center' }]}>Need access or a password reset?{ '\n' }Contact your company's CRM administrator.</Text>
        </View>
        <View style={{ gap: 5, marginTop: 'auto', paddingTop: 12 }}><Text style={[styles.small, { textAlign: 'center' }]}>CRM server · {server}</Text>
          {Platform.OS === 'web' ? <Text style={[styles.small, { textAlign: 'center' }]}>Browser sessions end on refresh. No token is saved in browser storage.</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
