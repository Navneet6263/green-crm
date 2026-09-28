// EAS runs this after dependency installation, including builds with native folders.
const path = require('node:path');
const fs = require('node:fs');
const { AndroidConfig } = require('expo/config-plugins');
const { getConfig } = require('expo/config');
const { patchLocation } = require('../plugins/patch-location.cjs');
const { assertTrackingPermissions, assertTrackingManifest } = require('../plugins/tracking-permissions.cjs');
const pkg = require('../package.json');

async function main() {
  const root = path.resolve(__dirname, '..');
  assertTrackingPermissions(getConfig(root).exp);
  // EAS skips prebuild when native folders exist: fail on a stale manifest too.
  const manifestPath = path.join(root, 'android/app/src/main/AndroidManifest.xml');
  if (fs.existsSync(path.join(root, 'android'))) {
    assertTrackingManifest(await AndroidConfig.Manifest.readAndroidManifestAsync(manifestPath));
  }
  if (!pkg.expo?.autolinking?.android?.buildFromSource?.includes('expo-location')) {
    throw new Error('expo-location must build from source or the tracking safety patch will be ignored.');
  }
  patchLocation(root);
  console.log('Tracking safety: persisted-job permission verified; native sources patched; expo-location forced to build from source.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
