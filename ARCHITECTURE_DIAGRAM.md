# Recent Notes Feature - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐         ┌──────────────────────┐        │
│  │  RecentNotesPanel    │         │  RecentNotesWidget   │        │
│  │  (Full Featured)     │         │  (Compact)           │        │
│  │                      │         │                      │        │
│  │  • Filters           │         │  • Top 10 notes      │        │
│  │  • Pagination        │         │  • View All button   │        │
│  │  • Refresh           │         │  • Auto-refresh      │        │
│  └──────────┬───────────┘         └──────────┬───────────┘        │
│             │                                 │                     │
│             └─────────────┬───────────────────┘                     │
│                           │                                         │
│                  ┌────────▼────────┐                               │
│                  │  recentActivity │                               │
│                  │  API Client     │                               │
│                  └────────┬────────┘                               │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│                        BACKEND (Express.js)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Routes Layer                              │ │
│  │  /api/recent-activity/notes                                  │ │
│  │  /api/recent-activity/stats                                  │ │
│  │  /api/customers/:id/notes                                    │ │
│  └────────────────────────┬─────────────────────────────────────┘ │
│                           │                                         │
│  ┌────────────────────────▼─────────────────────────────────────┐ │
│  │              Middleware Layer                                │ │
│  │  • authenticate (JWT verification)                           │ │
│  │  • authorize (role-based access)                             │ │
│  └────────────────────────┬─────────────────────────────────────┘ │
│                           │                                         │
│  ┌────────────────────────▼─────────────────────────────────────┐ │
│  │            Controller Layer                                  │ │
│  │  recentActivityController                                    │ │
│  │  • getRecentNotes()                                          │ │
│  │  • getActivityStats()                                        │ │
│  │  • createCustomerNote()                                      │ │
│  └────────────────────────┬─────────────────────────────────────┘ │
│                           │                                         │
│  ┌────────────────────────▼─────────────────────────────────────┐ │
│  │            Repository Layer                                  │ │
│  │                                                              │ │
│  │  ┌──────────────────────┐    ┌──────────────────────┐      │ │
│  │  │ recentActivity       │    │ customerNote         │      │ │
│  │  │ Repository           │    │ Repository           │      │ │
│  │  │                      │    │                      │      │ │
│  │  │ • getRecentNotes()   │    │ • create()           │      │ │
│  │  │ • getActivityStats() │    │ • findByCustomer()   │      │ │
│  │  └──────────┬───────────┘    └──────────┬───────────┘      │ │
│  │             │                            │                  │ │
│  └─────────────┼────────────────────────────┼──────────────────┘ │
│                │                            │                     │
└────────────────┼────────────────────────────┼─────────────────────┘
                 │                            │
                 │                            │
┌────────────────▼────────────────────────────▼─────────────────────┐
│                    DATABASE (SQL Server)                          │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │   lead_notes    │         │ customer_notes  │                │
│  ├─────────────────┤         ├─────────────────┤                │
│  │ id              │         │ id              │                │
│  │ company_id      │         │ company_id      │                │
│  │ lead_id         │         │ customer_id     │                │
│  │ content         │         │ content         │                │
│  │ created_by      │         │ created_by      │                │
│  │ created_at      │         │ created_at      │                │
│  │ updated_at      │         │ updated_at      │                │
│  └────────┬────────┘         └────────┬────────┘                │
│           │                           │                          │
│           └───────────┬───────────────┘                          │
│                       │                                          │
│              ┌────────▼────────┐                                 │
│              │  UNION QUERY    │                                 │
│              │  (Combined)     │                                 │
│              └─────────────────┘                                 │
│                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                │
│  │     leads       │         │   customers     │                │
│  │  (for details)  │         │  (for details)  │                │
│  └─────────────────┘         └─────────────────┘                │
│                                                                   │
│  ┌─────────────────┐                                             │
│  │     users       │                                             │
│  │  (for creator)  │                                             │
│  └─────────────────┘                                             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Get Recent Notes Flow

```
User Action
    │
    ▼
┌─────────────────────┐
│ Click "Recent       │
│ Updates" or         │
│ Load Dashboard      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ RecentNotesPanel/   │
│ Widget Component    │
│ • useEffect()       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ API Client          │
│ recentActivityApi   │
│ .getRecentNotes()   │
└──────────┬──────────┘
           │
           ▼ HTTP GET /api/recent-activity/notes?limit=20&type=all
┌─────────────────────┐
│ Backend Route       │
│ recentActivity      │
│ Routes              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Authenticate        │
│ Middleware          │
│ (JWT verify)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Controller          │
│ getRecentNotes()    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Repository          │
│ getRecentNotes()    │
│ • Build UNION query │
│ • Filter by type    │
│ • Limit results     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SQL Server          │
│ UNION query:        │
│ • lead_notes        │
│ • customer_notes    │
│ JOIN users, leads,  │
│ customers           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Return Results      │
│ [{note_type, id,    │
│   entity_name,      │
│   content, ...}]    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Component Updates   │
│ • setNotes(data)    │
│ • Render list       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ User Sees           │
│ Recent Notes        │
└─────────────────────┘
```

