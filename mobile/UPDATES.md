# Mobile UI and app-logic updates

## Configured locally

- `expo-updates` matches the installed Expo SDK.
- The update URL points to the existing linked EAS project in `app.json`.
- The installable Android `preview` APK uses channel `preview` and environment `preview`.
- Runtime compatibility uses the native `fingerprint` policy. Native dependency/config
  changes can change that fingerprint and require a new binary.
- On launch, updates are checked/downloaded in the background. Startup does not wait
  for the download; the embedded or previously downloaded compatible app remains usable.
- No automatic `reloadAsync` or forced mid-session restart is added: active lead forms,
  photo submissions and tracking work must not be interrupted to apply a UI update.

**This is configuration, not a published update.** No cloud build, release, channel
remapping or remote environment modification was performed during this setup.
An APK built before these changes cannot receive these OTA updates.

## One new APK is required first

Run from `mobile` on Windows, after reviewing local changes. Use the existing Expo
account/project and Android signing key; do not create a replacement project or keystore
for an app that already has one. Keep existing package IDs for in-place upgrades.

Ensure the EAS preview environment contains the intended backend URL (currently LIVE CRM):

```cmd
npx.cmd eas-cli@latest env:set --name EXPO_PUBLIC_API_URL --value https://greencall.online/api --environment preview --visibility plaintext
npx.cmd eas-cli@latest build --platform android --profile preview
```

These commands modify the remote environment/start a cloud build; they are operator
actions, not automatic install/test steps. Never put API credentials or database
passwords in an `EXPO_PUBLIC_` variable. Local `.env` alone is not a cloud release plan.

Install the resulting APK on the Android phone. It talks to the existing AWS API and
does not need Metro or the laptop running. Installing over the current APK requires
compatible package/signing/version information. Before replacing any binary, sync all
pending locations. Do not uninstall or clear app storage to resolve installation errors;
that can destroy pending offline data and the encryption key.

## Later: publish a compatible UI/JS change

1. Implement and test the change locally. Preserve compatibility with the installed
   native runtime, offline queue schema/events and the API used by older app versions.
2. Deploy any required backward-compatible backend/schema changes before the app update.
3. Run `npm.cmd run verify` and the relevant native/device tests.
4. Review the diff and release message. Publishing below sends code to every compatible
   installation on the preview channel. Git commit/push alone does **not** publish it.
5. With explicit release approval, publish from `mobile`:

```cmd
npx.cmd eas-cli@latest update --channel preview --environment preview --message "Describe the tested UI change"
```

The environment flag matters: the update embeds API configuration too. Do not switch
an existing installation to another server as an incidental UI change. Background
upload identity is partitioned by API base/company/user.

No arbitrary new screen or network feature is automatically safe just because it is JS.
Retest authorization, old server compatibility and offline data migrations where relevant.

## How employees receive it

When an update-enabled compatible APK is opened online, it checks/downloads the update.
With the zero-wait startup policy, it normally applies on a subsequent **cold app launch**;
merely returning from the background may not restart the JavaScript runtime. It does not
instantly change everyone's currently open screen or show an APK installer popup.

For a controlled acceptance test: finish forms, stop tracking, upload all pending points,
open the app online and give the download time to complete, then fully close/reopen the
app. Verify the visible change. Do not tell employees to force-close an active tracking
session to fetch an update: that can interrupt GPS collection.

While offline, the installed embedded/cached version stays usable. Offline tracking
still depends on a valid local identity and the existing 12-hour/session rules.

## What still needs an APK / backend deployment?

| Change | Usual delivery |
| --- | --- |
| Colours, labels, layouts, compatible JS fixes | Tested OTA publish |
| JS-only feature using native capabilities already in the binary | OTA after compatibility/device tests |
| New native library, permissions, native configuration, Expo SDK | New signed APK/native build |
| Compatible backend-only business logic | Deploy AWS backend; no APK/OTA required |
| New backend endpoint used by mobile UI | Backend deployment plus OTA/new APK as applicable |

Fingerprint matching protects native compatibility; it does not validate business logic,
SQL migrations or guarantee a bug-free update. A fingerprint change can intentionally
prevent old installations receiving an incompatible update.

## Release boundaries

`preview` is for internal testing even though its configured API currently points at the
live CRM. A separate production profile/channel and rollout process should be agreed
before broad employee distribution; do not silently reuse preview for customer release.
Restrict Expo project publishing access and enable account MFA. A publisher can change
app code. Test releases, keep a known-good update and use Expo's rollback/republish flow
if necessary. Code-signing/production rollout automation is not configured in this slice.

The existing native GPS/encryption/photo acceptance checklist still applies. The first
update-enabled signed APK and an actual OTA delivery must be tested on a real phone;
JS exports/config tests cannot prove delivery or native SQLCipher/background behavior.

References: [EAS Update setup](https://docs.expo.dev/eas-update/getting-started/),
[runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/),
[update loading](https://docs.expo.dev/versions/v57.0.0/sdk/updates/).
