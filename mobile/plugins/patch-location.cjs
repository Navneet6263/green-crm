// Temporary, version-checked native fix. See TRACKING-ANDROID.md before upgrading Expo.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const marker = '// GreenCRM location safety v1';
const hashes = {
  'taskConsumers/LocationTaskConsumer.kt': '4ed55ae2a285ffc3add788266ad997808754d82b09559d0d03237ffdc218acb4',
  'services/LocationTaskService.kt': '7954e7e7be7b9780fe852f99b996291c37ffa07163834cf75dc81b9c51c36a4a',
  'LocationModule.kt': '74404105155747a6eeedee253f4f42d252d2160598870de84e8a259043737846',
};
const patchedHashes = {
  'taskConsumers/LocationTaskConsumer.kt': '489dc0247f58874fbb3ce0d8e9c8bcce3bb45d0c1135aaf105f19cf3e2f23afd',
  'services/LocationTaskService.kt': '6f720a24664f7d32f6180b73bb6080114b1496faab3d4a897ff9e128bf68365d',
  'LocationModule.kt': '7c87d706ac03ff58eb9b183b1b8b463c6c1736fad32a84aa53d15b4adb4101a7',
};
const digest = source => crypto.createHash('sha256').update(source).digest('hex');
function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error(`Native patch anchor changed: ${before.slice(0, 90)}`);
  return source.replace(before, after);
}
function transform(name, input) {
  let source = input.replace(/\r\n/g, '\n');
  const hash = digest(source);
  if (hash === patchedHashes[name]) return source;
  if (hash !== hashes[name]) throw new Error(`Tracking safety patch refused changed Expo source: ${name}. Review the patch before building.`);
  if (name === 'taskConsumers/LocationTaskConsumer.kt') {
    source = replaceOnce(source, '  private var mService: LocationTaskService? = null',
      '  private var mService: LocationTaskService? = null\n  private var mServiceConnection: ServiceConnection? = null');
    source = replaceOnce(source, '    mTask = task\n    startLocationUpdates()\n    maybeStartForegroundService()',
      '    mTask = task\n    maybeStartForegroundService()');
    source = replaceOnce(source, '    stopLocationUpdates()\n    startLocationUpdates()\n\n    // Restart foreground service',
      '    stopLocationUpdates()\n\n    // Restart foreground service');
    const start = source.indexOf('  private fun maybeStartForegroundService() {');
    const end = source.indexOf('  /**\n   * Reports locations immediately', start);
    if (start < 0 || end < start) throw new Error('Location service method boundaries changed');
    source = source.slice(0, start) + fs.readFileSync(path.join(__dirname, 'location-service-methods.kt'), 'utf8').replace(/\r\n/g, '\n') + '\n' + source.slice(end);
  } else if (name === 'services/LocationTaskService.kt') {
    source = replaceOnce(source, '  fun stop() {\n    stopForeground(true)',
      '  fun stop() {\n    greenCrmForegroundActive = false\n    stopForeground(true)');
    source = replaceOnce(source, '    startForeground(mServiceId, notification)',
      '    startForeground(mServiceId, notification)\n    greenCrmForegroundActive = true');
    source = replaceOnce(source, '  //region private',
      '  override fun onDestroy() {\n    greenCrmForegroundActive = false\n    super.onDestroy()\n  }\n\n  //region private');
    source = replaceOnce(source, '    prepareChannel(mChannelId)\n    val builder = Notification.Builder(this, mChannelId)',
      '    val channelId = mChannelId ?: (packageName + ":greencrm-location")\n    prepareChannel(channelId)\n    val builder = Notification.Builder(this, channelId)');
    source = replaceOnce(source, '      .setSmallIcon(iconsResId)',
      '      .setSmallIcon(if (iconsResId != 0) iconsResId else android.R.drawable.ic_menu_mylocation)\n      .setOngoing(true)');
    source = replaceOnce(source, '  companion object {',
      '  companion object {\n    @Volatile var greenCrmForegroundActive: Boolean = false\n      private set');
  } else if (name === 'LocationModule.kt') {
    source = replaceOnce(source, '    AsyncFunction("hasStartedLocationUpdatesAsync")',
      '    AsyncFunction("getGreenCrmServiceHealthAsync") {\n      mapOf(\n        "running" to expo.modules.location.services.LocationTaskService.greenCrmForegroundActive,\n        "error" to (mContext.getSharedPreferences("greencrm_location_health", Context.MODE_PRIVATE).getString("error", "") ?: "")\n      )\n    }\n\n    AsyncFunction("hasStartedLocationUpdatesAsync")');
  }
  const result = marker + '\n' + source;
  if (digest(result) !== patchedHashes[name]) throw new Error(`Tracking patch template changed: ${name}. Review and update its expected hash.`);
  return result;
}
function patchLocation(projectRoot) {
  const packageFile = require.resolve('expo-location/package.json', { paths: [projectRoot] });
  if (JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== '57.0.19') {
    throw new Error('Tracking safety patch is reviewed only for expo-location 57.0.19. Review it before upgrading.');
  }
  const root = path.join(path.dirname(packageFile), 'android/src/main/java/expo/modules/location');
  // Validate every file before writing any of them. Repeated prebuilds are idempotent.
  const changes = Object.keys(hashes).map(name => {
    const file = path.join(root, name), original = fs.readFileSync(file, 'utf8');
    return { file, original, result: transform(name, original) };
  });
  for (const change of changes) if (change.original !== change.result) fs.writeFileSync(change.file, change.result);
}
module.exports = { patchLocation, transform, hashes };
