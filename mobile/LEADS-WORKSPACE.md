# Mobile sales workspace

## Changes

- My Leads and My Tasks automatically request the next page on scroll. There are
  no page-number controls. Server-side pagination remains to keep memory and API
  response sizes bounded. Pull down to refresh; failed requests have a retry.
- Lead filters open in a right-side panel: status, priority, pipeline, source,
  team, product, created-date range and note text. Apply commits the selection;
  Reset clears it. Search and filters apply to the server list, not just loaded rows.
- Lead cards use the original neutral glass surface without coloured edge strips
  or status-tinted backgrounds. Contact, phone, product, follow-up and latest note
  are shown when populated. Details use plain label/value columns without nested
  coloured boxes and omit empty fields/sections. Numeric zero is not empty.
- All status shortcuts (All, New, Contacted, etc.) are available directly above
  the lead list, alongside the advanced filter panel. Both share one status value;
  switching a shortcut preserves other filters and restarts the list at page one.
  All clears only status; the clear-filters action clears every advanced filter.
- History has separate activity and conversation-note views. Existing follow-up,
  note, call, email, photo and task actions are retained.
- CSV export supports selected columns and either all filtered leads or only
  loaded leads. Maximum 5,000 rows and approximately 5 million characters per
  file; oversized exports fail with guidance rather than silently truncating.

## Data and export boundaries

Existing authenticated APIs and server assignment/team permissions are unchanged.
No direct database connection, new backend endpoint, SQL migration or web CRM
change is required for this workspace update. Export never requests another
company's data or bypasses the API's financial-field masking.

CSV uses UTF-8 with a BOM, escaped quotes, cleaned whitespace, and only an explicit
allowlist of selected columns. Dates include year and IST. Phone/postal/ID cells
are prefixed with an apostrophe to preserve text; dangerous formula prefixes are
neutralised. Some CSV readers display the protective apostrophe literally.

Multi-page export is not a transactional snapshot: concurrent CRM edits can
change results during collection. Rows are deduplicated by lead ID. A fetch error
does not generate a partial successful export. Narrow filters for large datasets.

Native export uses the phone's share/save chooser. Temporary CSVs are plaintext
in the app-private cache. Files created by this exporter more than 24 hours ago
are removed on the next export; the OS may also clear cache. Copies the user saves
or shares are not managed by the app. Share only with authorised recipients.

## Verification and installation

- Local TypeScript, 95 automated tests and the 300-line source-file check passed.
  Expo's online dependency check now recommends newer patch versions; dependencies
  were not upgraded as part of the neutral-card/status-shortcut UI correction.
- Android, iOS and web JavaScript exports passed. This is not a native APK build.
- Mocked browser checks passed for filters, lead details/History, selected-column
  CSV and task completion, alongside existing login and sales workflows. No real
  customer API was used. No browser errors were recorded.
- Android/iOS physical-device acceptance is still required: scroll across several
  pages, change filters while loading, inspect populated/empty details, retry a
  network failure, save/open a CSV and complete/reopen a task.

The current native build is 0.1.6 / Android versionCode 7. A new APK is needed for
the added native sharing module and the earlier native map changes; an OTA update
cannot add missing native modules. Complete the map-key setup in MAPS-SETUP.md
before the Android EAS build. Install with the existing signing certificate over
the current app; do not uninstall or clear pending routes.

No Git commit/push, cloud build, production deployment or phone installation was
performed for this update. Earlier unrelated working-tree changes remain intact.
