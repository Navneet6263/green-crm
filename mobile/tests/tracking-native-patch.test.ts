import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transform, hashes } = require('../plugins/patch-location.cjs');

test('version-checked Android patch is repeatable and fails on changed source', () => {
  for (const name of Object.keys(hashes)) {
    const original = readFileSync(`node_modules/expo-location/android/src/main/java/expo/modules/location/${name}`, 'utf8');
    const patched = transform(name, original);
    assert.equal(transform(name, patched), patched);
    assert.equal(transform(name, patched.replace(/\n/g, '\r\n')), patched);
    assert.throws(() => transform(name, `${patched}\n// unexpected change`), /refused changed Expo source/);
    if (name.includes('Consumer')) {
      assert.match(patched, /context\.startService\(serviceIntent\)/);
      assert.doesNotMatch(patched, /context\.startForegroundService\(/);
      assert.match(patched, /mServiceConnection !== this/);
      assert.match(patched, /context\.unbindService\(connection\)/);
      assert.match(patched, /failGreenCrmService\(error\)/);
      assert.match(patched, /boundService\.startForeground\(serviceOptions\)\s+startLocationUpdates\(\)/);
    }
    if (name.includes('TaskService')) {
      assert.match(patched, /ic_menu_mylocation/);
      assert.match(patched, /override fun onDestroy\(\) \{\s+greenCrmForegroundActive = false/);
    }
    if (name === 'LocationModule.kt') assert.match(patched, /getGreenCrmServiceHealthAsync/);
  }
});

test('Android safety patch is included in prebuild, with a new installable version', () => {
  const { expo } = JSON.parse(readFileSync('app.json', 'utf8'));
  assert.ok(expo.plugins.includes('./plugins/withTrackingSafety.cjs'));
  assert.equal(expo.android.package, 'com.greencall.field.dev');
  assert.ok(expo.android.versionCode >= 2);
});
