# Sales mobile tracking and private lead photos

## Deployment status

Publishing this code does not apply the SQL migration, deploy the backend, or build an APK.
The operator reports applying the migration; its live database state has not been independently
verified here. No native binary build or store submission has been performed for this slice.
Review and apply this migration explicitly to the **intended SQL Server CRM database**:

`backend/db/migrations/20260923_field_tracking.sql`

Back up first and test in staging. It adds `field_tracking_sessions`,
`field_tracking_events` and `lead_field_photos`, with tenant/employee indexes and
compound tracking keys. Existing CRM records are not rewritten. The script uses a
transaction and skips existing tables; it is not a schema-repair tool for partially
modified tables. Do not run a full bootstrap script instead of this migration.

Then deploy/restart **all** backend instances. Mobile SQLCipher/location plugins need
a new native Android/iOS build; an OTA JS update or Metro restart alone cannot add them.
Web CRM need not be rebuilt solely for these backend APIs/mobile changes.

## Private storage and deployment configuration

- Default: `backend/private_uploads/lead-photos` (git-ignored, not Express static uploads).
- Optional backend env: `CRM_PRIVATE_STORAGE_DIR=/absolute/persistent/private/path`.
- Never point it at a public static directory, webroot, or anonymously readable bucket.
- Grant filesystem access only to the backend service account and approved backup tools.
- Single-instance AWS needs a persistent volume and backups. Multiple hosts/containers
  must share the same persistent private storage; a per-instance filesystem loses access
  after scaling/replacement. This implementation is filesystem-backed, not an S3 adapter.
- Configure the reverse proxy/load balancer to accept the 5 MB image body and appropriate
  upload timeout. An Nginx default 1 MB body limit would reject photos before Node sees them.
- Do not expose raw files through Nginx aliases. Serve only the authenticated photo route.
- Upload failure after file creation can leave an unreferenced immutable file. A reviewed
  orphan-file reconciliation/retention job is still needed; automatic deletion is not added.
- JPEG/PNG signatures and size are checked. This is not malware scanning or full server-side
  image re-encoding; mobile re-encodes selected images. Apply additional media hardening if
  opening uploads to broader clients. Enforce per-tenant storage quotas before large rollout.
- Confirm location-data notice, retention/access policy and store background-location
  disclosures with the business before employee rollout. Server retention is not automated.

## Tracking API

All paths are relative to `/api`; Bearer **employee login token**, not `crm_lc_...`.
Only authenticated sales users may read or upload their own tracking. Tenant/user IDs
come from authentication; they are not accepted as ownership instructions in the body.

`POST /field-tracking/sync`

Body: `{ "events": [...] }`, 1–100 events, chronological local queue order. Each event:

| Field | Contract |
| --- | --- |
| event_id, session_id, device_id | UUIDs generated once and persisted on device |
| kind | start, point, reach, stop |
| captured_at | UTC ISO timestamp; original offline capture time, not upload time |
| consent_version | 1 on start |
| latitude, longitude, accuracy | Required finite GPS values for point/reach; accuracy in metres |
| label | Required store/location name on reach, maximum 160 characters |
| mocked | OS-reported mock-location flag; not proof against spoofing |

Response: `{ "success": true, "data": { "acknowledged": ["event UUID", "..."] } }`.
The device marks records synced only when the acknowledgement exactly matches the batch.
Server checks: a start from the same device must precede points; points must fit the
12-hour session window and not exceed recorded stop time. Reached requires accuracy
within 100 metres and rejects the reported mock flag. Phone-side check-ins also require
a fix within 30 seconds. Capture time and server receipt time are stored separately.

Identical event-ID/payload retries return the same acknowledgement without duplicate
rows. Reusing an ID with changed data gives 409. The entire batch commits or rolls back.
Transactions use `sp_getapplock`; ensure the application DB principal can acquire
transaction-scoped application locks. The query adapter's raw mssql result is used for
DECLARE/EXEC lock return codes. There are no GPS update/delete endpoints.

`GET /field-tracking/sessions?page=1`: own sessions, 20 per page.

`GET /field-tracking/sessions/:sessionId/events?page=1`: own events, 500 per page.
Pages are bounded. These endpoints do not expose other employees' routes. A team-scoped
manager map/live-location view is a separate unfinished feature, not implied by collection.

