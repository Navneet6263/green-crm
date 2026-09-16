# CRM improvements — implementation and rollout

Date: 2026-09-08. This is a local implementation batch, not an AWS deployment or a completed production performance audit.

## Implemented

| Area | Change |
| --- | --- |
| Customers | Server-side search, status/creator/follow-up filters, deterministic sorting, 25-row pagination, complete matching totals, permission-scoped creator options, request cancellation. Exports explicitly cover the current page. |
| Customer activities | Both quick activity forms use the note endpoint. Notes, activity entries and last-interaction updates use one transaction. New entries do not rewrite the legacy notes/profile blob. Failed saves preserve input. |
| SQL Server adapter | CTE result sets and INSERT OUTPUT rows are returned correctly; ordinary insert identity and update contracts remain intact. |
| Recent Updates | Shared response normalization retains pagination; default date range matches the last-seven-days label; stale responses are ignored and request failures are visible. |
| Analytics | Permission-scoped SQL Server GROUPING SETS summaries replace downloading every lead page. Filter options retain scope. Focus queries return at most 20 leads with full matching totals. CSV output is quoted and formula-protected. Chart density is bounded. |
| Performance | SQL aggregates replace first-1,000-record calculations. Leads belong to their current primary owner, not both creator and owner. Cancelled tasks are not pending. Full staff aggregates, 25-person rendered pages, six recent leads and eight pending task previews. |
| My Day | New sidebar workspace with personal/shared open-lead follow-ups and personal unfinished tasks. Today, overdue, upcoming and undated queues are server-paginated. Tasks can be completed in place; leads link to their existing outcome/detail flow. |
| Calendar | Redirect replaced with weekly day selection and paginated daily personal task agenda. India-time boundaries are converted to UTC query timestamps. |
| Notifications | Shell uses personal inbox, complete unread count, unread-only server filter, a single bulk-read endpoint and safe same-origin action links. Reading another employee's personal notification is rejected, including for admins. |
| Loading and caching | Lead pages revalidate cached rows; refresh clears local caches before fetching. Cache size bounds and identity-scoped keys added. Successful writes prevent earlier in-flight GETs from repopulating stale shared cache. Dashboard cold summaries share in-flight computation. Workspace requests publish independently and expose per-resource states/errors; progressive rendering is enabled in My Day. |
| API work reduction | Analytics no longer fans out into all list pages. Lead edit uses a lightweight core detail view. Workflow summaries use the list's access predicate. Profile/notification/transfer polling pauses while hidden and refreshes on visibility. |
| UI/accessibility | Viewport-constrained expert/header notifications, mobile CTA spacing, scoped sticky customization save bar, scrollable task/activity dialogs. Activity dialog has focus handling, Escape, unsaved-input confirmation, duplicate-submit protection and preserved failure text. |
| Observability | X-Request-Id and Server-Timing headers. Optional structured slow-request logs with per-request SQL count/duration; no bodies, SQL text, tokens or query strings. |

## Behaviour definitions

- Analytics filters by **lead creation date**, not by the date revenue was collected or the deal was won. Won value is estimated value for records currently in won/onboarded states. Open pipeline excludes won/onboarded and closed-lost records.
- Analytics customer count is an accessible **all-time** count, separately labelled; it is not a conversion-cohort metric.
- Performance counts use current primary assignment, all time, within company/team scope. This avoids double-counting creators but does not constitute a historical employee-performance model.
- My Day “overdue” means before today's India midnight. Today includes earlier and later scheduled times today. The calendar includes completed/cancelled scheduled tasks; My Day excludes them.
- Existing timestamps are assumed to represent UTC, consistent with existing SYSUTCDATETIME-based flows. Verify legacy/imported timestamps before relying on date reports.
- Team/company notification listing is still available through the existing API for authorized roles; personal read state is no longer mutable on behalf of another recipient.
- Current-page customer exports and the analytics top-20 focus preview are intentionally labelled, not represented as full exports.

## Verification

No live database was connected, migrated, benchmarked or mutated. No AWS settings were changed. Repository/service tests use injected executors and mocked dependencies; they validate query bindings, scope construction, result contracts and transaction orchestration, not SQL Server execution plans.

