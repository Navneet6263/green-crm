# CRM Build Document — Part 1
### Stack: Next.js + Node.js + MySQL | AWS Deployment
> Navneet, ye document teri existing Green CRM ke actual code se banaya hai. Naya CRM isi structure pe build karna hai.

---

## ARCHITECTURE — 3 LAYER

```
┌─────────────────────────────────────────┐
│  LAYER 1 — Next.js (Frontend)           │
│  Pages, Components, API calls           │
└──────────────────┬──────────────────────┘
                   │ HTTP / REST
┌──────────────────▼──────────────────────┐
│  LAYER 2 — Node.js + Express (Backend)  │
│  Controllers, Middleware, Services      │
└──────────────────┬──────────────────────┘
                   │ Knex / MySQL2
┌──────────────────▼──────────────────────┐
│  LAYER 3 — MySQL (Database)             │
│  Tables, Indexes, Relations             │
└─────────────────────────────────────────┘
```

**Folder structure jo banana hai:**
```
/project
  /frontend        ← Next.js app
  /backend         ← Node.js + Express
  /db              ← Migrations only
```

---

## ROLES — KAUN KYA KAR SAKTA HAI

Ye roles teri existing `constants.js` se liye hain. Naye CRM me same rakhna.

| Role | Kya hai | Access level |
|------|---------|--------------|
| `super-admin` | Platform owner (tu) | Sab kuch — sabhi companies dekh sakta hai |
| `admin` | Company ka head | Apni company ka sab kuch |
| `manager` | Team lead | Apni team ke leads, reports |
| `sales` | Sales rep | Sirf apne assigned leads |
| `legal-team` | Legal department | Sirf legal stage ke leads |
| `finance-team` | Finance department | Sirf finance stage ke leads |
| `support` | Support agent | Support tickets only |
| `marketing` | Marketing team | Leads dekh sakta, assign nahi |
| `viewer` | Read only | Sirf dekh sakta, kuch nahi kar sakta |

> **Important:** Super-admin ka max count 4 rakha hai (`MAX_SUPER_ADMINS = 4`). Ye limit backend me enforce karna.

---

## SUPER ADMIN FLOW

```
Super Admin Login
      │
      ▼
Dashboard (Platform level — sabhi companies)
      │
      ├── Companies List → Company create/edit/suspend
      │         └── Kisi bhi company me "impersonate" kar sakta hai
      │                   (JWT me activeCompanyId embed hota hai)
      │
      ├── Users List (across all companies)
      │
      ├── Demo Requests (log hote hain DB me)
      │
      ├── Audit Logs (har action track hota hai)
      │
      ├── Security Alerts (bulk export > 100 records pe auto alert)
      │
      └── System Settings
```

**Super Admin ka JWT kaise kaam karta hai:**
```
Normal user JWT:  { id, email, role, company_id }
Super Admin JWT:  { id, email, role, activeCompanyId }
                                          ↑
                              Jis company me ghusa hai uska ID
```
Jab super-admin kisi company me jaata hai, backend `activeCompanyId` se us company ka data filter karta hai.

---

## ADMIN FLOW

```
Admin Login (company ke andar)
      │
      ▼
Company Dashboard
      │
      ├── Users → Add/Edit/Deactivate team members
      │         └── Roles assign karna
      │
      ├── Leads → Sabhi leads apni company ke
      │         └── Assign kar sakta hai kisi bhi user ko
      │
      ├── Products → Company ke products manage karna
      │
      ├── Analytics → Full company reports
      │
      ├── Settings → SMTP, branding, timezone, currency
      │
      └── Workflow → Sales → Legal → Finance pipeline
```

---

## MANAGER FLOW

```
Manager Login
      │
      ▼
Dashboard (sirf apni team ka data)
      │
      ├── Leads → Apni team ke leads dekh sakta
      │         └── Assign/reassign kar sakta apni team me
      │
      ├── Team Performance → Har sales rep ki activity
      │
      ├── Reports → Filter karke export
      │
      └── Tasks → Team ke tasks
```