### 2. View Button Click Flow

```
User Action
    │
    ▼
┌─────────────────────┐
│ Click "View"        │
│ button on note      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ handleViewClick()   │
│ • Check note_type   │
│ • Get entity_id     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ router.push()       │
│ • /leads/{id}       │
│ • /customers/{id}   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Navigate to         │
│ Details Page        │
└─────────────────────┘
```

### 3. Create Customer Note Flow

```
User Action
    │
    ▼
┌─────────────────────┐
│ Add note on         │
│ customer page       │
└──────────┬──────────┘
           │
           ▼ HTTP POST /api/customers/:id/notes
┌─────────────────────┐
│ Backend Route       │
│ customerRoutes      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Controller          │
│ createCustomerNote()│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Repository          │
│ customerNote        │
│ .create()           │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SQL Server          │
│ INSERT INTO         │
│ customer_notes      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Note Created        │
│ • Returns note data │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Recent Notes        │
│ Updated             │
│ (on next refresh)   │
└─────────────────────┘
```

## Database Query Structure

### Combined Recent Notes Query

```sql
-- Lead Notes
SELECT TOP 20
  'lead' as note_type,
  ln.id,
  ln.lead_id as entity_id,
  ln.content,
  ln.created_by,
  ln.created_at,
  u.name as created_by_name,
  u.role as created_by_role,
  l.contact_person as entity_name,
  l.company_name as entity_company_name,
  l.status as entity_status
FROM lead_notes ln
LEFT JOIN users u ON ln.created_by = u.user_id
LEFT JOIN leads l ON ln.lead_id = l.lead_id
WHERE ln.company_id = @companyId
  AND l.is_active = 1

UNION ALL

-- Customer Notes
SELECT TOP 20
  'customer' as note_type,
  cn.id,
  cn.customer_id,
  cn.content,
  cn.created_by,
  cn.created_at,
  u.name as created_by_name,
  u.role as created_by_role,
  c.name as entity_name,
  c.company_name as entity_company_name,
  c.status as entity_status
FROM customer_notes cn
LEFT JOIN users u ON cn.created_by = u.user_id
LEFT JOIN customers c ON cn.customer_id = c.customer_id
WHERE cn.company_id = @companyId
  AND c.is_active = 1

ORDER BY created_at DESC
```

## Component Hierarchy

```
App
│
├── Dashboard Page
│   ├── Stats Cards
│   ├── Charts
│   └── RecentNotesWidget ◄── Compact widget
│       ├── Note Item
│       │   ├── Icon (📋/👤)
│       │   ├── Entity Name
│       │   ├── Content (truncated)
│       │   ├── Meta (creator, time)
│       │   └── View Button
│       └── View All Button
│
└── Recent Updates Page (/recent-updates)
    └── RecentNotesPanel ◄── Full featured
        ├── Header
        │   ├── Title
        │   └── Refresh Button
        ├── Filters
        │   ├── Type Buttons (All/Leads/Customers)
        │   └── My Notes Checkbox
        └── Notes List
            └── Note Item (repeated)
                ├── Type Badge
                ├── Status Badge
                ├── Entity Info
                ├── Content
                ├── Meta Info
                └── View Button
```

## Security Flow

```
Request
    │
    ▼
┌─────────────────────┐
│ JWT Token in        │
│ Authorization       │
│ Header              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ authenticate        │
│ Middleware          │
│ • Verify token      │
│ • Extract userId    │
│ • Extract companyId │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Controller          │
│ • req.auth.userId   │
│ • req.auth.companyId│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Repository          │
│ • Filter by         │
│   company_id        │
│ • No cross-company  │
│   data leakage      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Return only         │
│ authorized data     │
└─────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────┐
│         Database Indexes                │
├─────────────────────────────────────────┤
│                                         │
│  lead_notes:                            │
│  • idx_ln_lead_created                  │
│    (lead_id, created_at)                │
│  • idx_ln_company                       │
│    (company_id, created_at)             │
│                                         │
│  customer_notes:                        │
│  • idx_cn_customer_created              │
│    (customer_id, created_at)            │
│  • idx_cn_company                       │
│    (company_id, created_at)             │
│  • idx_cn_created_by                    │
│    (created_by, created_at)             │
│                                         │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│      Query Optimization                 │
├─────────────────────────────────────────┤
│                                         │
│  • TOP N clause (limit results)         │
│  • Indexed columns in WHERE             │
│  • LEFT JOIN (not INNER)                │
│  • ORDER BY indexed column              │
│  • Company-scoped queries               │
│                                         │
└─────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│      Frontend Optimization              │
├─────────────────────────────────────────┤
│                                         │
│  • Lazy loading components              │
│  • Truncated content display            │
│  • Virtual scrolling (future)           │
│  • Debounced refresh                    │
│  • Loading states                       │
│                                         │
└─────────────────────────────────────────┘
```

---

**Legend:**
- `│` : Connection/Flow
- `▼` : Direction of flow
- `◄──` : Points to component
- `┌─┐` : Box/Container
- `└─┘` : Box/Container

