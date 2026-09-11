# GreenCRM read-only employee lead-count API

## Status and scope

Implemented in the repository; this does **not** mean it is deployed on AWS.
No production key has been created and no production data has been accessed.

Expected public URL **after deployment and confirmation of the domain's /api proxy**:

`GET https://greencall.online/api/integrations/v1/employee-lead-counts`

Local backend URL: `http://localhost:5000/api/integrations/v1/employee-lead-counts`
(use the actual configured backend port if different).

This independent integration accepts its own expiring opaque key, NOT a CRM
admin login token. It only reads counts for ONE server-configured company.
No SQL credentials, employee contact details, lead records, revenue, CRM write
operations or cross-company access are provided. No schema migration is needed.

## Backend owner: enable after deployment

### Existing PuTTY / Git / PM2 deployment

For this API-only release, do not rebuild the frontend, clear `.next`, or install
new packages. No dependencies or database schema changes are required.

```bash
cd ~/green-crm && git pull --ff-only origin main && cd backend
node scripts/createLeadCountIntegrationKey.js ACTUAL_COMPANY_ID 30
```

Replace `ACTUAL_COMPANY_ID` with the authorized CRM company's ID, not the domain.
Run key generation only in a private terminal. Securely save the raw `crm_lc_...`
key for the developer; the other three printed lines are backend configuration.
Use `nano .env` to add/update those three `CRM_LEAD_COUNTS_*` entries without
removing any existing database/auth settings. Do not put the raw key in `.env`.
Then restart the existing backend process (confirm its name with `pm2 list`):

```bash
pm2 restart green-cr --update-env
pm2 status green-cr
```

`git pull --ff-only` stops safely if server history has diverged. If it fails,
inspect the problem; do not force/reset the server worktree. A GitHub push alone
does not deploy to this server. Validate a successful authenticated GET after the
restart before telling the Python developer the API is live.

1. Confirm the authorized company's actual `company_id` in the CRM. Do not use
   the website domain as the company ID. Only active/trial companies are allowed.
2. From `backend`, run in a **private terminal**, not CI or a shared recording:

   ```text
   node scripts/createLeadCountIntegrationKey.js ACTUAL_COMPANY_ID 30
   ```

3. Put the three printed `CRM_LEAD_COUNTS_*` configuration values in your AWS
   backend environment/secrets configuration. The server stores only the SHA-256
   hash, company scope and UTC expiry; give the raw `crm_lc_...` key securely to
   the trusted Python developer. Do not include a real key in the email below.
4. Restart/redeploy ALL backend instances with the same configuration. Missing
   configuration disables the endpoint (503). Expired/revoked keys cannot fetch.
5. Verify HTTPS and that `/api/integrations/...` proxies to this Express backend,
   not the Next.js frontend. Domain configuration was not verified by this change.
6. Smoke-test on staging first: valid key returns the right company; missing/wrong
   key returns 401; company query overrides return 400; POST/DELETE return 405.
   Compare results with a manual authorized CRM/SQL count, including zero leads
   and reassignment. Test the integration key against `/api/leads`: it must fail.

Rotate by generating a new key, replacing the hash/expiry and restarting all
instances. Revoke by clearing the hash and restarting all instances. Removing
access prevents future fetches; it cannot erase copies already saved by Python.
Agree who can access the local database and how/when those copies are deleted.
This first version supports one company/integration key per backend deployment;
it is not yet a multi-client credential management system.

## Request and response contract

Header: `Authorization: Bearer <RAW_INTEGRATION_KEY>`

No query parameters, request body, pagination or write actions are accepted.
Rows contain exactly the two requested business fields:

```json
{
  "success": true,
  "data": [
    { "employee_name": "Aman", "lead_count": 0 },
    { "employee_name": "Neha", "lead_count": 8 },
    { "employee_name": "Ravi", "lead_count": 12 }
  ],
  "meta": { "fetched_at": "2026-09-11T10:00:00.000Z" }
}
```

The example is fictional. `fetched_at` is response generation time, not a SQL
transaction snapshot guarantee. Responses use `Cache-Control: no-store` to stop
HTTP intermediary caching; the trusted Python application may explicitly persist
the authorized snapshot for its bot.

Count definition:

- Active company users (including company admins/managers), excluding platform roles.
- Leads currently assigned to that user as primary owner; not creator/shared ownership.
- Non-deleted (`leads.is_active = 1`) leads, all statuses, including won/lost, all time.
- Zero-count employees are included. Inactive users and unassigned leads are excluded.
- Rows are grouped by internal user ID, not name, but ID is intentionally not exposed.
  Two employees with the same name remain two rows. The bot must report ambiguity,
  not merge them or guess which one the user means. Stable IDs can be added later.