---

## SALES REP FLOW

```
Sales Rep Login
      │
      ▼
Dashboard (sirf apne leads)
      │
      ├── My Leads → Sirf jo usse assign hain
      │         ├── Notes add karna
      │         ├── Status change karna
      │         ├── Follow-up set karna
      │         └── Lead ko "Closed Won" mark karna
      │                   ↓
      │             Workflow → Legal stage me jaata hai
      │
      ├── Tasks → Apne tasks
      │
      ├── Calendar → Apne meetings/follow-ups
      │
      └── Communications → Call/email log
```

---

## LEGAL TEAM FLOW

```
Legal Team Login
      │
      ▼
Dashboard (sirf legal stage ke leads)
      │
      ├── Legal Queue → Jo leads sales ne "Closed Won" kiye
      │         ├── Documents upload karna (agreements)
      │         ├── Agreement status update karna
      │         └── "Legal Complete" mark karna
      │                   ↓
      │             Finance stage me jaata hai
      │
      └── Documents → Uploaded files manage karna
```

---

## FINANCE TEAM FLOW

```
Finance Team Login
      │
      ▼
Dashboard (sirf finance stage ke leads)
      │
      ├── Finance Queue → Jo leads legal ne complete kiye
      │         ├── Invoice number add karna
      │         ├── Invoice amount set karna
      │         ├── Tax invoice number add karna
      │         └── "Completed" mark karna
      │
      └── Documents → Invoice files upload karna
```

---

## COMPLETE LEAD JOURNEY (End to End)

```
LEAD CREATE
(Admin/Manager/Sales)
      │
      ▼
Status: "new"
Workflow Stage: "sales"
      │
      ▼
Sales Rep kaam karta hai:
  - Notes add karta hai
  - Status: new → contacted → qualified → proposal → negotiation
  - Follow-up dates set karta hai
  - Communications log karta hai
      │
      ▼
Status: "closed-won"  ←── Ya "closed-lost" (end)
Workflow Stage: "legal"
      │
      ▼
Legal Team:
  - Documents upload karta hai
  - Agreement status: pending → approved
  - legal_approved_at timestamp set hota hai
      │
      ▼
Workflow Stage: "finance"
      │
      ▼
Finance Team:
  - Invoice number add karta hai
  - Payment track karta hai
      │
      ▼
Workflow Stage: "completed" ✓
```

---

## DATABASE SCHEMA — PART 1 (Core Tables)

> Ye exact tables teri existing migrations se hain. Naye project me same structure use karna.

### Table: `companies`
```sql
id                    BIGINT PK AUTO_INCREMENT
name                  VARCHAR(191) NOT NULL UNIQUE
slug                  VARCHAR(191) NOT NULL UNIQUE
contact_email         VARCHAR(191) NOT NULL
contact_phone         VARCHAR(30)
industry              VARCHAR(120)
admin_email           VARCHAR(191) NOT NULL
admin_password        VARCHAR(255) NOT NULL  -- bcrypt hashed
service_access        JSON    -- kaunse features on/off hain
service_settings      JSON    -- assignment mode etc
usage_current_leads   INT DEFAULT 0
usage_current_users   INT DEFAULT 0
status                VARCHAR(40) DEFAULT 'trial'  -- trial/active/suspended
branding_logo_url     VARCHAR(512)
branding_primary_color VARCHAR(20) DEFAULT '#3b82f6'
settings_timezone     VARCHAR(64) DEFAULT 'Asia/Kolkata'
settings_currency     VARCHAR(16) DEFAULT 'INR'
smtp_host, smtp_port, smtp_user, smtp_password  -- custom email config
created_at, updated_at
```

