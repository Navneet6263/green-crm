# Manager team isolation and shared product catalog

## Release state

Release package: the user requested committing/pushing the complete current batch,
including the earlier performance/UI improvements. Git delivery is not an AWS
deployment. The agent has not changed production mappings, records, users or schema.
The user reports running the product mapping migration; verify the target AWS
database separately before deployment. No additional migration is required for
the manager-membership policy or Recent Updates team-selector adjustments.

A read-only diagnostic of the workspace-configured database on 16 September 2026
found, for CI0002: 8 active teams, 18 active manager accounts, 13 active managers
without an active manager-to-active-team mapping, and 0 active leads without a
team. That was the original managed-only diagnostic, not a count of users without
access under the updated membership-or-manager policy. This is not confirmation
of which database every AWS instance uses. No
memberships were inferred or automatically changed.

## Policy

| Principal | Read records | Assign employees | Product maintenance | Share product to another team |
| --- | --- | --- | --- | --- |
| Company admin | Own company | Active employees in selected record team | Own company | Active teams in own company |
| Manager | Active teams joined as member OR assigned manager | Employees belonging to the record's team | Products owned by accessible teams | No; ask company admin |
| Member of receiving team | Existing role/record permissions remain | Existing role rules remain | Shared catalog product is use-only | No |

Platform roles retain existing assigned-company boundaries. Existing expert-role
policy is not redefined by this feature. Manager-role accounts derive team authority
from active `team_members` OR `team_managers` rows in the same company and an active
team. Ordinary membership is enough; a separate Team Manager/head assignment is
optional. Multiple manager-role members of the SAME team see that team's data;
separate teams require separate memberships/mappings. A manager with neither kind
of mapping sees no team data, including when a
company has zero teams. Unscoped legacy records remain available to company admins.

The external `crm_lc_...` integration key remains a separately authorized
company-wide read-only reporting credential. This feature does not turn that key
into a manager token. Do not distribute it to managers who should see only a team.

## What changed

- Manager team scope fails closed; mixed allowed/forbidden team filters reject.
- Authentication creates a fresh request-local team cache, including cache hits.
  Membership/mapping changes are therefore checked on the next request. To revoke
  access, remove BOTH membership and any explicit manager mapping. Already
  downloaded data cannot be recalled from another user's browser or files.
- User list/search/role helpers enforce team scope; an empty team array never
  means "all users". Managers cannot edit another team's user or manage manager/
  admin accounts. Manager-created employees require one selected managed team and
  are enrolled in that team within the creation transaction.
- The Users screen gives managers a required accessible-team selector when creating
  employees (auto-selected for one team), explains missing team membership, and
  omits manager/expert roles from their role choices. The selected team is kept
  after creation for repeated onboarding; failed team loading disables creation.
- Managers cannot add employees outside their already accessible teams or change
  other managers' memberships/mappings. Ordinary member endpoints also protect
  manager/admin memberships because membership now grants team authority.
  Company admins retain onboarding/mapping authority. Normal employees' roles and
  assigned/shared-record restrictions remain unchanged.
- Lead/customer/task inferred team assignments are checked, not just explicit
  request team IDs. Lead bulk assignment preserves the lead team ahead of product
  ownership. Legacy lead-transfer send/pending/acknowledgment paths check tenant
  and team scope before mutation.
- Recent-update feeds and activity counters filter both leads and customers by
  team. Manager notifications are personal; searchable attendance is scoped to
  employees in managed teams. Existing lead/customer/task/dashboard/performance
  list/detail services use the strengthened central team scope.
- Recent Updates has an explicit permitted-team selector applied to the feed,
  employee/product filters, monthly leaderboard and Excel export. Own-notes mode
  cannot be expanded by another author filter. Sidebar order is Dashboard, My Day,
  Calendar, then Recent Updates; platform/expert navigation is unchanged.
- Product ownership stays in `products.team_id`; additional use permissions are
  stored in `product_team_mappings`. Products do NOT confer access to their
  owner's leads, customers, documents or workflow records.
- Product settings exposes "Share product with teams" to company admins/platform
  operators. Managers see shared items as "Shared product - use only". The lead
  product dropdown includes mapped products for its chosen team.
- Creating a T3 lead with a T1 product shared to T3 creates a T3 lead. Editing,
  deleting or sharing the product remains an owner/admin capability. Product
  ownership changes are admin-only. Revoking a mapping doesn't delete/reassign
  existing records; new product selections and updates validating that product
  must use a currently authorized mapping. Existing records keep their team scope.

