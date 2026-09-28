# Mobile route map: current build 0.1.6 / Android versionCode 7

## What is implemented

- Native Google Maps on Android, native Apple Maps on iOS. No web Maps API.
- Recorded GPS polylines, first/latest-location markers, numbered manual visits.
- Matching chronological visit log (10 per page); tap a visit to focus the map.
- Full-screen map, Fit route and Latest location actions.
- Estimated trip kilometres from locally saved GPS, not paid Directions/Routes.
- Mocked/invalid/low-accuracy fixes and implausible jumps are excluded from the
  distance calculation. Gaps over three minutes split the route. GPS uncertainty
  reduces small stationary movements. This is an estimate, not mileage evidence.
- Selected-session history replaces the old 500-event preview. Defensive 50,000
  event cap and missing start events are labelled partial; no full-day claim.
- Raw events and offline upload semantics are preserved. One local SQLite index
  is added automatically. No server SQL migration or backend deployment needed.
- Native rendering is simplified, with at most 128 drawable sections and latest
  100 visit pins (plus a selected older visit). Distance uses all loaded sections;
  all loaded visits remain in the paginated log. Old synced history can expire
  under the existing seven-day local retention policy.

## Google cost boundary

As checked 2026-09-24, the basic mobile **Maps SDK** SKU has unlimited no-cost
usage. This implementation never sets a Google map ID and never calls Places,
Routes, Roads, Geocoding, Navigation, Street View or Google's JavaScript Maps API.
The API key and a billing-enabled Google Cloud project are still required.
This is not a promise that all Google services or future prices are free.
Other services in the same Cloud project can still incur charges.

- [Google pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Maps SDK vs Dynamic Maps](https://developers.google.com/maps/billing-and-pricing/sku-details#maps-sdk)
- [Expo native maps setup](https://docs.expo.dev/versions/latest/sdk/map-view/)

## Account owner setup (required before APK build)

1. In your Google Cloud project, enable billing and **Maps SDK for Android only**.
2. Create a dedicated Android client API key. Application restriction: Android
   apps. Package: `com.greencall.field.dev`. Add the **SHA-1 of the certificate
   actually signing this APK**, shown in Expo project > Configure > Credentials
   > Android Keystore. Do not generate/replace a signing key to get a SHA-1.
3. API restriction: **Maps SDK for Android only**. If later distributed through
   Google Play, add its app-signing certificate SHA-1 separately.
4. In Expo project > Environment variables, add `GOOGLE_MAPS_ANDROID_API_KEY` to
   the **preview** environment, using Sensitive visibility. Do not put it in Git,
   chat or screenshots. Also set it in the ignored `mobile/.env` for local config
   evaluation. Do not put this variable in the CRM backend's .env.
5. This is a client key embedded in the APK, not a server secret; Android package,
   certificate and API restrictions are what protect it. Configure billing alerts
   to detect unintended usage; alerts themselves do not cap spending.

`app.config.js` injects the key into the Android manifest via the maps plugin.
Without the key, local preview shows a setup message and does not mount Google
Maps; tracking/visits remain usable. Android EAS workers reject a missing key.
No real key is provided by the repository or tests. Nothing is enabled in Cloud
by these code changes. Google/iOS setup is intentionally absent: iOS uses Apple.

## Build / update

```text
cd C:\Users\User\Downloads\GreenCrm\mobile
npm.cmd ci
npm.cmd run verify
npm.cmd run eas-build-post-install
npx.cmd eas-cli@latest build --platform android --profile preview --clear-cache
```

A new APK is mandatory: the native map library/key cannot be added through OTA.
Use the existing signing certificate and install over the current app; do not
uninstall/clear data with pending routes. No Git push is required for a build
from this local workspace. Keep the same preview environment/key when publishing
compatible future updates so native fingerprints remain consistent.

## Device acceptance (not yet performed)

- Confirm version 0.1.6/code 7 and native boot permission retained.
- Google street labels/tiles load (blank tiles can mean key, SHA-1, API or billing
  configuration error). No map ID or separately billed API should appear in usage.
- Start outdoors, walk a known short route, mark two named visits. Pins 1/2 must
  match log order/time; selecting either must focus the matching coordinate.
- Stop/start another trip: distance and pins reset to that trip, old queue stays.
- Check Fit route, Latest location, zoom, full-screen/back and Android Back.
- Remain stationary: distance should not grow materially from drift. Distance is
  approximate; do not expect road-snapped navigation or odometer accuracy.
- Turn data off: GPS and manual stops continue saving locally. Street tiles are
  NOT guaranteed offline. Reconnect: upload retains timestamps without duplicates.
- Deny/revoke location and lock/unlock screen: no app crash or hidden auto-start.
- Check a long route (>500 events) and another user: no truncation disguised as a
  complete trip, and no other employee/company events.
- iOS map/permissions/background recording require separate device acceptance.

Unit tests and JS exports do not validate native map rendering, Google's billing
configuration, signing credentials or physical-device GPS.

## Local verification completed

- TypeScript and all 85 tests passed, including native-manifest key injection,
  missing-key fallback, provider selection, numbered pins, GPS filtering, route
  gaps, >500-event history and tenant/account isolation.
- Android, iOS and web JavaScript/Hermes exports passed. The mobile browser
  fallback imports no native map library and makes no Google web map requests.
- Expo dependency alignment, tracking native safety hook and 300-line check passed.
- No cloud build, API key provisioning, Google billing changes, native-device map
  test, backend deployment or Git push was performed.
