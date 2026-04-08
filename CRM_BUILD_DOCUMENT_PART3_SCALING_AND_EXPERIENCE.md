# CRM Build Document - Part 3
### Premium UI System + 50 Lakh User Scaling Blueprint
> Part 1 aur Part 2 architecture aur routes explain karte hain. Ye document production-scale UX aur infra decisions ke liye hai.

---

## UI EXPERIENCE DIRECTION

Naya CRM ka visual goal sirf "pretty dashboard" nahi hai. Product ko role-specific operating system jaisa feel hona chahiye.

### Design rules

1. Har role ko alag workspace context milna chahiye.
2. Sidebar clutter kam hona chahiye, lekin navigation depth clear honi chahiye.
3. Top section me page context + shortcuts + metrics ek saath visible hone chahiye.
4. Tables ko raw list ki jagah decision surfaces jaisa treat karna chahiye.
5. Forms me compact spacing, strong hierarchy, aur predictable actions hone chahiye.

### UI modules jo reusable hone chahiye

- Premium shell
- Role-aware sidebar
- Page hero with summary
- Metric cards
- Decision panels
- Status badges
- Queue rows
- Form sections
- Empty states

---

## 50 LAKH USERS KE LIYE REALITY CHECK

50 lakh registered users aur high-activity tenants ke saath single MySQL + single Node server enough nahi hoga.

Scale target ko 3 buckets me socho:

1. Registered users
2. Monthly active users
3. Concurrent active users

Example:

- Registered users: 50,00,000
- Monthly active users: 3,00,000 to 8,00,000
- Peak concurrent users: 8,000 to 25,000

Is level par architecture ko horizontally scale karna padega.

---

## REQUIRED PRODUCTION ARCHITECTURE

### Frontend

- Next.js app behind CDN
- Static assets on CloudFront
- Image/document delivery via object storage + CDN
- Edge caching for public pages

### API Layer

- Stateless Node.js app replicas
- Load balancer in front
- JWT/session validation without sticky session dependency
- Rate limiting via Redis

### Data Layer

- Primary MySQL for writes
- Read replicas for dashboard/reporting reads
- Redis for cache, sessions, throttling, queue coordination
- S3-compatible object storage for legal/finance documents
- Queue system for async work

### Async Processing

- Email queue
- Notification queue
- Import/export queue
- Lead scoring queue
- Audit/event fanout

---

## DATABASE STRATEGY

Current CRM multi-tenant hai, isliye sabse pehla rule:

> Har query tenant-aware aur index-friendly honi chahiye.

### Must-have indexes

- `company_id + created_at`
- `company_id + status`
- `company_id + workflow_stage`
- `company_id + assigned_to`
- `company_id + lead_source`
- `company_id + due_at`
- `company_id + is_active`

### For large tables

- leads
- lead_activity
- audit_logs
- notifications
- tasks
- documents

### Recommended patterns

- Offset pagination se keyset pagination par shift karo for deep lists
- Heavy analytics ke liye materialized summary tables banao
- Audit logs aur activity tables ko time-based partitioning do
- CSV export ko synchronous request me mat karo

---

## CACHING STRATEGY

### Redis use cases

- dashboard summary cache
- frequently used lookup data
- auth throttling
- OTP / short-lived security tokens
- notification counters
- queue jobs

### Cache rules

- Tenant-scoped cache keys
- Short TTL for dashboard summaries
- Explicit invalidation on writes for critical counters
- Never cache sensitive raw records broadly

Example key shape:

```txt
crm:{companyId}:dashboard:summary
crm:{companyId}:products:list
crm:{companyId}:notifications:count:{userId}
```

---

## API AND BACKEND RULES FOR SCALE

### Every endpoint should support

- pagination
- filtering
- sorting
- company isolation
- role filtering
- response size limits

### Avoid

- returning full tables
- dashboard endpoints running multiple unbounded joins
- document metadata + binary delivery in same flow
- expensive exports on request thread

### Add

- request ids
- structured logs
- query timing metrics
- slow query alerting
- background workers

---

## DASHBOARD STRATEGY AT SCALE

Dashboard pages ko live transactional joins se render mat karo.

### Better approach

1. Core writes transactional tables me jaayein
2. Background workers summary tables update karein
3. Dashboard endpoints pre-aggregated data serve karein

### Dashboard data classes

- real-time counters: Redis / fast summary read
- daily trend data: rollup tables
- queue lists: paginated live reads
- audit/history: delayed but indexed reads

---

## DOCUMENT AND WORKFLOW STORAGE

Legal aur finance workflow documents ko database blobs me store mat karo.

### Recommended

- Files in S3 / object storage
- DB me only metadata:
  - `document_id`
  - `company_id`
  - `lead_id`
  - `stage`
  - `file_key`
  - `mime_type`
  - `uploaded_by`
  - `created_at`

### Benefits

- app server memory load kam
- CDN delivery possible
- lifecycle rules apply kar sakte ho
- virus scan / compliance processing async ho sakta hai

---

## SECURITY FOR LARGE CRM

### Mandatory

- rate limiting on login/reset endpoints
- audit logging for privilege changes
- company-aware authorization in every repository/service
- secure document URLs
- rotation-friendly JWT secret strategy
- backup and restore drills

### Strongly recommended

- WAF in front of API
- Redis-backed token revoke list
- admin/super-admin MFA
- anomaly alerts for bulk export and unusual access

---

## OBSERVABILITY

Agar monitoring nahi hai to scale bhi fake hai.

### Track these metrics

- p50 / p95 / p99 API latency
- DB query latency
- cache hit ratio
- queue lag
- failed jobs
- login failures
- tenant-wise usage spikes
- document upload failure rate

### Tools

- application logs
- metrics dashboard
- distributed tracing
- DB slow query logs
- alerting on saturation

---

## ROLLOUT PLAN

### Phase 1

- Premium unified shell
- role-aware navigation
- paginated screens everywhere
- dashboard query cleanup

### Phase 2

- Redis caching
- background queues
- summary tables
- object storage for documents

### Phase 3

- read replicas
- tenant usage analytics
- export workers
- audit retention policies

### Phase 4

- shard-ready tenant strategy
- advanced observability
- multi-region DR planning

---

## NON-NEGOTIABLE ENGINEERING RULES

1. Company isolation every layer me enforce karo.
2. Large tables bina index ke production me mat le jao.
3. Dashboard = fast summaries, not raw analytical SQL.
4. Files = object storage, not DB blob.
5. Long-running work = queue, not request thread.
6. UI reuse karo, warna product phir se visually dirty ho jayega.

---

## FINAL NOTE

Agar target sach me 50 lakh users ka hai, to is CRM ko abhi se modular, tenant-safe, queue-first, cache-aware aur observability-ready build karna padega. Premium UI aur premium scale dono saath chalenge tabhi product enterprise level feel dega.