Run ordinary local/CI tests:

```text
cd backend
npm run test:regression
cd ../frontend
npm run test:regression
npm run build
```

On Windows where PowerShell blocks npm.ps1, use npm.cmd. In restricted environments that block Node test-worker spawning, run each backend suite separately with Node 24's --test-isolation=none; do not combine their independently mocked service module graphs:

```text
node --test --test-isolation=none backend/tests/crm-improvements.test.js
node --test --test-isolation=none backend/tests/crm-services.test.js
node --test --test-isolation=none frontend/tests/api.test.mjs
```

The existing Next build configuration skips type validation and linting; a successful production build does not establish either check. Browser interaction/screenshot coverage is not included in this environment.

## Required staging checks before rollout

1. Deploy matching backend and frontend builds together to a staging environment. New screens depend on new API endpoints. Preserve a matching previous build pair for rollback.
2. Use a disposable database with representative data volumes: >100 customers, >1,000 leads/tasks, multiple companies, disjoint/overlapping teams, primary/shared assignments, no-team access and inactive users.
3. Execute analytics, focus and performance queries against the actual Microsoft SQL Server version. Compare totals against independently scoped SQL counts. Inspect Query Store/actual plans, reads, memory grants and waits. Do not add speculative indexes.
4. Confirm customer search finds later-page records, all sort/filter combinations preserve counts, and removing the final row on a page navigates correctly.
5. Save customer notes concurrently from two sessions and inject a transactional failure: no lost new entries and no partial activity/feed write should commit.
6. Verify admin/manager/marketing visibility, tenant boundaries, empty scopes and access revocation. Confirm personal notification bulk-read cannot affect another recipient.
7. Validate the UTC/India-midnight boundary, scheduled/undated queues, cancelled tasks and calendar pagination.
8. Test desktop, 375px mobile, short viewports, 200% zoom, on-screen keyboard, keyboard-only dialog use and notification positioning. Verify unsaved text survives failed requests.
9. Exercise the SQL adapter against SELECT, CTE SELECT, INSERT with/without OUTPUT and UPDATE. Note repositories use OUTPUT IDs; check those paths specifically.
10. Capture endpoint p50/p95/p99, DB queries/reads, payload size and first-useful-render timings before/after. Test cold/warm cache, multiple tabs and concurrent employees. No numeric speedup is claimed until this is measured.

Slow-request logging is opt-in: LOG_SLOW_API=true and SLOW_API_THRESHOLD_MS=1000 (or an agreed threshold). SQL durations are summed across queries and may exceed request duration when queries run in parallel. Connection-pool wait is not included in db_ms; investigate it separately when application time exceeds SQL execution time.

No schema/index migration is required by this batch. This does not eliminate the need for SQL integration tests, backups and a rollback rehearsal.

## Still pending from the wider review

- Saved views/URL-preserved navigation, configurable lead-table columns and a unified right-side work drawer with Save & Next.
- Full customer-360 consolidation, legacy timeline deduplication, optimistic-concurrency protection for general record edits, payment-history modelling.
- Complete server-side filtering/pagination throughout the existing task board and remaining sample-based dashboard widgets; richer Recent Updates leaderboard/export aggregation.
- Scoped targeted cache invalidation instead of broad post-write invalidation; further list/summary splitting and query/index tuning from production measurements.
- Transfer acknowledgement UX redesign after confirming mandatory-acknowledgement policy and reviewing its authorization path.
- Full calendar scheduling/rescheduling, conflict detection, recurrence and external calendar synchronization.
- Duplicate/merge workflow, import preview, auditable bulk operations and durable background exports.
- SLA, approval and workload-assignment automation: thresholds, ownership/exception policies and notification rules must be specified before activation.
- Actual support-ticket lifecycle versus renaming the existing task-based support view: requires a product decision.
- AI assistance/forecasting: requires a provider/data-retention decision, permission review, historical-data validation and human-approval boundaries. No external AI service or automatic outbound messaging was enabled.
- Live AWS sizing/network/connection-pool checks, Query Store configuration, index rollout, restore drills and production monitoring.

These pending items are not silently represented as complete. The next implementation batch should be chosen after staging validation and the necessary business-policy decisions.