### Table: `users`
```sql
id                    BIGINT PK AUTO_INCREMENT
name                  VARCHAR(191) NOT NULL
email                 VARCHAR(191) NOT NULL UNIQUE
password              VARCHAR(255)  -- bcrypt hashed, nullable (OAuth users)
role                  VARCHAR(60) DEFAULT 'user'
company_id            BIGINT FK → companies.id
phone                 VARCHAR(30)
department            VARCHAR(120)
is_active             BOOLEAN DEFAULT true
login_attempts        INT DEFAULT 0   -- brute force protection
lock_until            TIMESTAMP       -- account lock
two_factor_enabled    BOOLEAN DEFAULT false
two_factor_secret     VARCHAR(255)
is_super_admin        BOOLEAN DEFAULT false
super_admin_level     SMALLINT DEFAULT 0
can_manage_super_admins BOOLEAN DEFAULT false
password_expires_at   TIMESTAMP
is_temporary_password BOOLEAN DEFAULT false
daily_export_count    INT DEFAULT 0   -- export limit tracking
last_export_reset     TIMESTAMP
created_at, updated_at

INDEX: (company_id, is_active, role)
INDEX: (role, is_active)
```

### Table: `token_blacklist`
```sql
id            BIGINT PK
company_id    BIGINT
user_id       BIGINT FK → users.id CASCADE
token_id      VARCHAR(191) UNIQUE  -- SHA256 hash of token
reason        VARCHAR(60) DEFAULT 'USER_DEACTIVATED'
deactivated_by BIGINT FK → users.id
expires_at    TIMESTAMP

INDEX: (user_id, deactivated_at)
INDEX: (expires_at)  -- cleanup ke liye
```

### Table: `products`
```sql
id          BIGINT PK
company_id  BIGINT FK → companies.id
name        VARCHAR(191) NOT NULL
color       VARCHAR(32) DEFAULT '#22c55e'
is_active   BOOLEAN DEFAULT true
created_by  BIGINT FK → users.id

UNIQUE: (company_id, name)
```

---

## DATABASE SCHEMA — PART 2 (Lead Tables)

### Table: `leads` (Main table)
```sql
id                    BIGINT PK AUTO_INCREMENT
company_id            BIGINT FK → companies.id
contact_person        VARCHAR(191) NOT NULL
company_name          VARCHAR(191) NOT NULL
email                 VARCHAR(191) NOT NULL
phone                 VARCHAR(30) NOT NULL
address_street, address_city, address_state, address_zip, address_country
industry              VARCHAR(120)
lead_source           VARCHAR(60) DEFAULT 'website'
follow_up_date        TIMESTAMP
status                VARCHAR(60) DEFAULT 'new'
priority              VARCHAR(20) DEFAULT 'medium'
estimated_value       DECIMAL(15,2) DEFAULT 0
assigned_to           BIGINT FK → users.id
assigned_at           TIMESTAMP
assigned_by           BIGINT FK → users.id
created_by            BIGINT FK → users.id NOT NULL
product_id            BIGINT FK → products.id NOT NULL
requirements          LONGTEXT

-- Workflow fields
workflow_stage        VARCHAR(30) DEFAULT 'sales'
assigned_to_legal     BIGINT FK → users.id
assigned_to_finance   BIGINT FK → users.id
agreement_status      VARCHAR(30) DEFAULT 'pending'
legal_approved_at     TIMESTAMP
legal_approved_by     BIGINT FK → users.id
invoice_number        VARCHAR(100)
invoice_amount        DECIMAL(15,2)
tax_invoice_number    VARCHAR(100)

-- AI/Scoring fields
lead_score            SMALLINT DEFAULT 0
lead_temperature      VARCHAR(20) DEFAULT 'warm'
conversion_probability SMALLINT DEFAULT 0

-- Tracking fields
lost_reason           VARCHAR(191)
first_response_at     TIMESTAMP
total_interactions    INT DEFAULT 0
emails_sent           INT DEFAULT 0
calls_made            INT DEFAULT 0
meetings_held         INT DEFAULT 0
is_active             BOOLEAN DEFAULT true
tags                  JSON
created_at, updated_at

FULLTEXT INDEX: (contact_person, company_name, email, phone)
INDEX: (company_id, is_active, created_at)
INDEX: (company_id, assigned_to, is_active)
INDEX: (company_id, status, priority)
INDEX: (company_id, workflow_stage, is_active)
INDEX: (assigned_to_legal, agreement_status)
INDEX: (assigned_to_finance, workflow_stage)
```

