import { useEffect, useRef, useState } from 'react';
import { useSession } from './SessionProvider';
import { requestEmailOtp, type OtpChallenge } from '../api/emailOtp';

export function useLogin() {
  const { signIn, signInWithOtp } = useSession();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [retryAt, setRetryAt] = useState(0), [expiresAt, setExpiresAt] = useState(0), [now, setNow] = useState(Date.now());
  const lock = useRef(false), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!retryAt && !expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [retryAt, expiresAt]);
  const remaining = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const expired = Boolean(challenge && now >= expiresAt);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Sign in failed. Please retry.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const sendCode = () => run(async () => {
    if (Date.now() < retryAt) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter a valid work email.');
    const next = await requestEmailOtp(email);
    if (!mounted.current) return;
    const time = Date.now(); setNow(time); setCode(''); setChallenge(next);
    setRetryAt(time + next.retry_after * 1000); setExpiresAt(time + next.expires_in * 1000);
  });
  const submit = () => {
    if (mode === 'otp' && !challenge) return sendCode();
    return run(async () => {
      if (mode === 'password') {
        if (!email.trim() || !password) throw new Error('Enter your work email and password.');
        await signIn(email, password);
      } else {
        if (!challenge || expired) throw new Error('This code has expired. Request a new one.');
        if (!/^\d{6}$/.test(code)) throw new Error('Enter the 6-digit code from your email.');
        await signInWithOtp(email, challenge.challenge_id, code);
      }
      if (mounted.current) { setPassword(''); setCode(''); }
    });
  };
  const changeMode = (next: 'password' | 'otp') => { if (!lock.current) { setMode(next); setError(''); setPassword(''); setCode(''); } };
  const changeEmail = () => { if (!lock.current) { setChallenge(null); setCode(''); setError(''); setExpiresAt(0); } };
  const updateEmail = (value: string) => { setEmail(value); setChallenge(null); setCode(''); setExpiresAt(0); };
  return { mode, changeMode, email, setEmail: updateEmail, password, setPassword, code, setCode, challenge,
    busy, error, remaining, expired, submit, sendCode, changeEmail };
}
