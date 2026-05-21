# Recent Notes Feature - Implementation Guide

## Overview
Yeh feature aapko **last 20 notes** dikhata hai (leads aur customers dono ke) ek hi jagah pe. Aap filter kar sakte ho ki sirf leads ke notes dikhein ya sirf customers ke, aur "View" button se directly us lead/customer ki details pe ja sakte ho.

## Features

### ✅ Implemented Features:
1. **Recent Notes API** - Last 20 notes across leads and customers
2. **Filter Options**:
   - All notes (leads + customers)
   - Only lead notes
   - Only customer notes
   - My notes only (sirf apne notes)
3. **View Button** - Har note ke saamne "View" button jo lead/customer details pe le jata hai
4. **Role-based Access** - Sab roles (Sales Manager, Admin, etc.) ko dikhta hai
5. **Customer Notes** - Customer notes ka complete implementation
6. **Real-time Updates** - Refresh button se latest notes load kar sakte ho

## Database Changes

### New Table: `customer_notes`
```sql
CREATE TABLE customer_notes (
  id          BIGINT        NOT NULL IDENTITY(1,1),
  company_id  NVARCHAR(20)  NOT NULL,
  customer_id NVARCHAR(20)  NOT NULL,
  content     NVARCHAR(MAX) NOT NULL,
  created_by  NVARCHAR(20)  NOT NULL,
  created_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  updated_at  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  PRIMARY KEY (id)
);
```

### Migration File
Location: `backend/db/migrations/20260520_customer_notes_and_recent_activity.sql`

**To run migration:**
```bash
cd backend
# Make sure your database is running
node -e "const conn = require('./db/connection'); const fs = require('fs'); const sql = fs.readFileSync('./db/migrations/20260520_customer_notes_and_recent_activity.sql', 'utf8'); conn.query(sql).then(() => console.log('Done')).catch(console.error);"
```

## Backend Implementation

### New Files Created:

1. **`backend/repositories/customerNoteRepository.js`**
   - Customer notes ke liye CRUD operations
   - Recent notes fetch karne ka method

2. **`backend/repositories/recentActivityRepository.js`**
   - Combined recent notes (leads + customers)
   - Filter by type (all/leads/customers)
   - Activity statistics

3. **`backend/controllers/recentActivityController.js`**
   - API endpoints ka controller
   - Customer notes CRUD

4. **`backend/routes/recentActivityRoutes.js`**
   - Recent activity routes

### API Endpoints:

#### 1. Get Recent Notes
```
GET /api/recent-activity/notes
Query Params:
  - limit: number (default: 20, max: 100)
  - type: 'all' | 'leads' | 'customers' (default: 'all')
  - myNotesOnly: 'true' | 'false' (default: 'false')

Response:
{
  "success": true,
  "data": [
    {
      "note_type": "lead",
      "id": 123,
      "entity_id": "LD001",
      "entity_name": "John Doe",
      "entity_company_name": "ABC Corp",
      "entity_status": "new",
      "content": "Called customer, interested in product",
      "created_by": "U001",
      "created_by_name": "Sales Person",
      "created_by_role": "sales",
      "created_at": "2026-05-20T10:30:00Z"
    }
  ],
  "meta": {
    "count": 20,
    "limit": 20,
    "type": "all",
    "myNotesOnly": false
  }
}
```

#### 2. Get Activity Stats
```
GET /api/recent-activity/stats?days=7

Response:
{
  "success": true,
  "data": {
    "lead_notes_count": 45,
    "customer_notes_count": 23,
    "active_users_on_leads": 5,
    "active_users_on_customers": 3
  }
}
```

#### 3. Customer Notes CRUD
```
POST   /api/customers/:customerId/notes
GET    /api/customers/:customerId/notes
DELETE /api/customers/:customerId/notes/:noteId
```

## Frontend Implementation

### New Files Created:

1. **`frontend/lib/api/recentActivity.ts`**
   - API client for recent activity endpoints
   - TypeScript interfaces

