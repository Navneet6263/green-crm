# CRM Build Document — Part 2
### API Endpoints + Next.js Structure + AWS Deployment + Dashboard Design
> Part 1 padh ke aao pehle. Ye document usi ka continuation hai.

---

## BACKEND — SABHI API ENDPOINTS

> Ye exact routes teri existing Green CRM ke `app.js` aur routes folder se hain.
> Naye project me same structure follow karna — sirf Express ki jagah Next.js API routes use karna.

### Base URL
```
Development:  http://localhost:5000/api
Production:   https://api.yourdomain.com/api
```

---

### AUTH ROUTES — `/api/auth`

```
POST   /api/auth/register              → Naya user register
POST   /api/auth/login                 → Login (rate limited: 50/15min)
GET    /api/auth/check-auth            → Token valid hai ya nahi
POST   /api/auth/logout                → Token blacklist me daalo
POST   /api/auth/forgot-password       → OTP bhejo reset ke liye
POST   /api/auth/reset-password        → Naya password set karo
GET    /api/auth/verify                → [AUTH] Token verify
GET    /api/auth/profile               → [AUTH] Apna profile dekho
PUT    /api/auth/profile               → [AUTH] Profile update karo
PUT    /api/auth/change-password       → [AUTH] Password change karo
GET    /api/auth/users                 → [AUTH] Company ke users list
POST   /api/auth/create-employee       → [AUTH] Naya employee banao
PUT    /api/auth/users/:id/toggle      → [AUTH] User active/inactive karo
PUT    /api/auth/users/:id             → [AUTH] User update karo
DELETE /api/auth/users/:id             → [AUTH] User delete karo
GET    /api/auth/super-admin-status    → Super admin count check
```

---

### LEAD ROUTES — `/api/leads`

```
GET    /api/leads                      → [AUTH] Sabhi leads (company filtered)
POST   /api/leads                      → [AUTH] Naya lead banao
GET    /api/leads/my-leads             → [AUTH] Sirf mujhe assigned leads
GET    /api/leads/stats/products       → [AUTH] Product wise lead stats
GET    /api/leads/user/product-history → [AUTH] User ka product history
POST   /api/leads/assign               → [AUTH] Lead assign karo
GET    /api/leads/product/:productId   → [AUTH] Product ke leads
GET    /api/leads/:id                  → [AUTH] Single lead detail
PUT    /api/leads/:id                  → [AUTH] Lead update karo
DELETE /api/leads/:id                  → [AUTH] Lead delete karo
POST   /api/leads/:id/notes            → [AUTH] Note add karo
POST   /api/leads/:id/activity         → [AUTH] Activity log karo
POST   /api/leads/:id/score            → [AUTH] AI score calculate karo
POST   /api/leads/bulk-upload          → Bulk CSV upload
```

---

### WORKFLOW ROUTES — `/api/workflow`

```
GET    /api/workflow/my-assigned           → [AUTH] Mujhe assigned workflow leads
GET    /api/workflow/tracker               → [AUTH] Full workflow tracker (admin/manager)
GET    /api/workflow/my-history            → [AUTH] Mera workflow history
GET    /api/workflow/users/:role           → [AUTH] Role ke users list (legal/finance)

POST   /api/workflow/:id/transfer-to-legal   → [AUTH] Sales → Legal transfer
POST   /api/workflow/:id/transfer-to-finance → [AUTH] Legal → Finance transfer
POST   /api/workflow/:id/complete            → [AUTH] Finance → Completed

POST   /api/workflow/:id/legal/upload        → [AUTH] Legal documents upload
POST   /api/workflow/:id/finance/upload      → [AUTH] Finance documents upload
DELETE /api/workflow/:id/legal/delete/:docId → [AUTH] Legal doc delete
DELETE /api/workflow/:id/finance/delete/:docId → [AUTH] Finance doc delete

POST   /api/workflow/send-document-email     → [AUTH] Document email bhejo
```

---

### CUSTOMER ROUTES — `/api/customers`

