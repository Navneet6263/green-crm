import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_BASE } from '../api/runtime';

const KEY = 'greencrm.mobile.session.v1';
export const forgetToken = () => Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(KEY);
export const saveToken = (token: string) => {
  // Browser sessions live only in SessionProvider memory, never web storage.
  if (Platform.OS === 'web') return Promise.resolve();
  return SecureStore.setItemAsync(KEY, JSON.stringify({ token, base: API_BASE }), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
};
export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value.base === API_BASE && typeof value.token === 'string' && value.token) return value.token;
  } catch { /* Corrupted or outdated storage must not create a session. */ }
  await forgetToken();
  return null;
}
