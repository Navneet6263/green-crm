# GreenCRM Backend Guide

This guide explains where backend code belongs and how to add an API safely.
It follows the existing project structure; no folder reorganisation is required.

## 1. Technology

- Node.js and Express: run the server and handle HTTP requests.
- JavaScript with CommonJS: use `require()` and `module.exports`.
- Microsoft SQL Server: stores CRM data; the project uses the `mssql` driver.
- Node's built-in test runner: tests backend behaviour.

## 2. Main folder structure

```text
backend/
├── server.js             Starts the server, database initialization and jobs
├── app.js                Configures Express, middleware and API routes
├── routes/               Defines API URLs, HTTP methods and route middleware
│   ├── index.js          Registers route groups under /api
│   └── productRoutes.js  Example feature routes
├── controllers/          Reads HTTP inputs, calls services, sends responses
├── services/             Validates input, checks permissions, applies business rules
├── repositories/         Runs database queries
├── db/
│   ├── connection.js     SQL Server connection, query helper and transactions
│   ├── schema.js         Database schema definitions
│   └── migrations/       Versioned database changes
├── middlewares/          Authentication, response wrapping and error handling
├── constants/            Shared roles and fixed application values
├── utils/                Small reusable helpers: IDs, pagination, errors
├── tests/                Automated tests
├── docs/                 Backend documentation
├── package.json          Dependencies and run commands
└── .env                  Local configuration and secrets; never commit
```

Supporting folders: `jobs/` contains background jobs, `providers/` contains
external communication integrations, and `scripts/` contains maintenance tools.
`uploads/` and `reports/` contain files/data, not API business logic.
Use the existing `middlewares/` convention for new middleware.

## 3. How a request works

```text
Client request
  → Route + authentication middleware
  → Controller
  → Service: validate input and check company/team/role permissions
  → Repository: execute a parameterized SQL query
  → SQL Server
  → Result returns through service and controller
  → JSON response
```

Example: `GET /api/products`

1. `routes/index.js` registers `/products`.
2. `routes/productRoutes.js` authenticates the request and selects the controller.
3. `controllers/productController.js` calls `productService.listProducts()`.
4. `services/productService.js` determines the allowed company and teams.
5. `repositories/productRepository.js` queries only permitted products.
6. The controller returns the result; response middleware formats the JSON.

**Keep controllers small. Put business rules in services and SQL in repositories.**

## 4. Adding an API

For an existing feature, extend its existing files. For a new feature, follow
the same naming pattern: `featureRoutes.js`, `featureController.js`,
`featureService.js`, `featureRepository.js`.

1. Define the method, URL, inputs, response and allowed roles.
2. Add parameterized SQL in the repository. Never concatenate user input into SQL.
3. Validate inputs and enforce permissions in the service.
4. Add the controller and route. Use the existing `asyncHandler` and `AppError`.
5. Register a new route group in `routes/index.js`, if needed.
6. Add tests for success, invalid input and forbidden access.

Reuse existing pagination and response helpers. Keep existing API fields working.
Use `db.withTransaction()` when several writes must succeed or fail together,
and pass its transaction executor to every participating repository call.

## 5. CRM access rules

- Use authenticated identity from `req.auth`; do not trust a body-supplied role or
  company ID as permission. Use the existing company/team access helpers.
- A manager can access active teams where they are an active member or explicitly
  assigned team manager. No team access means no company-wide fallback.
- A lead can only be assigned to an eligible employee in that lead's team.
- Sharing a product with another team does not share the owner's leads/customers.
- Regular employees keep their role and assignment restrictions.
- Check access for list, detail, update, delete and export endpoints—not just lists.
- Never expose passwords, tokens or unnecessary customer data in responses/logs.
  Do not paste credentials or real customer data into AI tools.

## 6. Local setup and checks

Ask your mentor for an approved development database and local `.env` settings.
Do not point an intern's local backend at production: startup can create/update
database structures and start background jobs. The example configuration is a
template, not production credentials.

From the project root:

```text
cd backend
npm install
npm run dev
```

On Windows PowerShell, use `npm.cmd` if script execution blocks `npm`.
The default API base is `http://localhost:5000/api`.
`GET /health` checks the server process, not database readiness.

Run tests separately from `backend/`:

```text
node --test tests/team-product-access.test.js
node --test tests/crm-services.test.js
node --test tests/crm-improvements.test.js
node --test tests/lead-count-integration.test.js
```

If Node 24 reports a test-worker `spawn EPERM`, add `--test-isolation=none`
and keep running one test file per command.

Before review: test an allowed user, an unauthorized user, a different team and
a different company. Share the changed files, API examples with dummy data and
test results. Get mentor approval before running migrations, maintenance scripts
or deployments. Never commit `.env`, credentials, uploads or database exports.
