# Android tracking safety update (0.1.1)

## What was observed

On a Nothing Phone (3a), Android 16, granting Always permission alone did not
crash the app. The supplied video shows successful navigation, followed by a
crash after Start tracking. Reopening with Ask every time showed an incorrect
ON badge. The video does not contain an Android exception or prove a root cause.

## Changes

- Permission setup is a separate, explained action. It never creates a trip.
- Start requires an active app and already-granted foreground/background access.
- Android success waits for the actual foreground service, not task registration.
- Permission/GPS changes are checked on app resume and while the tracker is open.
  Revocation closes the session; restoring permission does not auto-restart it.
- Recording requires a saved GPS event from this session. A start event or an
  upload success is not a GPS fix. Old fixes are labelled No recent GPS.
- Native start failures are surfaced on the tracker, with private on-device error
  details. There is no external crash-reporting service or credential upload.
- Passive locations have one writer (the background task), removing the extra
  one-shot request immediately after starting the same route.
- All pending data, SQLCipher keys and API/tenant access controls are retained.

## Temporary Android native patch

`plugins/withTrackingSafety.cjs` runs during Android prebuild, including EAS.
It applies a source-hash-checked, idempotent patch to expo-location **57.0.19**.
An unexpected dependency version or modified source FAILS the build instead of
silently omitting the fix. No manually edited node_modules need to be committed.
The Kotlin template and JS patch files must be included with the app sources.

The patch addresses an uncaught service-binding/promotion failure path described
in [Expo issue 49424](https://github.com/expo/expo/issues/49424), not a confirmed
exception from this device. It starts the service only from the foreground,
then promotes it after binding. Rejection stops location updates, stops/unbinds
the service, clears references and records the error. Both initial start and
restart use cleanup; a late bind cannot resurrect a stopped trip. GPS requests
start only after service promotion succeeds. No automatic background retry is
introduced. It also supplies a valid notification icon/channel fallback.

`getGreenCrmServiceHealthAsync` reports the actual service flag (cleared on stop
and destruction) and last native startup error. This is deliberately app-specific:
GreenCRM allows only **one active route per installation**. Do not reuse it as a
general multiple-location-task API. Task registration is still checked separately.

Remove/review this patch when upgrading expo-location; do not bypass hash checks.
JavaScript tests and exports do NOT compile Kotlin or prove device crash recovery.
The original crash could have an additional cause; obtain Android crash output
if the rebuilt app still exits instead of showing a handled service error.

## Build and test

This change requires a NEW Android APK, not a backend restart or OTA-only update.
Use the same EAS project, signing key and package to install over the existing app.
Do not uninstall or clear app data with unsynced events. Upload pending data first
where possible. App version is 0.1.1, Android versionCode is 2 (increase it again if
a newer code has already been distributed).

```text
npm.cmd run verify
npx.cmd eas-cli@latest build --platform android --profile preview
```

Before accepting the build on Nothing Phone (3a), Android 16:

1. With tracking stopped, deny location: login/leads/tasks must still work.
2. Tracker → Set up location → While using → Always → return. No route starts.
3. Consent → Start. Keep app open: Starting → Waiting for GPS → Recording after
   a real point. Check the ongoing Android notification, not just the badge.
4. Stop. Start again then immediately press Home/lock; the app must not crash.
   Either tracking continues, or a handled error/interrupted session is shown.
5. Walk outdoors, lock/unlock, reopen; confirm timestamps and actual route points.
6. Mid-trip change permission to Ask every time / Deny. Reopen: no false ON,
   no fresh recording, saved queue retained. Re-grant: explicit Start required.
7. Disable internet (not GPS), record and mark a store. Reconnect and verify
   original timestamps, correct account ownership, and no duplicate events.
8. Stop/sign out during Starting; no delayed service or GPS callback may restart.
9. Test screen-locked capture on another Android version and iOS separately.

Cloud APK build and physical-device checks are a separate required verification
step; do not label the crash resolved based on unit tests or web preview alone.

## Local verification recorded

- TypeScript, 54 isolated tests, 69 authored source/test/plugin files under 300
  lines, and Expo dependency alignment: passed.
- Patch applied twice to installed native sources: passed, no duplicate edits;
  the same tests passed against already-patched sources.
- Android/iOS/web JavaScript/Hermes exports: passed.
- Mocked browser smoke (login, leads, tasks, photos, web tracker guard): passed.
- Native config inspection: package unchanged, version 0.1.1/code 2, location
  permissions present, SQLCipher enabled for Android and iOS.
- Not performed: Kotlin/Gradle compilation, cloud APK build, physical-device GPS
  or Android crash verification. No Android SDK/JDK was available on PATH here.
- No backend, SQL migration, production data, cloud publishing or Git push changed.
