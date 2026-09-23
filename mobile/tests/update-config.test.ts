import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { expo } = JSON.parse(readFileSync('app.json', 'utf8'));
const eas = JSON.parse(readFileSync('eas.json', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const nativeVersions = JSON.parse(readFileSync('node_modules/expo/bundledNativeModules.json', 'utf8'));

test('OTA points to the linked Expo project and uses native-runtime fingerprint compatibility', () => {
  assert.match(expo.extra.eas.projectId, /^[0-9a-f-]{36}$/i);
  assert.equal(expo.updates.url, `https://u.expo.dev/${expo.extra.eas.projectId}`);
  assert.deepEqual(expo.runtimeVersion, { policy: 'fingerprint' });
  assert.equal(pkg.dependencies['expo-updates'], nativeVersions['expo-updates']);
});

test('preview APK receives only preview-channel updates with the preview build environment', () => {
  assert.equal(eas.build.preview.channel, 'preview');
  assert.equal(eas.build.preview.environment, 'preview');
  assert.equal(eas.build.preview.distribution, 'internal');
  assert.equal(eas.build.preview.android.buildType, 'apk');
  assert.notEqual(eas.build.preview.developmentClient, true);
});

test('offline launch retains the embedded app and never waits for an OTA download', () => {
  assert.equal(expo.updates.enabled, true);
  assert.equal(expo.updates.useEmbeddedUpdate, true);
  assert.equal(expo.updates.checkAutomatically, 'ON_LOAD');
  assert.equal(expo.updates.fallbackToCacheTimeout, 0);
  assert.notEqual(expo.updates.disableAntiBrickingMeasures, true);
});
