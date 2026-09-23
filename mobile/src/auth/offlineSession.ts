import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from '../api/types';
import { API_BASE } from '../api/runtime';
const KEY = 'greencrm.offline.identity.v1';
export async function cacheVerifiedSession(session: Session) {
  if (Platform.OS === 'web') return;
  const { user_id, company_id, name, email, role } = session.user;
  await SecureStore.setItemAsync(KEY, JSON.stringify({ base: API_BASE, verifiedAt: Date.now(), session: {
    token: session.token, user: { user_id, company_id, name, email, role },
    company: session.company ? { company_id: session.company.company_id, name: session.company.name } : null,
  } }), { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
}
export async function loadOfflineSession(): Promise<Session | null> {
  if (Platform.OS === 'web') return null;
  const value = await SecureStore.getItemAsync(KEY);
  if (!value) return null;
  try {
    const saved = JSON.parse(value);
    if (saved.base !== API_BASE || saved.session?.user?.role !== 'sales' || !saved.session.user.company_id || !saved.session.user.user_id || !saved.session.token || !Number.isFinite(saved.verifiedAt) || Date.now() - saved.verifiedAt > 12 * 3600000 || saved.verifiedAt > Date.now()) return null;
    return saved.session;
  } catch { return null; }
}
export async function clearOfflineSession() { if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(KEY); }