```
GET    /api/customers          → [AUTH] Sabhi customers
POST   /api/customers          → [AUTH] Naya customer banao
GET    /api/customers/:id      → [AUTH] Single customer
PUT    /api/customers/:id      → [AUTH] Customer update
DELETE /api/customers/:id      → [AUTH] Customer delete
POST   /api/customers/:id/notes      → [AUTH] Note add karo
POST   /api/customers/:id/followups  → [AUTH] Follow-up add karo
```

---

### COMPANY ROUTES — `/api/companies`

```
GET    /api/companies          → [SUPER ADMIN] Sabhi companies
POST   /api/companies          → [SUPER ADMIN] Naya company banao
GET    /api/companies/:id      → [AUTH] Company detail
PUT    /api/companies/:id      → [AUTH] Company update
DELETE /api/companies/:id      → [SUPER ADMIN] Company delete
GET    /api/companies/:id/stats → [AUTH] Company usage stats
```

---

### SUPER ADMIN ROUTES — `/api/super-admin`

```
GET    /api/super-admin/users                    → Sabhi super admins + admins
POST   /api/super-admin/create-super-admin       → Naya super admin banao
PUT    /api/super-admin/deactivate/:userId        → User deactivate karo
PUT    /api/super-admin/activate/:userId          → User activate karo
PUT    /api/super-admin/reset-password/:userId    → Password reset karo
GET    /api/super-admin/safety-status             → Super admin safety check
```

---

### BAAKI ROUTES (Short list)

```
/api/products          → CRUD products
/api/tasks             → CRUD tasks
/api/calendar          → CRUD calendar events
/api/communications    → CRUD communications log
/api/notifications     → Get/mark read notifications
/api/analytics         → CRM usage analytics, activity log
/api/performance       → User performance reports
/api/settings          → Company settings update
/api/support           → Support tickets CRUD
/api/otp               → OTP send/verify
/api/demo-requests     → Demo request form
/api/ai                → AI lead scoring
```

---

## NEXT.JS — PAGES STRUCTURE

> Naye CRM me Next.js App Router use karna (Next.js 14+).
> Har page ke saath middleware se role check hoga.

```
/app
  /                          → Redirect → /login ya /dashboard
  /login                     → Login page (public)
  /register                  → Register page (public)
  /forgot-password           → Forgot password (public)

  /dashboard                 → Role ke hisaab se alag dashboard
  
  /leads
    /                        → Leads list (filter + search)
    /new                     → Naya lead form
    /[id]                    → Lead detail page
    /[id]/edit               → Lead edit form
    /history                 → Lead history + advanced filters
  
  /workflow
    /                        → Workflow tracker (admin/manager)
    /legal                   → Legal queue
    /finance                 → Finance queue
  
  /customers
    /                        → Customers list
    /new                     → Naya customer
    /[id]                    → Customer detail
  
  /tasks                     → Tasks (kanban ya list)
  /calendar                  → Calendar view
  /communications            → Communication log
  /analytics                 → Analytics dashboard
  /performance               → Team performance
  
  /settings
    /profile                 → Apna profile
    /company                 → Company settings (admin only)
    /users                   → Team management (admin only)
    /products                → Products manage (admin only)
  
  /support                   → Support tickets
  
  /super-admin               → Super admin panel (super-admin only)
    /companies               → All companies
    /users                   → All users
    /audit-logs              → Audit logs
    /demo-requests           → Demo requests
```

### Middleware (Next.js middleware.ts)
```typescript
// middleware.ts — root level
// Ye har request pe chalega

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password']

export function middleware(request) {
  const token = request.cookies.get('authToken')
  const path = request.nextUrl.pathname

  // Public routes — token nahi chahiye
  if (PUBLIC_ROUTES.includes(path)) return NextResponse.next()

  // Token nahi hai → login pe bhejo
  if (!token) return NextResponse.redirect('/login')

  // Super admin routes — role check
  if (path.startsWith('/super-admin') && role !== 'super-admin') {
    return NextResponse.redirect('/dashboard')
  }
}
```

---

## NEXT.JS — API ROUTES STRUCTURE

> Next.js me backend bhi rakh sakte ho `/app/api/` me.
> Lekin tera 3-layer architecture hai — Node.js alag server hai.
> Next.js sirf frontend + proxy ka kaam karega.

