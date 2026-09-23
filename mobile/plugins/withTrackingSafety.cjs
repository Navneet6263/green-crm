const { withDangerousMod } = require('expo/config-plugins');
const { patchLocation } = require('./patch-location.cjs');

module.exports = function withTrackingSafety(config) {
  return withDangerousMod(config, ['android', async config => {
    patchLocation(config.modRequest.projectRoot);
    return config;
  }]);
};
