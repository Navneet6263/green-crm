# GreenCRM Sales

React Native + TypeScript sales app for the existing GreenCRM backend.
Android/iOS share the mobile codebase; web CRM and backend deployments stay separate.

## Included

- Real sales-account login, secure native token storage, personal leads/tasks and follow-ups.
- Team/product-aware lead creation, notes, status updates and IST scheduling.
- Web-equivalent **sales-visible** Add Lead fields: contact, product/team, industry,
  source/custom source, priority, value, advance/remaining, units, employee range,
  active users, follow-up, requirements and full address.
- Up to three photos per lead submission, camera/library selection and JPEG compression.
  Photos upload after the lead is saved; failed uploads retry against the same lead/photo
  identifiers. Saved photos can be viewed from mobile lead details with authorization.
- Tracker tab: employee consent, Start/Stop, background route collection, named manual
  Reached check-ins, local route sketch, coordinates and pending-upload counter.
- Offline tracking/check-ins in an account-scoped encrypted SQLite queue. Automatic
  upload on app/network activity; explicit Upload pending now button.
- Recently verified native sales sessions can reopen offline for up to 12 hours.
  The server must still accept the employee's token before any upload succeeds.

No demo login or production sample records were added. Test fixtures live only in tests.

### Updating the installed app

EAS Update is configured for the internal `preview` APK. **Build/install a new APK once**
to include the update library; older APKs do not gain this capability automatically.
Later compatible UI/JavaScript changes can be published without reinstalling the APK.
Updates are downloaded on launch and normally applied on a subsequent cold launch;
there is no forced restart during forms/tracking. Native/permission changes still need
a new build. No cloud build or OTA publish has been run by this configuration change.
See [the update workflow and safety checks](UPDATES.md).

### Important boundaries

- **Offline support is for tracking and Reached, not lead creation or photos.**
  New leads, notes, tasks, photo selection drafts and CRM lists are not an offline CRM.
  Selected photos are temporary; do not close the form before finishing uploads.
- Background GPS and encrypted SQLite require a **new native build**. Browser/Expo Go
  tracking is not supported. Web displays a clear native-build requirement.
- GPS sampling requests roughly 30 seconds / 30 metres, subject to platform, movement,
  battery and permissions; this is not a guaranteed fixed interval.
- Reached requires a fresh fix, accuracy within 100 metres and no OS-reported mock flag.
  Coordinates remain device-reported, not tamper-proof attendance/location proof.
- A work session has a 12-hour recording limit. Collection stops when the app/background
  callback next runs; locations beyond the limit are never queued as route points.
- Force-closing, force-stopping, rebooting or OS restrictions can interrupt collection.
  Reopen, end the interrupted session and explicitly start again. Gaps are not invented.
- If tracking is stopped and the OS suspends the app, reconnect alone cannot guarantee
  immediate upload. Open the app to resume synchronization.
- The route sketch is not a street map/navigation engine. Manager live-map/dashboard,
  assigned store visits, orders, push notifications and store publication are not included.
- Existing web Add Lead admin/reassignment controls are intentionally not exposed to sales.
  The new private photo gallery is mobile-only; it is separate from legacy web documents.

## Required backend deployment

This slice adds backend APIs and **three SQL Server tables**. They are NOT auto-migrated.

1. Back up and select the intended CRM database in SQL Server Management Studio.
2. Review/run `backend/db/migrations/20260923_field_tracking.sql` in staging first.
3. Deploy/restart the backend on every instance.
4. Configure persistent private photo storage. Do not put it under public `uploads`.
5. Build/install the new native client and run the acceptance checks below.

See [backend rollout and API guide](../backend/docs/field-tracking-rollout.md).
Publishing this code does not deploy the backend or build an APK. No production login
or record upload was performed during implementation; verify migration/deployment separately.

## Run

Use Node 24.x, at least 24.3, and the committed lockfile.

```text
cd mobile
npm ci
npm run web
```

On Windows use `npm.cmd` if PowerShell blocks `npm.ps1`.
Web runs at http://localhost:3010. Use an existing **sales** employee account.
The default API is **https://greencall.online/api**: live buttons can change real data.
Use an approved staging company/account, not customer data, for acceptance tests.

Set `mobile/.env` using `.env.example` to override the API:

```text
EXPO_PUBLIC_API_URL=https://your-test-server.example/api
```

Restart Metro after changing this value. Native builds embed the URL at build time.
Do not put SQL passwords, integration keys or secrets in EXPO_PUBLIC variables.
Physical phones need the PC LAN address for local development, not localhost.
Android emulator host alias: http://10.0.2.2:5000/api.
Release builds require HTTPS; development HTTP is restricted to local/private addresses.

### Native development build

