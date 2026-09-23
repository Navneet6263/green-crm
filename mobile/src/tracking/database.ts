import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { TRACKING_SCHEMA } from './schema';
const KEY_NAME = 'greencrm.tracking.cipher.v1', DB_NAME = 'greencrm-field-encrypted.db';
let cipherKey = '';
let connection: Promise<SQLite.SQLiteDatabase> | undefined;
export async function trackingStoreExists() { return Boolean(await SecureStore.getItemAsync(KEY_NAME)); }
export function trackingDb() {
  if (!connection) connection = open().catch(error => { connection = undefined; throw error; });
  return connection;
}
async function open() {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) throw new Error('Encrypted tracking needs a new native development build. Expo Go and browser tracking are not supported.');
    let key = await SecureStore.getItemAsync(KEY_NAME);
    if (!key) {
      key = Array.from(await Crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, '0')).join('');
      await SecureStore.setItemAsync(KEY_NAME, key, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
    }
    if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Tracking encryption key is unavailable. Do not clear app data while uploads are pending.');
    cipherKey = key;
    await db.execAsync(`PRAGMA key = "x'${key}'"; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`);
    await db.execAsync(TRACKING_SCHEMA);
    return db;
  } catch (error) { await db.closeAsync(); throw error; }
}
export async function trackingTransaction(action: (db: SQLite.SQLiteDatabase) => Promise<void>) {
  await trackingDb();
  // Expo's exclusive transaction opens a new connection without the SQLCipher key.
  // Explicitly key each isolated connection before BEGIN; never use plaintext fallback.
  const tx = await SQLite.openDatabaseAsync(DB_NAME, { useNewConnection: true });
  let begun = false;
  try {
    await tx.execAsync(`PRAGMA key = "x'${cipherKey}'"; PRAGMA busy_timeout = 5000; BEGIN IMMEDIATE;`); begun = true;
    await action(tx); await tx.execAsync('COMMIT'); begun = false;
  } catch (error) { if (begun) await tx.execAsync('ROLLBACK').catch(() => {}); throw error; }
  finally { await tx.closeAsync(); }
}
