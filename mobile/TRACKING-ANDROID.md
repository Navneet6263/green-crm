# Android tracking safety update (0.1.4 / Android code 5)

## Confirmed device crash and 0.1.4 correction

ADB capture on Nothing Phone (3a), Android 16, on 2026-09-24 confirmed a fatal
`IllegalArgumentException: Requested job cannot be persisted without holding
android.permission.RECEIVE_BOOT_COMPLETED permission` in the installed 0.1.3 APK.
LocationTaskConsumer reported a location to TaskManagerUtils, which schedules
jobs with `setPersisted(true)`. The installed package lacked that permission.
The later "Open GreenCRM and tap Start tracking again" error occurred during
task restoration after the crash; it was not the original fatal exception.

0.1.4 explicitly declares RECEIVE_BOOT_COMPLETED in app.json. This is an
install-time Android permission, not another user-facing location prompt.
It satisfies Android's persisted-job requirement; no automatic route-start
feature is added. Existing explicit Start/Stop and foreground-start guards stay.
See [Android JobInfo.Builder](https://developer.android.com/reference/android/app/job/JobInfo.Builder#setPersisted(boolean)).

The EAS post-install check now rejects missing/blocked permission configuration
and stale native Android manifests, if native folders are supplied. The prebuild
plugin checks the permission too. Regression tests exercise missing, blocked and
SDK-restricted entries and inspect the actual Expo-generated Android manifest.
These checks are not a substitute for checking the final APK and running it.
This change does not modify web, backend, database, saved routes or signing keys.

Local verification for 0.1.4: TypeScript, all 72 tests, Expo dependency alignment,
and the 300-line source check passed. Expo manifest introspection confirms the
permission is generated; the EAS post-install hook passed locally. APK compilation
and physical-device acceptance of this version have NOT yet been performed.

## What was observed

On a Nothing Phone (3a), Android 16, granting Always permission alone did not
crash the app. The supplied video shows successful navigation, followed by a
crash after Start tracking. Reopening with Ask every time showed an incorrect
ON badge. The video does not contain an Android exception or prove a root cause.

## Changes

- One Start tracking button requests missing foreground/background permissions.
  Its short disclosure replaces the separate Agree and Set up buttons. Recording
  starts only after permission is granted and the app returns to active state.
- Permanently denied permissions open app Settings; denial/cancel never records.
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

### 0.1.2 build correction

The 0.1.1 configuration omitted `expo.autolinking.android.buildFromSource`.
expo-location publishes a precompiled Android AAR; Expo's default Gradle resolver
selects that AAR and bypasses the patched Kotlin sources. This explains how a new
JS bundle could show "tracking safety update" missing despite a source patch.
The installed APK itself was not inspected; a mismatched/old APK is also possible.

0.1.2 explicitly sets `buildFromSource: ["expo-location"]` in package.json, with
an actual Android autolinking resolver regression test. EAS's post-install hook
also applies/validates the patch before native compilation, including builds
with existing native folders. The prebuild plugin refuses a missing source override.
See [Expo precompiled modules](https://docs.expo.dev/guides/prebuilt-expo-modules/).

If the native method is missing, the tracker now retains queue counts, Stop and
Sync instead of throwing away all screen state and staying on Checking. Unsafe
recording is still blocked. Do not remove that protection to hide a build failure.

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
The 0.1.4 correction above addresses the now-confirmed scheduler exception.
Obtain new Android crash output if a rebuilt app still exits; do not assume all
other device-specific failure paths are resolved by this permission correction.

## Build and test

This change requires a NEW Android APK, not a backend restart or OTA-only update.
Use the same EAS project, signing key and package to install over the existing app.
Do not uninstall or clear app data with unsynced events. Upload pending data first
where possible. App version is 0.1.4, Android versionCode is 5 (increase it again if
a newer code has already been distributed).

```text
npm.cmd run verify
npm.cmd run eas-build-post-install
npx.cmd eas-cli@latest build --platform android --profile preview --clear-cache
```

Before accepting the build on Nothing Phone (3a), Android 16:

Verify installed version 0.1.4 / code 5 and RECEIVE_BOOT_COMPLETED in the package
permission list using `adb shell dumpsys package com.greencall.field.dev`.
If an old session shows Interrupted, stop that session and explicitly Start
again. Do not uninstall or clear data to reset it. Capture app-scoped Android
crash logs while running the following checks, especially the first GPS fix.

1. With tracking stopped, deny location: login/leads/tasks must still work.
2. Tracker → Start tracking → While using → Always → return. A denied permission
   must not record, and Start must not require a separate Agree control.
3. After granting permission, keep app open: Waiting for GPS → Recording after
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

## Previous 0.1.1 verification (not device acceptance)

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

## 0.1.2 local verification

- 60 tests, TypeScript, Expo version alignment and the 300-line check passed.
- The actual Expo Android resolver includes expo-location in buildFromSource;
  its resolved Gradle project name matches the forced-source rule.
- EAS post-install safety check passed locally against the patched native sources.
- Android/iOS/web JS/Hermes exports passed. Mocked browser smoke passed.
- UI tests verify Start is enabled without location permission, there is no Agree
  gate, and active routes retain Stop and pending Sync actions.
- APK/Kotlin compilation and physical-device permission/GPS/crash acceptance are
  still required; these local checks do not claim that the Android crash is fixed.