The location, SQLCipher and permission plugins changed. Restarting Metro or publishing
only JavaScript is **not enough**; rebuild the native app.

On Windows with Android Studio/JDK/Android SDK configured:

```text
cd mobile
npx expo run:android
```

For subsequent JS edits, use `npm start` with that installed development client.
Local iOS builds require macOS/Xcode; alternatively configure EAS cloud builds and Apple
signing. EAS development/preview profiles already exist in `eas.json`.
No cloud build, credentials setup, signed APK/IPA or store release has been performed.
Package IDs are development placeholders; choose final IDs before production distribution.

## Security and persistence

- The employee login token authenticates every request; no company-wide integration key.
- Server authorization enforces tenant/team/lead access. Hidden UI is not access control.
- Tracking endpoints accept only the authenticated sales employee's records, ignoring
  forged owner/company fields. No location edit/delete endpoints were added.
- UUID events + server transaction locking make identical upload retries idempotent.
  Local entries are acknowledged only after the complete batch is confirmed.
- SQLite uses SQLCipher; the random key and limited offline identity/token use SecureStore.
  Each transaction connection is explicitly keyed. There is no plaintext fallback.
- Queues are partitioned by API base/company/user; signing out stops tracking but retains
  pending records for the same account. Never clear app data/uninstall with pending data.
- Uploaded local history is pruned after seven days on acknowledgement, excluding the
  active trip. Pending data is not pruned. A 50,000-event pending cap prevents endless growth.
- Photo APIs enforce lead access, private no-store responses, JPEG/PNG signatures, 5 MB
  per file and 30 photos per lead. No anonymous photo URL is exposed.
- Tokens are memory-only on web. Native offline token access after first device unlock
  enables background upload; it is device-bound, not exportable application config.
- Existing lead/note creation APIs are not idempotent: after ambiguous timeouts, inspect
  My Leads/history before creating again. Photo/tracking retry logic does not change that.

## Verification

```text
npm run verify
npx expo export --platform all --max-workers 2
node scripts/smoke-web.mjs
```

Verify checks TypeScript, isolated tests, the 300-line source limit and Expo versions.
Exports are JavaScript/Hermes bundles, **not signed APK/AAB/IPA or device GPS tests**.
Browser smoke intercepts all remote API requests and uses only fixtures. Screenshots go
to ignored `test-results/`. It requires Chromium via CHROME_BIN or a local Playwright cache.
SQLite tests execute the queue SQL against Node SQLite; they do not validate native
SQLCipher, Android foreground services or iOS background execution.

The rollout guide records results and remaining device/SQL Server checks.

## Physical-device acceptance (required before release)

For the Android 16 startup fix, new APK requirement and exact permission/crash
acceptance sequence, see [TRACKING-ANDROID.md](TRACKING-ANDROID.md).

1. Use staging, migrate, install the native build and log in as a sales employee.
2. Try denied foreground/background/precise permissions and disabled GPS. No false ON state.
3. Consent and Start; lock the screen, walk/drive with a colleague safely, then inspect route.
4. Disable mobile data/Wi-Fi (keep GPS on), move, name a store, mark Reached and Stop.
   Confirm pending count increases and points/check-ins survive app reopening offline.
5. Reconnect/open app: verify pending reaches zero, original capture times are retained
   and repeated sync/retried requests create no duplicate server events.
6. Sign out/account-switch with pending points: the other account cannot see/upload them.
   Sign back into the original account to finish. Test revoked/expired authentication too.
7. Force-stop/reboot/low-power mode: verify interrupted state and honest route gaps.
8. Revoke permission mid-trip; fill storage in a controlled test; verify collection stops
   on local save failure and existing pending data remains intact.
9. Create a test lead with every field and photo. Interrupt photo upload, retry and verify
   one lead, one photo per UUID; verify private reads and cross-company/team denial.
10. Check native SQLCipher configuration, encrypted database/WAL files, battery use,
    photo permissions, accessibility, keyboard and small-screen layout on Android/iPhone.

## Structure

```text
app/                       Routes: login, tabs, lead/task forms
src/api/                   Transport and validated sales fields
src/auth/                  Live session and bounded offline identity
src/tracking/              Encrypted store, native GPS task, sync, route sketch
src/features/photos/       Camera/library, private upload and viewing
src/features/              Lead/task widgets and follow-up workflows
src/hooks/                 Focus loading and unsaved-change protection
src/ui/                    Shared fields, icons and IST calendar
tests/                     Isolated API/SQLite/render tests
scripts/                   File-size check and browser smoke
```

Authored mobile source/test/script files stay within 300 lines.

References: [Expo background location](https://docs.expo.dev/versions/v57.0.0/sdk/location/#background-location),
[SQLCipher](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/),
[image picker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/).