```
/app/api
  /auth
    /login/route.ts          → POST — Node backend ko forward karo
    /logout/route.ts         → POST
    /profile/route.ts        → GET, PUT
  
  /leads
    /route.ts                → GET (list), POST (create)
    /[id]/route.ts           → GET, PUT, DELETE
    /[id]/notes/route.ts     → POST
  
  /workflow
    /[id]/transfer/route.ts  → POST
    /[id]/upload/route.ts    → POST (multipart)
  
  ... (baaki bhi same pattern)
```

**Ya seedha Node.js backend call karo frontend se:**
```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL // Node.js server URL

export const api = {
  get: (path) => fetch(`${API_BASE}${path}`, { credentials: 'include' }),
  post: (path, body) => fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include'
  })
}
```

---

## DASHBOARD ARRANGEMENT — MERA SUGGESTION

> Navneet, ye ek important section hai. Dashboard galat arrange kiya toh baad me bahut problem hogi.
> Ye mera suggestion hai based on existing Green CRM ke issues.

### Problem jo abhi hai:
Dashboard pe sab kuch ek saath load hota hai — analytics, leads, tasks, notifications.
1 crore users pe ye page 10+ seconds le sakta hai.

### Solution — Widget-based Lazy Dashboard

```
DASHBOARD LAYOUT:
┌─────────────────────────────────────────────────────┐
│  TOP BAR: Search | Notifications bell | Profile     │
├──────────┬──────────────────────────────────────────┤
│          │  HEADER: "Good morning, Navneet"         │
│ SIDEBAR  │  Date | Quick actions                    │
│          ├──────────────────────────────────────────┤
│ (role    │  ROW 1 — KPI Cards (load first, fast)    │
│  based)  │  [Total Leads] [My Leads] [Tasks Due]    │
│          │  [Closed Won]  [Follow-ups Today]        │
│          ├──────────────────────────────────────────┤
│          │  ROW 2 — (lazy load after KPIs)          │
│          │  [Recent Leads table] | [Tasks list]     │
│          ├──────────────────────────────────────────┤
│          │  ROW 3 — (lazy load last)                │
│          │  [Pipeline chart] | [Activity feed]      │
└──────────┴──────────────────────────────────────────┘
```

### Har role ka dashboard alag hoga:

**Super Admin Dashboard:**
```
KPI: Total Companies | Total Users | Total Leads (all) | Revenue
Row 2: Companies list | Recent signups
Row 3: System health | Audit log feed
```

**Admin Dashboard:**
```
KPI: Total Leads | Open Leads | Closed Won | Team Size
Row 2: Lead pipeline chart | Top performers
Row 3: Recent activities | Pending tasks
```

**Manager Dashboard:**
```
KPI: Team leads | My team's closed | Follow-ups today | Overdue tasks
Row 2: Team performance table | Lead status breakdown
Row 3: Recent lead updates
```

**Sales Rep Dashboard:**
```
KPI: My leads | Follow-ups today | Tasks due | Closed this month
Row 2: My recent leads | My tasks
Row 3: My calendar events
```

**Legal Team Dashboard:**
```
KPI: Pending legal leads | Documents uploaded | Approved today
Row 2: Legal queue table
Row 3: Recent document activity
```

**Finance Team Dashboard:**
```
KPI: Pending finance leads | Invoices raised | Completed today
Row 2: Finance queue table
Row 3: Invoice summary
```

### Dashboard Loading Strategy:
```
1. Page load → KPI cards fetch (fast, simple COUNT queries)
2. After 100ms → Row 2 widgets fetch (medium complexity)
3. After Row 2 loads → Row 3 widgets fetch (heavy charts)
4. Notifications → Separate polling every 30 seconds
```

---

## 1 CRORE USERS KE LIYE MYSQL SCALING

> Navneet, ye section bahut important hai. Galat DB design kiya toh 1 lakh users pe hi slow ho jaayega.

### Rule 1 — Har query me company_id pehle aao
```sql
-- WRONG (slow)
SELECT * FROM leads WHERE assigned_to = 123

-- CORRECT (fast — company_id index use hoga)
SELECT * FROM leads WHERE company_id = 5 AND assigned_to = 123
```

