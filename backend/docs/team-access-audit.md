# Team Access Audit

## Scope audited
- Leads
- Customers
- Tasks
- Products
- Dashboard summary
- Workflow tracker/history/doc actions
- Communications email actions (lead/customer)
- Bulk lead upload
- Product stats / user product history
- User/team-scoped lookup paths used by workflow/dashboard

## Scope note
- No dedicated backend report/export controller set exists yet beyond dashboard summary, lead product stats/history, workflow history, and bulk lead import. Those existing analytics-style endpoints were included in the audit.

## Backend paths fixed

### Leads
- `GET /leads`
- `GET /leads/:leadId`
- `POST /leads`
- `PUT|PATCH /leads/:leadId`
- `DELETE /leads/:leadId`
- `POST /leads/:leadId/assign`
- `POST /leads/assign`
- `POST /leads/:leadId/notes`
- `POST /leads/:leadId/activities`
- `GET /leads/reminders`
- `GET /leads/stats/products`
- `GET /leads/user/product-history`
- `POST /leads/bulk-upload`

### Customers
- `GET /customers`
- `GET /customers/:customerId`
- `POST /customers`
- `PUT|PATCH /customers/:customerId`
- `DELETE /customers/:customerId`
- `POST /customers/:customerId/notes`
- `POST /customers/:customerId/followups`

### Tasks
- `GET /tasks`
- `GET /tasks/:taskId`
- `POST /tasks`
- `PUT|PATCH /tasks/:taskId`
- `DELETE /tasks/:taskId`

### Products
- `GET /products`
- `POST /products`
- `PUT|PATCH /products/:productId`
- `DELETE /products/:productId`
- service-level `enableProductForCompany(...)`

### Dashboard
- `GET /dashboard/summary`

### Workflow
- `GET /workflow/my-assigned`
- `GET /workflow/tracker`
- `GET /workflow/my-history`
- `GET /workflow/users/:role`
- `POST /workflow/:leadId/transfer-to-legal`
- `POST /workflow/:leadId/transfer-to-finance`
- `POST /workflow/:leadId/complete`
- `POST /workflow/:leadId/legal/upload`
- `POST /workflow/:leadId/finance/upload`
- `DELETE /workflow/:leadId/legal/delete/:docId`
- `DELETE /workflow/:leadId/finance/delete/:docId`

### Communications
- `POST /communications/send`
  - audited via `leadService.getLead(...)` and `customerService.getCustomer(...)`

## Enforcement notes
- Team scope is resolved centrally through `accessScopeService`.
- Managers are restricted to managed/member teams only.
- Admin remains company-wide.
- Legacy companies with zero teams still read safely through compatibility fallback.
- New companies seeded through registration / company creation now get an initial team automatically when an admin user is created.
- Assignee integrity is enforced so lead/customer/task owners must belong to the record team when a team exists.

## Audit findings
- Empty `teamIds` arrays on some super-admin/platform paths could collapse queries to `1 = 0`; fixed by normalizing empty requests to `null`.
- Manager dashboard cache key was company-wide and could leak cached scope between managers in the same company; fixed with user/team-aware cache keys.
- Workflow assignee changes needed same-team validation; fixed.
- Product repository insert placeholder count was incorrect; fixed.
- Sales/marketing dashboard recent activity was not respecting assigned-scope filtering; fixed.
- Team-scoped user lookups were only checking `team_members`; fixed to include `team_managers` as well.
- Support/viewer/legal/finance roles had a few reminder/dashboard/detail paths still wider than self-assigned scope; fixed.
- Lead product stats/history endpoints now preserve non-admin self-scope instead of allowing arbitrary company-wide lookups.
- Platform operators can no longer pass arbitrary `team_ids` without company context; requested team scope is now validated against their accessible companies.
- Product list endpoints for platform operators now respect accessible company scope even when `company_id` is omitted.

## Backfill / rollout support
- Migration SQL: `backend/db/migrations/20260412_team_access_control.sql`
- Validation SQL: `backend/db/migrations/20260412_team_access_control_validation.sql`
- Backfill script: `backend/scripts/backfillTeamOwnership.js`