### Table: `lead_notes`
```sql
id          BIGINT PK
company_id  BIGINT
lead_id     BIGINT FK → leads.id CASCADE
content     LONGTEXT NOT NULL
created_by  BIGINT FK → users.id
created_at, updated_at

INDEX: (lead_id, created_at)
```

### Table: `lead_activities`
```sql
id          BIGINT PK
company_id  BIGINT
lead_id     BIGINT FK → leads.id CASCADE
type        VARCHAR(40)   -- 'status_change', 'note_added', 'assigned', etc
description LONGTEXT
created_by  BIGINT FK → users.id
created_at
```

### Table: `lead_stage_history`
```sql
id          BIGINT PK
lead_id     BIGINT FK → leads.id CASCADE
stage       VARCHAR(40)
entered_at  TIMESTAMP
exited_at   TIMESTAMP
duration    INT  -- seconds me
```

### Table: `lead_legal_documents`
```sql
id            BIGINT PK
company_id    BIGINT
lead_id       BIGINT FK → leads.id CASCADE
file_name     VARCHAR(255)
file_url      VARCHAR(512)
file_size     BIGINT
uploaded_by   BIGINT FK → users.id
document_type VARCHAR(40) DEFAULT 'agreement'
uploaded_at   TIMESTAMP
```

### Table: `lead_finance_documents`
```sql
-- Same structure as lead_legal_documents
-- document_type DEFAULT 'invoice'
```

### Table: `lead_transfer_history`
```sql
id              BIGINT PK
lead_id         BIGINT FK → leads.id CASCADE
from_stage      VARCHAR(30)
to_stage        VARCHAR(30)
transferred_by  BIGINT FK → users.id
transferred_to  BIGINT FK → users.id
transferred_at  TIMESTAMP
notes           LONGTEXT
```

---

## DATABASE SCHEMA — PART 3 (Customer + Operations)

### Table: `customers`
```sql
id                    BIGINT PK
company_id            BIGINT FK → companies.id NOT NULL
name                  VARCHAR(191) NOT NULL
company_name          VARCHAR(191) NOT NULL
email                 VARCHAR(191) NOT NULL
phone                 VARCHAR(30) NOT NULL
converted_from_lead_id BIGINT FK → leads.id SET NULL
total_value           DECIMAL(15,2) DEFAULT 0
status                VARCHAR(30) DEFAULT 'active'
assigned_to           BIGINT FK → users.id
last_interaction      TIMESTAMP
next_follow_up        TIMESTAMP
notes                 LONGTEXT
is_active             BOOLEAN DEFAULT true
created_at, updated_at

FULLTEXT INDEX: (name, company_name, email, phone)
```

### Table: `tasks`
```sql
id          BIGINT PK
company_id  BIGINT
title       VARCHAR(191) NOT NULL
type        VARCHAR(40) DEFAULT 'call'  -- call/email/meeting/follow-up
status      VARCHAR(30) DEFAULT 'pending'
priority    VARCHAR(20) DEFAULT 'medium'
due_date    TIMESTAMP NOT NULL
assigned_to VARCHAR(191)
related_to  VARCHAR(30)   -- 'lead' ya 'customer'
related_id  BIGINT        -- lead_id ya customer_id
created_by  BIGINT FK → users.id
notes       LONGTEXT

INDEX: (company_id, assigned_to, status, due_date)
```