### Rule 2 — Pagination mandatory hai
```sql
-- Kabhi bhi SELECT * without LIMIT mat karo
SELECT * FROM leads
WHERE company_id = 5
ORDER BY created_at DESC
LIMIT 20 OFFSET 0   -- page 1
LIMIT 20 OFFSET 20  -- page 2
```

### Rule 3 — FULLTEXT search ke liye MySQL FULLTEXT index
```sql
-- leads table me ye already hai:
FULLTEXT INDEX ft_leads_search (contact_person, company_name, email, phone)

-- Use karo:
SELECT * FROM leads
WHERE company_id = 5
AND MATCH(contact_person, company_name, email, phone)
    AGAINST ('navneet' IN BOOLEAN MODE)
LIMIT 20
```

### Rule 4 — Analytics ke liye alag queries
```sql
-- Dashboard KPI — fast COUNT
SELECT COUNT(*) as total FROM leads WHERE company_id = 5 AND is_active = 1

-- Heavy analytics — schedule karo, cache karo
-- Raat ko run karo, result store karo ek summary table me
```

### Rule 5 — Connection pooling
```javascript
// database.js
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,    // max 10 connections
  waitForConnections: true,
  queueLimit: 0
})
```

### Rule 6 — Indexes jo banana zaroori hai
```sql
-- Ye indexes Part 1 me bhi hain, but yaad rakhna:
leads:     (company_id, is_active, created_at)
leads:     (company_id, assigned_to, is_active)
leads:     (company_id, status, priority)
leads:     (company_id, workflow_stage, is_active)
users:     (company_id, is_active, role)
audit_logs:(company_id, action, logged_at)
```

### Rule 7 — Soft delete use karo
```sql
-- DELETE mat karo, is_active = false karo
UPDATE leads SET is_active = 0 WHERE id = 123

-- Har query me filter:
WHERE is_active = 1
```

---

## AWS DEPLOYMENT — SAME JAISE GREEN CRM

> Navneet, Green CRM jo chal raha hai usi pattern pe naya CRM bhi deploy karna hai.
> 3 layer hai — frontend, backend, database — teeno alag alag AWS services pe.

### Architecture Diagram
```
Internet
    │
    ▼
┌─────────────────────────────────────────┐
│  Route 53 (DNS)                         │
│  yourdomain.com → CloudFront            │
│  api.yourdomain.com → Load Balancer     │
└──────────┬──────────────────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌──────────────────────┐
│CloudFront│  │  Application Load   │
│(Next.js) │  │  Balancer (ALB)     │
│  + S3   │  └──────────┬───────────┘
└────────┘              │
                        ▼
               ┌─────────────────┐
               │  EC2 Instance   │
               │  Node.js server │
               │  (t3.medium)    │
               └────────┬────────┘
                        │
                        ▼
               ┌─────────────────┐
               │  RDS MySQL      │
               │  (db.t3.medium) │
               │  Multi-AZ       │
               └─────────────────┘
```

### Step by Step Deployment

**Step 1 — RDS MySQL Setup**
```
AWS Console → RDS → Create Database
  Engine: MySQL 8.0
  Template: Free tier (dev) / Production (live)
  DB Instance: db.t3.micro (start) → db.t3.medium (scale)
  Storage: 20 GB gp2 (auto scaling on)
  Multi-AZ: Yes (production me)
  VPC: Default ya custom
  Public access: NO (sirf EC2 se connect hoga)
  
  Note karo:
  - Endpoint URL (DB_HOST)
  - Port: 3306
  - Username, Password
```

**Step 2 — EC2 Node.js Server**
```
AWS Console → EC2 → Launch Instance
  AMI: Ubuntu 22.04 LTS
  Instance type: t3.medium (2 vCPU, 4GB RAM)
  Key pair: Create new → download .pem file
  Security Group:
    - Port 22 (SSH) — sirf teri IP se
    - Port 5000 (Node.js) — ALB se only
    - Port 80, 443 — ALB se only

SSH karke setup karo:
  sudo apt update
  sudo apt install nodejs npm nginx -y
  npm install -g pm2

Upload karo code:
  git clone ya scp se

.env set karo:
  DB_HOST=rds-endpoint.amazonaws.com
  DB_USER=admin
  DB_PASSWORD=yourpassword
  DB_NAME=crm_db
  JWT_SECRET=long-random-string-min-32-chars
  NODE_ENV=production
  PORT=5000

Run karo:
  npm install
  node db/migrate.js   (migrations run karo)
  pm2 start server.js --name crm-backend
  pm2 startup          (auto restart on reboot)
  pm2 save
```