2. **`frontend/components/RecentNotesPanel.tsx`**
   - Full-featured recent notes panel
   - Filters, search, pagination
   - Use on dedicated page

3. **`frontend/components/RecentNotesWidget.tsx`**
   - Compact widget for dashboard
   - Shows top 10 recent notes
   - "View All" button

4. **`frontend/app/recent-updates/page.tsx`**
   - Dedicated page for recent updates
   - Full panel with all features

### Usage Examples:

#### 1. Dashboard Widget (Compact)
```tsx
import RecentNotesWidget from '@/components/RecentNotesWidget';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1">
        <RecentNotesWidget limit={10} type="all" />
      </div>
      {/* Other widgets */}
    </div>
  );
}
```

#### 2. Full Panel (Dedicated Page)
```tsx
import RecentNotesPanel from '@/components/RecentNotesPanel';

export default function RecentUpdatesPage() {
  return (
    <RecentNotesPanel limit={50} showFilters={true} />
  );
}
```

#### 3. Leads-only Widget
```tsx
<RecentNotesWidget limit={10} type="leads" />
```

#### 4. Customers-only Widget
```tsx
<RecentNotesWidget limit={10} type="customers" />
```

## How to Use

### Step 1: Run Migration
```bash
cd backend
# Start your SQL Server
# Run migration file
```

### Step 2: Start Backend
```bash
cd backend
npm start
```

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
```

### Step 4: Access Recent Updates
Navigate to: `http://localhost:3000/recent-updates`

Or add the widget to your dashboard:
```tsx
import RecentNotesWidget from '@/components/RecentNotesWidget';

// In your dashboard component
<RecentNotesWidget limit={10} />
```

## Features in Detail

### 1. Filter by Type
- **All**: Shows both lead and customer notes
- **Leads**: Shows only lead notes
- **Customers**: Shows only customer notes

### 2. My Notes Only
Checkbox to filter notes created by current user only

### 3. View Button
Click "View" to navigate to:
- Lead details page: `/leads/{leadId}`
- Customer details page: `/customers/{customerId}`

### 4. Real-time Info
- Shows who created the note
- Shows when it was created (e.g., "2 hours ago")
- Shows entity status (new, contacted, won, etc.)

### 5. Responsive Design
- Works on desktop and mobile
- Scrollable list for many notes
- Truncates long content

## Customization

### Change Default Limit
```tsx
<RecentNotesPanel limit={30} />
```

### Hide Filters
```tsx
<RecentNotesPanel showFilters={false} />
```

### Default Filter Type
```tsx
<RecentNotesPanel defaultType="leads" />
```

## Testing

### Test Recent Notes API
```bash
# Get all recent notes
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/notes

# Get only lead notes
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/notes?type=leads

# Get my notes only
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/notes?myNotesOnly=true
```

### Test Customer Notes
```bash
# Create customer note
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test note"}' \
  http://localhost:5000/api/customers/CUST001/notes

# Get customer notes
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/customers/CUST001/notes
```

## Benefits

1. **Quick Overview**: Ek hi jagah pe sab recent activity dikh jati hai
2. **Easy Navigation**: "View" button se directly details pe ja sakte ho
3. **Filter Options**: Apne hisaab se filter kar sakte ho
4. **Role-based**: Sab roles ko access hai
5. **Performance**: Optimized queries with proper indexes
6. **Scalable**: Pagination support for large datasets

## Future Enhancements (Optional)

1. **Search**: Notes mein search functionality
2. **Date Range**: Specific date range ke notes
3. **Export**: Export notes to CSV/PDF
4. **Notifications**: New note pe notification
5. **Mentions**: @mention users in notes
6. **Rich Text**: Formatting support in notes

## Support

Agar koi issue ho ya question ho, toh:
1. Check migration file properly run hua hai
2. Check API endpoints working hain
3. Check frontend components properly import hue hain
4. Check database connection settings

---

**Created by:** Kiro AI Assistant
**Date:** May 20, 2026
**Version:** 1.0