Per-user limiter: 60 tracking requests/minute, in addition to existing global limits.
The limiter is process-local; distributed rate limiting and higher-throughput bulk SQL
ingest should be planned before large fleet rollout. Current ingest uses parameterized
per-event checks/inserts inside one transaction; measure with expected user volume.

## Offline rules

- SQLCipher queue/key in native SecureStore, partitioned by API base/company/user.
- After one verified login, offline restoration is allowed for at most 12 hours.
- Uploads retry on app activity/network return/GPS callbacks with capped backoff.
  Manual retry bypasses backoff. At most five batches are sent in one pass.
- API 401/403 retains the queue and asks for same-account login. Never replace failed
  uploads with successful empty responses or acknowledge rows before server commit.
- Stop/logout ends collection; pending uploads stay encrypted for the original account.
- Once the OS suspends/stops an app, no promise of immediate reconnect sync is made.
- Unsynced data is never automatically purged. Local uploaded history older than seven
  days is cleaned on acknowledgement, excluding the current trip. Pending cap: 50,000.
- OS kill/reboot, missing permissions, storage failure and GPS accuracy create honest
  interruptions, not fabricated routes. A 12-hour limit is enforced at the next callback.
- Browser/Expo Go do not record location. Development/release native builds are required.

## Photo API and lead form

- `PUT /leads/:leadId/photos/:photoId`: raw JPEG/PNG, max 5 MB, UUID photo ID. Sales only;
  existing lead access is checked. Same ID/content is idempotent; conflicts return 409.
- `GET /leads/:leadId/photos`: metadata, only after existing lead-access authorization.
- `GET /leads/:leadId/photos/:photoId`: authorized bytes, private/no-store and nosniff.
- Reads are company/lead scoped. Filenames/absolute storage paths are not returned in
  list responses. Unauthorized users cannot read images through an anonymous public URL.
- Maximum 30 photos/lead, serialized by a per-lead transaction lock; route limiter 40/min.
- Mobile permits 3 photos per new-lead form; compresses to JPEG with width at most 1600 px.
- Lead is created first; photo failures leave that lead saved. Retrying does not recreate
  it. There is no offline photo/lead draft or photo delete/edit endpoint in this slice.
- The existing create-lead service now persists `no_of_employees` and `active_users`;
  zero active users is preserved. Other sales-visible fields reuse the existing schema/API.
- Native tokens retain the permissions granted to the employee by the backend. This
  feature does not convert the login token into a read-only integration key.

## Verification and release gate

Run isolated backend regression tests (no live database):

```text
cd backend
node --test tests/field-tracking.test.js tests/field-photos.test.js tests/crm-improvements.test.js tests/crm-services.test.js tests/team-product-access.test.js tests/product-team-sql.test.js tests/lead-count-integration.test.js tests/lead-count-integration-sql.test.js
```

Observed: **70 passed, 2 SQL integration tests skipped**, no failures. New checks cover
GPS validation, tenant/user/device scope, retry conflicts, atomic batches, stop bounds,
SQL Server lock return handling, private photo access and employee-field persistence.
The legacy `tests/notes.test.js` is a live-server harness and lacks its `axios` dependency;
it was not executed successfully and is excluded from the isolated regression command.
No dependency was installed to enable that live-write harness.

Mobile: **39 isolated tests passed**, along with TypeScript, Expo dependency alignment
and the 300-line file limit (`npm run verify`). Tests exercise real queue SQL using Node SQLite plus isolated
API/sync/render fixtures. Android/iOS/web JS exports and mocked browser smoke are run
separately. Browser smoke passed extended fields, image selection/compression, failed
photo upload/retry without duplicate lead, and existing sales workflows with zero browser
errors. All remote API requests were intercepted. Neither exports nor Node SQLite prove
native SQLCipher/GPS operation.

**Before release:** run the new migration and endpoint scenarios on staging SQL Server;
test native Android/iOS background recording, offline restart, reconnect retry, permission
revocation, cross-account/cross-team denial, queue/storage failure and photo failure/retry.
Inspect encrypted native DB/WAL files, battery use and private volume backup/recovery.
See `mobile/README.md` for the physical-device acceptance checklist.
