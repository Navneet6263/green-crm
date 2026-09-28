import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const configure = require('../app.config.js');
const { expo } = JSON.parse(readFileSync('app.json', 'utf8'));

test('Android cloud build fails early without a map key; local preview keeps a safe fallback', context => {
  const oldKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY, oldPlatform = process.env.EAS_BUILD_PLATFORM;
  context.after(() => {
    if (oldKey === undefined) delete process.env.GOOGLE_MAPS_ANDROID_API_KEY; else process.env.GOOGLE_MAPS_ANDROID_API_KEY = oldKey;
    if (oldPlatform === undefined) delete process.env.EAS_BUILD_PLATFORM; else process.env.EAS_BUILD_PLATFORM = oldPlatform;
  });
  delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  delete process.env.EAS_BUILD_PLATFORM;
  assert.equal(configure({ config: expo }).extra.androidGoogleMapsConfigured, false);
  process.env.EAS_BUILD_PLATFORM = 'android';
  assert.throws(() => configure({ config: expo }), /GOOGLE_MAPS_ANDROID_API_KEY/);
  process.env.EAS_BUILD_PLATFORM = 'ios';
  assert.doesNotThrow(() => configure({ config: expo }));
});

test('Expo puts the Android key into the native manifest while iOS stays on Apple Maps', () => {
  const config = JSON.parse(execFileSync(process.execPath, [
    'node_modules/expo/bin/cli', 'config', '--type', 'introspect', '--json',
  ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, EXPO_NO_DOTENV: '1', GOOGLE_MAPS_ANDROID_API_KEY: 'test-not-a-live-key' } }));
  const application = config._internal.modResults.android.manifest.manifest.application[0];
  const key = application['meta-data'].find((item: any) => item.$['android:name'] === 'com.google.android.geo.API_KEY');
  assert.equal(key.$['android:value'], 'test-not-a-live-key');
  assert.equal(config.extra.androidGoogleMapsConfigured, true);
  const plugin = config.plugins.find((entry: any) => Array.isArray(entry) && entry[0] === 'react-native-maps');
  assert.equal(plugin[1].iosGoogleMapsApiKey, undefined);
});

test('native map never opts into a Map ID or paid route/place requests; web does not load a map SDK', () => {
  const native = readFileSync('src/tracking/RouteMap.native.tsx', 'utf8');
  const model = readFileSync('src/tracking/routeModel.ts', 'utf8');
  const web = readFileSync('src/tracking/RouteMap.tsx', 'utf8');
  assert.doesNotMatch(native, /googleMapId\s*=|mapId\s*=|fetch\(|axios|maps\.googleapis/);
  assert.doesNotMatch(model, /fetch\(|axios|https:\/\//);
  assert.doesNotMatch(web, /from ['"]react-native-maps|maps\.googleapis|@googlemaps/);
  assert.match(native, /showsUserLocation=\{false\}/); // Map does not start an independent GPS watcher.
  assert.match(native, /androidGoogleMapsConfigured/);
});