**Step 3 — Next.js Frontend (S3 + CloudFront)**
```
Option A — Static Export (recommended for speed):
  next.config.js me: output: 'export'
  npm run build
  
  S3 bucket banao:
    Name: crm-frontend-prod
    Public access: Block all (CloudFront se serve hoga)
    Static website hosting: Enable
  
  Upload:
    aws s3 sync ./out s3://crm-frontend-prod
  
  CloudFront distribution:
    Origin: S3 bucket
    Default root object: index.html
    Error pages: 404 → /index.html (SPA ke liye)
    HTTPS: Certificate Manager se free SSL

Option B — EC2 pe Next.js server (agar SSR chahiye):
  Alag EC2 instance pe:
    npm run build
    pm2 start npm --name crm-frontend -- start
```

**Step 4 — Load Balancer (ALB)**
```
AWS Console → EC2 → Load Balancers → Create
  Type: Application Load Balancer
  Scheme: Internet-facing
  Listeners: 80 (HTTP) → redirect to 443
             443 (HTTPS) → forward to EC2
  Target Group: EC2 instance, port 5000
  Health check: GET /api/health → 200 OK
```

**Step 5 — Domain + SSL**
```
Route 53:
  yourdomain.com → CloudFront (A record alias)
  api.yourdomain.com → ALB (A record alias)

Certificate Manager (ACM):
  Request certificate for:
    yourdomain.com
    *.yourdomain.com
  Validation: DNS validation (Route 53 me auto add)
```

**Step 6 — File Uploads (S3)**
```
Documents (legal/finance) local disk pe mat rakho.
S3 bucket banao:
  Name: crm-uploads-prod
  Public access: Block all
  
Backend me:
  npm install @aws-sdk/client-s3
  
  Upload ke time:
    S3 me file daalo → URL store karo DB me
  
  Download ke time:
    Presigned URL generate karo (15 min expiry)
    User ko direct S3 se download hoga
```

### Environment Variables (.env)
```env
# Database
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=StrongPassword123!
DB_NAME=crm_production

# JWT
JWT_SECRET=minimum-32-character-random-string-here
JWT_EXPIRES_IN=7d

# App
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

# AWS S3 (file uploads)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=crm-uploads-prod

# Email (SMTP)
SMTP_HOST=email-smtp.ap-south-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-user
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=noreply@yourdomain.com

# Rate limiting
MAX_SUPER_ADMINS=4
```

---

## CRON JOBS — BACKGROUND TASKS

> Ye existing Green CRM me `startup/cron.js` me hain. Naye me bhi banana hai.

```javascript
// Ye kaam karte hain background me:

1. Lead Reminder Cron (har 15 min)
   → Follow-up date aane wali leads ke liye notification bhejo

2. Task Reminder Cron (har 5 min)
   → Due tasks ke liye notification (15min, 10min, 5min pehle)

3. Lead Assignment Cron (har 1 ghanta)
   → Auto-assignment mode on hai toh unassigned leads distribute karo

4. Token Blacklist Cleanup (roz raat 2 baje)
   → Expired tokens token_blacklist se delete karo
   DELETE FROM token_blacklist WHERE expires_at < NOW()

5. Export Count Reset (roz midnight)
   → daily_export_count = 0 for all users
```

---

## IMPORTANT PROBLEMS — NAYE CRM ME AVOID KARNA

> Navneet, ye problems existing Green CRM me hain ya scale pe aayengi.
> Pehle se plan karo.

**Problem 1: File uploads local disk pe hain**
- Existing code: `uploads/workflow/` folder me files save hoti hain
- EC2 restart hone pe ya naya instance aane pe sab files chali jaayengi
- Solution: S3 use karo. Upar deployment section me bataya hai.

