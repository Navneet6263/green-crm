const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const { patchLocation } = require('./patch-location.cjs');
const { assertTrackingPermissions, assertTrackingManifest } = require('./tracking-permissions.cjs');

module.exports = function withTrackingSafety(config) {
  assertTrackingPermissions(config);
  config = withAndroidManifest(config, config => {
    config.modResults = AndroidConfig.Permissions.setAndroidPermissions(config, config.modResults);
    assertTrackingManifest(config.modResults);
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    patchLocation(config.modRequest.projectRoot);
    return config;
  }]);
};