Errors use the existing `{ "success": false, "error": "...", ... } envelope:

| Status | Meaning | Python action |
| --- | --- | --- |
| 400 | Unsupported filters/body | Fix request; do not retry unchanged |
| 401 | Missing/wrong/expired key | Ask owner for credential renewal |
| 403 | Company missing or not active/trial | Contact CRM owner |
| 405 | Method other than GET | Use GET only |
| 429 | Request limit reached | Back off; do not loop rapidly |
| 500/503 | Failure or integration not configured | Keep old snapshot; mark stale |

Rate limit: 30 authenticated requests/minute/company/backend process, plus the
existing global IP/path limiter. It is an in-memory safeguard, not a global
multi-instance quota. Use an edge/Redis limiter if a global limit is required.
For this learning project, manual sync or a 5-minute polling interval is enough.

## Python developer: first call on your own computer

Install Python 3. Configure `GREENCRM_API_URL` with the full endpoint and
`GREENCRM_API_KEY` with the securely supplied raw key in your local environment.
Keep keys out of source code, Git, browser JavaScript, URLs, screenshots and logs.
Do not install the CRM or Microsoft SQL Server on your laptop.

This minimal connectivity example uses Python's standard library (no pip package):

```python
import json
import os
from urllib.request import Request, HTTPRedirectHandler, build_opener

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Do not forward our key to a redirected destination.

request = Request(
    os.environ["GREENCRM_API_URL"],
    headers={
        "Authorization": "Bearer " + os.environ["GREENCRM_API_KEY"],
        "Accept": "application/json",
    },
    method="GET",
)
with build_opener(NoRedirect()).open(request, timeout=15) as response:
    payload = json.load(response)

if payload.get("success") is not True or not isinstance(payload.get("data"), list):
    raise ValueError("Invalid API response; keep the previous saved snapshot")

for employee in payload["data"]:
    print(employee["employee_name"], employee["lead_count"])
```

Save as `check_crm.py`, set the environment variables in the same terminal and run
`python check_crm.py` (or `py check_crm.py` on Windows). This is only a first-call
example, not a complete sync service: add validation and error handling below.
Never disable HTTPS certificate verification or blindly follow a redirect to a
different host with this credential; use the confirmed final API URL directly.

## Separate Python database and bot assignment

`CRM API -> Python connector -> local SQLite snapshot -> bot -> user answer`

1. Validate HTTP success, JSON envelope and EVERY row before changing local data:
   name must be a string, count a nonnegative integer. Treat additional future
   fields as optional; do not require an exact set of object keys.
2. Use SQLite for the first local version. Store a source identifier (`greencrm`),
   employee name, lead count and snapshot sync time. Local row IDs are NOT CRM IDs.
3. On a successful fetch, replace the **entire GreenCRM current snapshot in one
   transaction**; do not append repeated counts or upsert by employee name. An
   empty successful array is a valid empty snapshot. Other products' rows must
   remain untouched. Preserve duplicate-name rows.
4. On timeout, invalid response, auth failure or API failure, keep the prior
   snapshot and record a sync error separately. Never overwrite it with zero.
5. The bot answers ONLY from its local saved snapshot and always shows last-sync
   time. It is not live CRM data until refreshed. If no successful sync exists,
   say data is unavailable. Surface stale data rather than claiming it is current.
6. Support all employee counts, one named employee, and highest count (include
   ties). For duplicate names say the identity is ambiguous. Revenue, lead details,
   individual lead deletion and lead-status questions are unsupported by this API.
7. Keep connector, snapshot storage and question/answer logic separate. Later add
   `justjob` and `greenhr` connectors with their OWN endpoints, keys, permissions
   and domain-specific tables. Those integrations are not provided yet. Do not
   assume different products share the CRM response format.
8. Start as a local console app. A laptop-off bot does not keep syncing. A shared
   hosted bot later needs deployment, requester authentication and answer-level
   permissions; never expose company-wide data in a public unauthenticated chat.

Deliver: runnable Python project, README, dependency list if any, configuration
example WITHOUT secrets, sample fixture and tests. Demonstrate first sync, changed
counts after refresh, no duplicate growth on repeated sync, zero/empty data,
duplicate names, ties, expired token and failed refresh preserving old data.

## Copy-paste email (send after deployment and smoke tests)

**Subject: Assignment - Separate Python CRM Reporting Bot (Read-only API)**

Hi [Name],

Please build a separate Python application on your computer. We will provide a
read-only GreenCRM API. You do not need our CRM source code or SQL Server access.

API: https://greencall.online/api/integrations/v1/employee-lead-counts
Method: GET
Authentication: Authorization: Bearer <key shared securely separately>

The API returns employee_name and lead_count in the `data` array, plus a
`meta.fetched_at` timestamp. It does not provide lead details, revenue, customer
contact information or create/update/delete access.

Your task:

1. Call the API from Python and validate the response.
2. Save its latest complete snapshot in your own local SQLite database.
3. Build a console bot that answers from that saved database: all employees'
   counts, a named employee's count and who has the highest count.
4. Show last-sync time. On failed sync keep the old snapshot and show a warning.
   Never invent data or answer unsupported questions such as revenue.
5. Preserve duplicate-name rows and report ambiguity. Repeated syncs must not
   duplicate counts. Replace only this source's snapshot atomically.
6. Keep API connector, database storage and bot logic separate. Later we may give
   you JustJob and GreenHR APIs; add separate connectors for those products.

First demonstrate API fetch and database save; then add bot questions. Start with
sample JSON if credentials are not available yet. Please share the runnable
project, setup README and tests. Do not commit or share API keys or actual data.

Attached/reference: this API guide and sample response. The access key and expiry
will be shared through a secure channel after deployment verification.

Thanks,
[Your Name]