**Problem 2: JWT secret weak ho sakta hai**
- Agar `JWT_SECRET=secret123` rakha toh brute force possible hai
- Solution: Minimum 32 character random string use karo
- Generate karo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Problem 3: N+1 Query problem**
- Existing `hydrateLeadList()` me har lead ke liye alag DB query hai
- 100 leads = 100+ DB queries = slow
- Solution: JOIN queries use karo ya batch fetch karo
```sql
-- WRONG (N+1)
leads.forEach(lead => db('users').where({id: lead.assigned_to}))

-- CORRECT (1 query)
SELECT l.*, u.name as assigned_name
FROM leads l
LEFT JOIN users u ON l.assigned_to = u.id
WHERE l.company_id = 5
```

**Problem 4: Dashboard analytics heavy queries**
- COUNT, SUM, GROUP BY queries dashboard pe real-time chalana slow hai
- Solution: `analytics_cache` table banao, roz raat update karo
```sql
CREATE TABLE analytics_cache (
  company_id BIGINT,
  metric_key VARCHAR(100),
  metric_value JSON,
  cached_at TIMESTAMP,
  PRIMARY KEY (company_id, metric_key)
)
```

**Problem 5: CORS configuration**
- Development me `*` allowed hai — production me band karo
- Solution: `.env` me `FRONTEND_URL` set karo aur sirf wahi allow karo

**Problem 6: Password reset OTP expiry**
- OTP ka expiry time DB me store karo
- 10 minute ke baad OTP invalid ho jaaye
- Ek OTP sirf ek baar use ho

**Problem 7: Bulk upload validation nahi**
- CSV bulk upload me koi validation nahi hai
- 10,000 invalid rows upload ho sakti hain
- Solution: Pehle validate karo, phir insert karo. Errors return karo row-wise.

---

## QUICK START — NAYA PROJECT BANANE KE STEPS

```
Step 1: Folder structure banao
  mkdir crm-project
  cd crm-project
  mkdir frontend backend db

Step 2: Backend setup
  cd backend
  npm init -y
  npm install express knex mysql2 bcryptjs jsonwebtoken
              cors helmet compression cookie-parser
              express-rate-limit multer nodemailer
              dotenv winston

Step 3: Database migrations
  cd db
  -- Part 1 ke schema se migrations banao
  -- 001_core_tables.sql
  -- 002_lead_tables.sql
  -- 003_customer_tables.sql
  -- 004_operations_tables.sql
  -- 005_support_audit_tables.sql

Step 4: Frontend setup
  cd frontend
  npx create-next-app@latest . --typescript --tailwind --app

Step 5: Environment variables
  backend/.env  → DB, JWT, SMTP, AWS config
  frontend/.env.local → NEXT_PUBLIC_API_URL=http://localhost:5000/api

Step 6: Run karo
  backend:  node server.js (ya pm2)
  frontend: npm run dev

Step 7: AWS deploy
  Upar deployment section follow karo
```

---

## CHECKLIST — BUILD KARNE SE PEHLE

```
Database:
  [ ] Sabhi 5 migration files ready hain
  [ ] Indexes sahi hain (Part 1 dekho)
  [ ] company_id har table me hai
  [ ] Soft delete (is_active) har main table me hai

Backend:
  [ ] JWT_SECRET strong hai (32+ chars)
  [ ] Rate limiting laga hai (login, API)
  [ ] Audit logging laga hai
  [ ] company_id filter har query me hai
  [ ] Pagination har list endpoint pe hai
  [ ] Error handling middleware hai
  [ ] CORS sirf frontend URL allow karta hai

Frontend:
  [ ] Auth middleware hai (Next.js middleware.ts)
  [ ] Role-based sidebar hai
  [ ] Dashboard lazy loading hai
  [ ] API error handling hai
  [ ] Loading states hain

AWS:
  [ ] RDS private subnet me hai
  [ ] EC2 security group tight hai
  [ ] S3 public access blocked hai
  [ ] SSL certificate laga hai
  [ ] PM2 se Node.js chal raha hai
  [ ] Backups enabled hain (RDS automated backup)
```

---

*Part 1 + Part 2 dono padh ke project build karo. Koi specific part me doubt ho toh poochho.*
