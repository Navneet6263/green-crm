import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { BOOT_PERMISSION, assertTrackingPermissions, assertTrackingManifest } = require('../plugins/tracking-permissions.cjs');
const manifest = (attributes: Record<string, string>[] = []) => ({
  manifest: { 'uses-permission': attributes.map($ => ({ $ })) },
});

test('tracking config requires persisted-job permission and rejects blocked aliases', () => {
  const { expo } = JSON.parse(readFileSync('app.json', 'utf8'));
  assert.doesNotThrow(() => assertTrackingPermissions(expo));
  assert.equal(expo.version, '0.1.6');
  assert.ok(expo.android.versionCode >= 7);
  assert.throws(() => assertTrackingPermissions({}), /RECEIVE_BOOT_COMPLETED/);
  for (const blocked of [BOOT_PERMISSION, 'RECEIVE_BOOT_COMPLETED']) {
    assert.throws(() => assertTrackingPermissions({ android: {
      permissions: [BOOT_PERMISSION], blockedPermissions: [blocked],
    } }), /RECEIVE_BOOT_COMPLETED/);
  }
});

test('stale or restricted native manifests fail instead of shipping another crashing APK', () => {
  const permission = { 'android:name': BOOT_PERMISSION };
  assert.doesNotThrow(() => assertTrackingManifest(manifest([permission])));
  assert.throws(() => assertTrackingManifest(manifest()), /AndroidManifest.xml/);
  const restrictions: Record<string, string>[] = [
    { 'tools:node': 'remove' }, { 'tools:node': 'removeAll' }, { 'android:maxSdkVersion': '32' },
  ];
  for (const restriction of restrictions) {
    assert.throws(() => assertTrackingManifest(manifest([{ ...permission, ...restriction }])), /AndroidManifest.xml/);
  }
});

test('real Expo Android manifest includes boot permission without changing app identity or enabling microphone', () => {
  // Introspection executes Android manifest mods without creating native folders.
  const output = execFileSync(process.execPath, [
    'node_modules/expo/bin/cli', 'config', '--type', 'introspect', '--json',
  ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, env: { ...process.env, EXPO_NO_DOTENV: '1' } });
  const config = JSON.parse(output);
  assert.equal(config.android.package, 'com.greencall.field.dev');
  const generated = config._internal.modResults.android.manifest;
  assertTrackingManifest(generated);
  const permissions = generated.manifest['uses-permission'];
  for (const name of ['ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'FOREGROUND_SERVICE_LOCATION']) {
    assert.ok(permissions.some((entry: any) => entry.$['android:name'] === `android.permission.${name}` && entry.$['tools:node'] !== 'remove'));
  }
  assert.ok(permissions.some((entry: any) => entry.$['android:name'] === 'android.permission.RECORD_AUDIO' && entry.$['tools:node'] === 'remove'));
});