### Table: `audit_logs`
```sql
id            BIGINT PK
company_id    BIGINT
action        VARCHAR(60) NOT NULL  -- 'LOGIN', 'BULK_EXPORT', 'USER_DEACTIVATED' etc
performed_by  BIGINT FK → users.id NOT NULL
target_user   BIGINT FK → users.id
user_email    VARCHAR(191)
user_role     VARCHAR(60)
ip_address    VARCHAR(45)
record_count  INT   -- export me kitne records the
logged_at     TIMESTAMP NOT NULL

INDEX: (company_id, action, logged_at)
INDEX: (performed_by, logged_at)
```

### Table: `notifications`
```sql
id              BIGINT PK
company_id      BIGINT
title           VARCHAR(191) NOT NULL
message         LONGTEXT NOT NULL
type            VARCHAR(60)  -- 'lead_assigned', 'system', 'security' etc
user_id         BIGINT FK → users.id CASCADE
lead_id         BIGINT FK → leads.id SET NULL
is_read         BOOLEAN DEFAULT false
priority        VARCHAR(20) DEFAULT 'medium'
actionable      BOOLEAN DEFAULT false
action_view     VARCHAR(100)  -- frontend me kahan le jaaye
metadata        JSON
created_at
```

---

## JWT — KAISE USE KIYA HAI

### Token Structure
```javascript
// Normal user ka token payload
{
  id: 123,
  email: "user@company.com",
  role: "sales",
  company_id: 5
}

// Super admin ka token (jab kisi company me ghusa ho)
{
  id: 1,
  email: "superadmin@platform.com",
  role: "super-admin",
  activeCompanyId: 5   // ← ye extra field hai
}
```

### Token Flow
```
1. User login karta hai
         ↓
2. Backend bcrypt se password verify karta hai
         ↓
3. JWT sign karta hai (JWT_SECRET env variable se)
         ↓
4. Token cookie me set hota hai (authToken)
   Ya Authorization header me bhejta hai
         ↓
5. Har request pe auth middleware:
   a. Cookie ya header se token nikalta hai
   b. jwt.verify() se decode karta hai
   c. token_blacklist table check karta hai
   d. user DB se load karta hai
   e. is_active check karta hai
   f. req.user set karta hai
         ↓
6. Logout pe token_blacklist me insert hota hai
   (SHA256 hash of token store hota hai, raw token nahi)
```

### Token Security Points
- Token blacklist table me **SHA256 hash** store hota hai, raw token nahi
- Login attempts track hote hain — 5 failed attempts pe account lock
- `lock_until` timestamp set hota hai
- Password expiry support hai (`password_expires_at`)
- Temporary password flag hai (`is_temporary_password`)

---

## SECURITY LAYERS — KYA KYA LAGA HAI

### 1. Rate Limiting (rateLimiter.js)
```
Login endpoint:        50 attempts / 15 minutes (per IP + email)
Password reset:        3 attempts / 1 hour
General API:           1000 requests / 15 minutes
Admin actions:         20 actions / 5 minutes
```

### 2. Audit Logging (security.js)
- Har sensitive action pe `audit_logs` table me entry
- Action, user, IP, user-agent sab log hota hai
- Bulk export > 100 records pe super-admin ko notification jaati hai

### 3. Role-based Access
```javascript
// Middleware chain example
router.get('/leads', auth, adminAuth, controller)
//                    ↑      ↑
//              JWT check  Role check
```

### 4. Company Isolation
- Har query me `company_id` filter mandatory hai
- Super-admin ke alawa koi doosri company ka data nahi dekh sakta
- `companyAccess.js` utility se enforce hota hai

### 5. Input Sanitization
- `sanitizeInput()` helper har user input pe
- SQL injection: Knex query builder use karta hai (parameterized queries)
- XSS: Input sanitize hota hai before DB insert