## API

`PUT /api/products/:productId/teams` using an authorized admin's normal CRM session:

```json
{ "team_ids": ["ACTUAL_T3_TEAM_ID"] }
```

This replaces the additional-team allowlist. `[]` removes sharing, not ownership.
The server validates every team belongs to the product's company and is active.
The owning team is implicitly allowed and need not be in this array. Mappings
and the audit event are committed together; product changes use a product row lock
during mapping replacement. UI/team codes such as T1 are examples; use actual IDs.

Product responses add `mapped_team_ids`; list responses include `can_manage` and
`can_map_teams` UI hints. These hints are not authorization: writes are independently
checked on the server. Duplicate company product names are still rejected; share
the existing product instead of making copies for every team.

## Deployment prerequisites - do not skip

1. Back up the intended database; verify which DB the AWS backend connects to.
2. In the existing admin Teams screen, review BOTH active memberships and manager
   mappings. Manager-role members now get their teams without a separate manager
   assignment. Do not add everyone to all teams. Audit multi-team memberships;
   the old 13-unmapped-managers count alone no longer indicates missing access.
3. Run `backend/db/migrations/20260916_product_team_mappings.sql` against that
   intended SQL Server database BEFORE deploying the updated product repository.
   This additive migration creates one allowlist table and a composite unique
   product index for foreign-key integrity. It changes no record ownership and
   does not populate sharing permissions automatically. It assumes the existing
   team-access migration and NVARCHAR(20) company/product/team keys are present.
4. Deploy the matching backend and frontend builds; unlike the earlier bot-only
   API release, this change includes UI. No new npm dependency is required.
5. As admin, open Settings -> Products, select the existing product, ensure its
   owning team is set, tick the permitted additional teams, and save team mapping.
6. Verify using two real TEST manager accounts in DIFFERENT teams before releasing
   to users. A browser build alone is not a visual or production permissions test.

Do not run the broad team backfill script blindly: it may choose ownership that
is wrong for these businesses. Managers without either mapping must not get a temporary
company-wide fallback. If rolling application code back, the additive table/index
can remain; no data deletion is necessary. Rollback of authorization changes
would restore old permission weaknesses, so use a controlled maintenance window.

## Acceptance tests

- Manager T1 sees T1 lists, details, dashboard counts and recent updates; T3 IDs
  pasted into a URL or query are denied. Empty/no-team manager gets empty lists.
- Manager T1 can assign a T1 lead only to a T1 employee, including bulk assignment,
  transfer, customer/task ownership and workflow owner pickers.
- T1-only Green HR is absent from T3's product dropdown. Admin maps it to T3;
  T3 can select it, but cannot edit/archive/share it or access T1 records.
- A new T3 lead using shared Green HR stays T3. T1 does not see it merely because
  T1 owns Green HR. Removing the mapping stops future T3 product use.
- Member-only managers see their team's shared products and records, including
  multiple managers joined as ordinary members of the same team.
- Removing BOTH membership and manager mapping takes effect on the next request,
  without logout. Removing only one leaves the other access grant intact.
- A manager with multiple teams can choose which managed team receives a new
  employee. A manager without a team cannot create an unscoped employee. No new
  database migration is required for this membership-policy adjustment.
- No cross-company mapping, out-of-team user update, forged assignment or direct
  API write bypass succeeds. Admin company-wide views continue to work.
- Verify empty states and product mapping at mobile and desktop sizes.

## Automated verification

Run test files separately: the backend suites deliberately use isolated mocked
module graphs. On Node 24, add `--test-isolation=none` if worker spawning is blocked.

```text
node --test tests/team-product-access.test.js
node --test tests/lead-count-integration.test.js
node --test tests/crm-improvements.test.js
node --test tests/crm-services.test.js
```

`tests/product-team-sql.test.js` is opt-in with `CRM_INTEGRATION_SQL_TESTS=1`.
It connects directly through mssql and runs SELECT over fictional inline VALUES:
it neither reads actual CRM rows nor runs migrations or application DB bootstrap.
It checks owner/shared visibility, duplicate-free counts, tenant isolation and
revocation against the real SQL engine. The migration itself still requires a
staging rollout test; it was NOT executed against production by this change.

Frontend checks: `node --test tests/teamScope.test.mjs tests/api.test.mjs` and
`npm run build`. Current Next configuration skips lint/type validation during
build; successful compilation is not a claim that those checks ran.
