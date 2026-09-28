// The Android SDK key is embedded in the APK: restrict it to package + signing
// SHA-1 and Maps SDK for Android. Never use a server/CRM credential here.
module.exports = ({ config }) => {
  const key = (process.env.GOOGLE_MAPS_ANDROID_API_KEY || '').trim();
  if (process.env.EAS_BUILD_PLATFORM === 'android' && !key) {
    throw new Error('Set GOOGLE_MAPS_ANDROID_API_KEY in the EAS preview environment before building the Android map APK.');
  }
  return {
    ...config,
    plugins: [...(config.plugins || []), ['react-native-maps', {
      ...(key ? { androidGoogleMapsApiKey: key } : {}),
      // iOS uses Apple Maps; no Google iOS key or Google cloud map ID.
    }]],
    extra: { ...config.extra, androidGoogleMapsConfigured: Boolean(key) },
  };
};