### 6. Two Factor Auth
- `two_factor_enabled` flag users table me
- `two_factor_secret` encrypted store hota hai
- TOTP based (Google Authenticator compatible)

---

## SIDEBAR — KYA KYA HOGA

Ye sidebar items role ke hisaab se show/hide honge:

```
SUPER ADMIN sidebar:
├── Platform Dashboard
├── Companies
├── All Users
├── Demo Requests
├── Audit Logs
├── Security
└── System Settings

ADMIN sidebar:
├── Dashboard
├── Leads
├── Customers
├── Products
├── Team (Users)
├── Analytics
├── Tasks
├── Calendar
├── Communications
├── Workflow
├── Support Tickets
└── Settings

MANAGER sidebar:
├── Dashboard
├── Leads (team ke)
├── Customers
├── Team Performance
├── Analytics
├── Tasks
└── Calendar

SALES sidebar:
├── Dashboard
├── My Leads
├── Customers
├── Tasks
├── Calendar
└── Communications

LEGAL TEAM sidebar:
├── Dashboard
├── Legal Queue (leads)
├── Documents
└── Tasks

FINANCE TEAM sidebar:
├── Dashboard
├── Finance Queue (leads)
├── Documents
└── Tasks
```

---

## LEAD STATUS vs WORKFLOW STAGE — DIFFERENCE

> Navneet, ye ek important confusion hai. Dono alag cheez hain.

```
LEAD STATUS (sales pipeline):
new → contacted → qualified → proposal → negotiation → closed-won / closed-lost

WORKFLOW STAGE (department pipeline):
sales → legal → finance → completed

Dono ek saath exist karte hain lead record me.
Status = sales team ka kaam
Workflow Stage = department handoff
```

Example:
```
Lead status: "closed-won"
Workflow stage: "legal"
Matlab: Sales ne close kar diya, ab legal team ka kaam hai
```

---

## NOTES — KAHAN KAHAN BANTE HAIN

```
1. lead_notes table    → Lead ke andar notes (sales/manager/admin)
2. customer_notes table → Customer record pe notes
3. tasks.notes         → Task ke saath note
4. lead_transfer_history.notes → Stage transfer ke time note
5. communications table → Call/email ka content
6. deals.notes         → Deal ke saath note
```

Har note me `created_by` hota hai — pata rehta hai kisne likha.

---

## ⚠️ IMPORTANT PROBLEMS JO NAYE CRM ME AVOID KARNA

> Navneet, ye issues existing Green CRM me hain. Naye me ye galtiyan mat karna.

**Problem 1: company_id aur tenant_id dono hain**
- Existing code me `company_id` aur `tenant_id` dono columns hain users aur leads me
- Ye confusing hai — naye CRM me sirf `company_id` rakho, `tenant_id` hatao
- Solution: Ek hi column, ek hi source of truth

**Problem 2: assigned_to string hai tasks me**
- `tasks.assigned_to` VARCHAR hai, BIGINT FK nahi
- Ye wrong hai — user delete ho toh orphan data
- Solution: `assigned_to BIGINT FK → users.id` rakho

**Problem 3: Dashboard pe sab kuch ek saath load hota hai**
- Analytics, leads, tasks, notifications — sab ek hi page load pe
- 1 crore users pe ye slow ho jaayega
- Solution: Dashboard widgets ko lazy load karo, alag alag API calls karo

**Problem 4: Export me koi limit nahi thi pehle**
- Ab `daily_export_count` track hota hai users table me
- Naye CRM me ye pehle se hi implement karo
- Solution: Per user daily export limit set karo (e.g., 5000 records/day)

**Problem 5: Lead search FULLTEXT hai but filters combined nahi hain**
- Search aur filters alag alag kaam karte hain
- Solution: Ek single `/leads/search` endpoint banao jo dono handle kare

---

*Part 2 me aayega: API endpoints, Next.js pages structure, AWS deployment, aur dashboard arrangement.*
