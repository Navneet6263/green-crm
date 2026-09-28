// Expo TaskManager persists location jobs. Android rejects those jobs without
// this install-time permission; it is not a location permission dialog.
const BOOT_PERMISSION = 'android.permission.RECEIVE_BOOT_COMPLETED';
const normalize = value => value.includes('.') ? value : `android.permission.${value}`;

function assertTrackingPermissions(config) {
  const permissions = (config.android?.permissions ?? []).map(normalize);
  const blocked = (config.android?.blockedPermissions ?? []).map(normalize);
  if (!permissions.includes(BOOT_PERMISSION) || blocked.includes(BOOT_PERMISSION)) {
    throw new Error(`Tracking requires ${BOOT_PERMISSION} in android.permissions, not blockedPermissions. Rebuild the APK; OTA cannot add it.`);
  }
}

function assertTrackingManifest(manifest) {
  const entries = (manifest.manifest?.['uses-permission'] ?? [])
    .filter(entry => entry.$?.['android:name'] === BOOT_PERMISSION);
  if (!entries.length || entries.some(entry =>
    entry.$['tools:node'] === 'remove' || entry.$['tools:node'] === 'removeAll' ||
    entry.$['android:maxSdkVersion'] !== undefined)) {
    throw new Error(`AndroidManifest.xml must request unrestricted ${BOOT_PERMISSION}. Regenerate/update stale native Android sources before building.`);
  }
}

module.exports = { BOOT_PERMISSION, assertTrackingPermissions, assertTrackingManifest };
