import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLogin } from '../src/auth/useLogin';
import { LoginIntro } from '../src/auth/LoginIntro';
import { Button, Notice } from '../src/ui/components';
import { Field } from '../src/ui/fields';
import { Icon } from '../src/ui/Icon';
import { colors, styles } from '../src/ui/theme';
import { Glass, GlassBackdrop } from '../src/ui/Glass';

export default function Login() {
  const form = useLogin();
  const [visible, setVisible] = useState(false);
  const enteringCode = form.mode === 'otp' && Boolean(form.challenge);
  const title = form.mode === 'password' ? 'Sign in' : enteringCode ? 'Verify & sign in' : 'Send login code';
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }}>
    <GlassBackdrop vivid />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, gap: 24 }}>
        <LoginIntro />
        <Glass style={{ gap: 17, padding: 20, borderRadius: 28 }}>
          <View style={{ gap: 5 }}><Text accessibilityRole="header" style={[styles.title, { fontSize: 24 }]}>Welcome back</Text><Text style={styles.small}>Let's get you signed in.</Text></View>
          <View style={{ flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: '#E5EDE8' }}>
            {(['password', 'otp'] as const).map(mode => <Pressable key={mode} accessibilityRole="tab"
              accessibilityState={{ selected: form.mode === mode, disabled: form.busy }} disabled={form.busy}
              onPress={() => form.changeMode(mode)} style={{ flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: form.mode === mode ? 'white' : 'transparent' }}>
              <Text style={{ color: form.mode === mode ? colors.green : colors.muted, fontSize: 13, fontWeight: '700' }}>{mode === 'password' ? 'Password' : 'Email OTP'}</Text>
            </Pressable>)}
          </View>
          {form.error ? <Notice message={form.error} error /> : null}
          <Field label="Work email" value={form.email} onChangeText={form.setEmail} keyboardType="email-address"
            autoCapitalize="none" autoCorrect={false} autoComplete="email" placeholder="you@company.com" editable={!form.busy && !enteringCode} />
          {form.mode === 'password' ? <View style={{ gap: 4 }}>
            <Field label="Password" value={form.password} onChangeText={form.setPassword} secureTextEntry={!visible}
              autoComplete="current-password" placeholder="Enter your password" editable={!form.busy} onSubmitEditing={() => void form.submit()} />
            <Pressable accessibilityRole="button" disabled={form.busy} onPress={() => setVisible(!visible)} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: colors.green, fontWeight: '600', fontSize: 12 }}>{visible ? 'Hide password' : 'Show password'}</Text>
            </Pressable>
          </View> : enteringCode ? <View style={{ gap: 12 }}>
            <Text accessibilityLiveRegion="polite" style={styles.small}>If your sales account is active, check your email for a 6-digit code.</Text>
            <Field label="Login code" value={form.code} onChangeText={value => form.setCode(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} autoCorrect={false}
              placeholder="000000" editable={!form.busy} onSubmitEditing={() => void form.submit()} />
            {form.expired ? <Text style={{ color: colors.red }}>Code expired. Request a new one.</Text> : null}
            <View style={styles.spread}>
              <Pressable accessibilityRole="button" onPress={form.changeEmail} disabled={form.busy} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.green }}>Change email</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Resend code" disabled={form.busy || form.remaining > 0}
                onPress={() => void form.sendCode()} style={{ minHeight: 44, justifyContent: 'center', opacity: form.remaining > 0 ? 0.55 : 1 }}>
                <Text style={{ color: colors.green }}>{form.remaining > 0 ? `Resend in ${form.remaining}s` : 'Resend code'}</Text>
              </Pressable>
            </View>
          </View> : <Text style={styles.small}>Use a one-time code instead of your password.</Text>}
          <Button title={title} icon="arrow" loading={form.busy} disabled={enteringCode ? form.expired || form.code.length !== 6 : form.mode === 'otp' && form.remaining > 0} onPress={() => void form.submit()} />
          {form.busy ? <Text accessibilityLiveRegion="polite" style={[styles.small, { textAlign: 'center' }]}>{form.mode === 'otp' && !enteringCode ? 'Requesting your code…' : 'Please wait…'}</Text> : null}
          {form.mode === 'otp' && !enteringCode && form.remaining > 0 ? <Text style={styles.small}>You can request another code in {form.remaining}s.</Text> : null}
        </Glass>
        <View style={{ marginTop: 'auto', gap: 8, paddingTop: 2, paddingBottom: 8 }}>
          <View style={[styles.row, { justifyContent: 'center' }]}><Icon name="lock" size={13} /><Text style={styles.small}>Your workspace. Securely connected.</Text></View>
          <Text style={[styles.small, { textAlign: 'center', fontSize: 11 }]}>Need access? Contact your CRM administrator.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
