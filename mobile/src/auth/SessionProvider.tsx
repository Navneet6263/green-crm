import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';
import { ApiError } from '../api/client';
import * as crm from '../api/crm';
import { verifyEmailOtp } from '../api/emailOtp';
import { onSessionExpired, request } from '../api/runtime';
import type { Session } from '../api/types';
import { forgetToken, loadToken, saveToken } from './storage';
import { cacheVerifiedSession, clearOfflineSession, loadOfflineSession } from './offlineSession';
import { nativeTracking, stopTracking } from '../tracking/engine';

type Auth = {
  session: Session | null; restoring: boolean; restoreError: string;
  restore: () => Promise<void>; signIn: (email: string, password: string) => Promise<void>;
  signInWithOtp: (email: string, challengeId: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
const assertSales = (role: string) => { if (role !== 'sales') throw new ApiError('Sign in with a sales account. Managers and admins can use the web CRM.', 403); };
async function invalidateSession() {
  // Attempt all cleanup even when the GPS service or one storage call fails.
  const results = await Promise.allSettled([nativeTracking ? stopTracking('Session access expired') : Promise.resolve(), forgetToken(), clearOfflineSession()]);
  if (results.some(result => result.status === 'rejected')) throw new Error('Session cleanup needs attention.');
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const current = useRef<Session | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [restoreError, setRestoreError] = useState('');
  const assign = useCallback((value: Session | null) => { current.current = value; setSession(value); }, []);
  const restore = useCallback(async () => {
    setRestoring(true); setRestoreError('');
    try {
      const token = await loadToken();
      if (!token) return;
      const result = await crm.profile(token);
      assertSales(result.user.role);
      await cacheVerifiedSession({ ...result, token });
      assign({ ...result, token });
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        assign(null);
        try { await invalidateSession(); }
        catch { setRestoreError('Your session is no longer valid, but saved login could not be cleared. Please retry.'); }
      } else {
        const cached = error instanceof ApiError && error.status === 0 ? await loadOfflineSession().catch(() => null) : null;
        if (cached) assign({ ...cached, offline: true });
        else setRestoreError(error instanceof Error ? error.message : 'Cannot restore your session.');
      }
    } finally { setRestoring(false); }
  }, [assign]);

  useEffect(() => {
    void restore();
    onSessionExpired(token => {
      if (current.current?.token !== token) return;
      assign(null);
      void invalidateSession()
        .catch(() => Alert.alert('Tracking/storage warning', 'Open the app and stop tracking. Pending locations remain on this device; do not clear app data before uploading.'));
      Alert.alert('Session expired', 'Please sign in again.');
    });
    return () => onSessionExpired(undefined);
  }, [assign, restore]);

  const completeSignIn = async (result: Session) => {
    assertSales(result.user.role);
    if (nativeTracking) await stopTracking('Signed in again');
    await saveToken(result.token);
    await cacheVerifiedSession(result);
    assign(result); setRestoreError('');
  };
  const signIn = async (email: string, password: string) => completeSignIn(await crm.login(email, password));
  const signInWithOtp = async (email: string, challengeId: string, code: string) => completeSignIn(await verifyEmailOtp(email, challengeId, code));
  const signOut = async () => {
    const previous = current.current;
    if (nativeTracking) await stopTracking('Signed out');
    await clearOfflineSession();
    await forgetToken();
    assign(null); setRestoreError('');
    if (previous) {
      try { await request('/auth/logout', previous.token, {}); }
      catch { Alert.alert('Signed out on this phone', 'Server session revocation could not be confirmed. Your token was removed from this device.'); }
    }
  };
  return <Context.Provider value={{ session, restoring, restoreError, restore, signIn, signInWithOtp, signOut }}>{children}</Context.Provider>;
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('SessionProvider is missing.');
  return value;
}
