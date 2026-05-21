# Recent Notes Feature - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Database Setup
- [ ] SQL Server is running
- [ ] Database connection is configured in `.env`
- [ ] Migration file is ready: `backend/db/migrations/20260520_customer_notes_and_recent_activity.sql`
- [ ] Run migration to create `customer_notes` table
- [ ] Verify table created: `SELECT * FROM customer_notes`
- [ ] Verify indexes created: Check `sys.indexes` for new indexes

### ✅ Backend Setup
- [ ] All new files are in place:
  - [ ] `backend/repositories/customerNoteRepository.js`
  - [ ] `backend/repositories/recentActivityRepository.js`
  - [ ] `backend/controllers/recentActivityController.js`
  - [ ] `backend/routes/recentActivityRoutes.js`
- [ ] Updated files are correct:
  - [ ] `backend/db/schema.js` (customer_notes table added)
  - [ ] `backend/routes/index.js` (recent activity routes added)
- [ ] Dependencies installed: `npm install` (if any new packages)
- [ ] Backend starts without errors: `npm start`
- [ ] API endpoints are accessible

### ✅ Frontend Setup
- [ ] All new files are in place:
  - [ ] `frontend/lib/api/recentActivity.ts`
  - [ ] `frontend/components/RecentNotesPanel.tsx`
  - [ ] `frontend/components/RecentNotesWidget.tsx`
  - [ ] `frontend/app/recent-updates/page.tsx`
- [ ] Dependencies installed: `npm install` (if any new packages)
- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Frontend starts without errors: `npm run dev`

## Testing Checklist

### 🧪 Backend API Testing

#### Test 1: Recent Notes API
```bash
# Test: Get all recent notes
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/notes

Expected: 200 OK with array of notes
```
- [ ] Returns 200 status
- [ ] Returns array of notes
- [ ] Notes have correct structure
- [ ] Notes are sorted by created_at DESC

#### Test 2: Filter by Type
```bash
# Test: Get only lead notes
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/notes?type=leads

Expected: 200 OK with only lead notes
```
- [ ] Returns only lead notes
- [ ] `note_type` is 'lead' for all

```bash
# Test: Get only customer notes
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/notes?type=customers

Expected: 200 OK with only customer notes
```
- [ ] Returns only customer notes
- [ ] `note_type` is 'customer' for all

#### Test 3: My Notes Only
```bash
# Test: Get my notes only
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/notes?myNotesOnly=true

Expected: 200 OK with only current user's notes
```
- [ ] Returns only current user's notes
- [ ] `created_by` matches current user

#### Test 4: Limit Parameter
```bash
# Test: Limit to 5 notes
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/notes?limit=5

Expected: 200 OK with max 5 notes
```
- [ ] Returns max 5 notes
- [ ] Meta shows correct limit

#### Test 5: Activity Stats
```bash
# Test: Get activity stats
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/recent-activity/stats?days=7

Expected: 200 OK with stats object
```
- [ ] Returns stats object
- [ ] Has lead_notes_count
- [ ] Has customer_notes_count
- [ ] Has active_users counts

#### Test 6: Create Customer Note
```bash
# Test: Create customer note
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test customer note"}' \
  http://localhost:5000/api/customers/CUST001/notes

Expected: 201 Created with note object
```
- [ ] Returns 201 status
- [ ] Returns created note
- [ ] Note appears in recent notes

#### Test 7: Get Customer Notes
```bash
# Test: Get customer notes
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/customers/CUST001/notes

Expected: 200 OK with array of notes
```
- [ ] Returns 200 status
- [ ] Returns array of notes for customer

#### Test 8: Delete Customer Note
```bash
# Test: Delete customer note
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/customers/CUST001/notes/123

Expected: 200 OK with success message
```
- [ ] Returns 200 status
- [ ] Note is deleted
- [ ] Note doesn't appear in recent notes

### 🎨 Frontend UI Testing

#### Test 1: Recent Updates Page
- [ ] Navigate to `/recent-updates`
- [ ] Page loads without errors
- [ ] Recent notes are displayed
- [ ] Loading state shows initially
- [ ] Notes are sorted by date (newest first)

#### Test 2: Filter Buttons
- [ ] Click "All" button
  - [ ] Shows both lead and customer notes
  - [ ] Button is highlighted
- [ ] Click "Leads" button
  - [ ] Shows only lead notes
  - [ ] Button is highlighted
- [ ] Click "Customers" button
  - [ ] Shows only customer notes
  - [ ] Button is highlighted

#### Test 3: My Notes Checkbox
- [ ] Check "My notes only" checkbox
  - [ ] Shows only current user's notes
  - [ ] Checkbox is checked
- [ ] Uncheck "My notes only" checkbox
  - [ ] Shows all notes
  - [ ] Checkbox is unchecked

#### Test 4: Refresh Button
- [ ] Click refresh button
  - [ ] Loading state shows
  - [ ] Notes are reloaded
  - [ ] Latest notes appear

#### Test 5: View Button
- [ ] Click "View" on a lead note
  - [ ] Navigates to lead details page
  - [ ] Correct lead is shown
- [ ] Click "View" on a customer note
  - [ ] Navigates to customer details page
  - [ ] Correct customer is shown

#### Test 6: Note Display
- [ ] Lead notes show 📋 icon
- [ ] Customer notes show 👤 icon
- [ ] Status badges are color-coded
- [ ] Entity name is displayed
- [ ] Company name is displayed (if exists)
- [ ] Note content is displayed (truncated if long)
- [ ] Creator name is displayed
- [ ] Time ago is displayed ("2 hours ago")

#### Test 7: Empty State
- [ ] Filter to show no results
  - [ ] Empty state message shows
  - [ ] Icon is displayed
  - [ ] Message is clear

#### Test 8: Error State
- [ ] Simulate API error (disconnect backend)
  - [ ] Error message shows
  - [ ] Retry button is displayed
- [ ] Click retry button
  - [ ] Attempts to reload

#### Test 9: Dashboard Widget
- [ ] Add widget to dashboard
- [ ] Widget loads without errors
- [ ] Shows top 10 notes
- [ ] "View All" button is displayed
- [ ] Click "View All"
  - [ ] Navigates to `/recent-updates`

#### Test 10: Responsive Design
- [ ] Test on desktop (1920x1080)
  - [ ] Layout looks good
  - [ ] All elements visible
- [ ] Test on tablet (768x1024)
  - [ ] Layout adapts
  - [ ] All elements accessible
- [ ] Test on mobile (375x667)
  - [ ] Layout is mobile-friendly
  - [ ] Buttons are tappable

### 🔒 Security Testing

#### Test 1: Authentication
- [ ] Access API without token
  - [ ] Returns 401 Unauthorized
- [ ] Access API with invalid token
  - [ ] Returns 401 Unauthorized
- [ ] Access API with valid token
  - [ ] Returns 200 OK

#### Test 2: Authorization
- [ ] User A creates note
- [ ] User B (different company) tries to access
  - [ ] Cannot see User A's notes
- [ ] User C (same company) tries to access
  - [ ] Can see User A's notes

#### Test 3: SQL Injection
- [ ] Try SQL injection in query params
  - [ ] No SQL injection possible
  - [ ] Parameterized queries protect

#### Test 4: XSS Protection
- [ ] Create note with `<script>alert('xss')</script>`
  - [ ] Script doesn't execute
  - [ ] Content is escaped

### ⚡ Performance Testing

#### Test 1: Load Time
- [ ] Measure API response time
  - [ ] < 500ms for 20 notes
  - [ ] < 1s for 100 notes

#### Test 2: Database Query Performance
- [ ] Check query execution plan
  - [ ] Uses indexes
  - [ ] No table scans

#### Test 3: Frontend Rendering
- [ ] Measure component render time
  - [ ] < 100ms for 20 notes
  - [ ] < 500ms for 100 notes

#### Test 4: Concurrent Users
- [ ] Simulate 10 concurrent requests
  - [ ] All succeed
  - [ ] No errors

### 🔄 Integration Testing

#### Test 1: End-to-End Flow
- [ ] Create a lead
- [ ] Add note to lead
- [ ] Check recent notes
  - [ ] Note appears
- [ ] Click "View"
  - [ ] Navigates to lead
- [ ] Update lead
- [ ] Check recent notes
  - [ ] Note still there

#### Test 2: Customer Flow
- [ ] Create a customer
- [ ] Add note to customer
- [ ] Check recent notes
  - [ ] Note appears
- [ ] Filter by customers
  - [ ] Note appears
- [ ] Filter by leads
  - [ ] Note doesn't appear

#### Test 3: Mixed Flow
- [ ] Add 5 lead notes
- [ ] Add 5 customer notes
- [ ] Check recent notes
  - [ ] All 10 appear
  - [ ] Sorted by date
- [ ] Filter by leads
  - [ ] Only 5 lead notes
- [ ] Filter by customers
  - [ ] Only 5 customer notes

## Deployment Steps

### Step 1: Database Migration
```bash
# Connect to SQL Server
sqlcmd -S localhost -U sa -P YourPassword

# Run migration
:r backend/db/migrations/20260520_customer_notes_and_recent_activity.sql
GO

# Verify
SELECT * FROM customer_notes;
GO
```
- [ ] Migration executed successfully
- [ ] Table created
- [ ] Indexes created

### Step 2: Backend Deployment
```bash
cd backend

# Install dependencies (if needed)
npm install

# Run tests (if you have them)
npm test

# Start backend
npm start
```
- [ ] Backend starts without errors
- [ ] API endpoints are accessible
- [ ] Logs show no errors

### Step 3: Frontend Deployment
```bash
cd frontend

# Install dependencies (if needed)
npm install

# Build for production
npm run build

# Start frontend
npm start
```
- [ ] Build succeeds
- [ ] Frontend starts without errors
- [ ] No console errors

### Step 4: Smoke Test
- [ ] Navigate to `/recent-updates`
- [ ] Page loads
- [ ] Notes are displayed
- [ ] Filters work
- [ ] View button works

### Step 5: Monitor
- [ ] Check backend logs
- [ ] Check frontend logs
- [ ] Check database logs
- [ ] Monitor API response times
- [ ] Monitor error rates

## Post-Deployment Checklist

### ✅ Verification
- [ ] Feature is live
- [ ] All users can access
- [ ] No errors in logs
- [ ] Performance is acceptable
- [ ] Security is intact

### ✅ Documentation
- [ ] Update user documentation
- [ ] Update API documentation
- [ ] Update changelog
- [ ] Notify team

### ✅ Monitoring
- [ ] Set up alerts for errors
- [ ] Monitor API usage
- [ ] Monitor database performance
- [ ] Track user adoption

## Rollback Plan

### If Issues Occur:

#### Option 1: Quick Fix
1. Identify the issue
2. Apply hotfix
3. Test
4. Deploy

#### Option 2: Rollback
1. Stop frontend
2. Stop backend
3. Revert code changes
4. Restart services
5. (Optional) Drop customer_notes table if needed

```sql
-- Rollback migration (if needed)
DROP TABLE IF EXISTS customer_notes;
```

## Success Criteria

### ✅ Feature is successful if:
- [ ] All tests pass
- [ ] No critical bugs
- [ ] Performance is acceptable
- [ ] Users can access the feature
- [ ] Security is maintained
- [ ] Documentation is complete

## Support Plan

### If users report issues:
1. Check logs (backend + frontend)
2. Verify database connection
3. Check API endpoints
4. Verify authentication
5. Check browser console
6. Review error messages

### Common Issues:

#### Issue: "Notes not showing"
**Solution:**
- Check API endpoint
- Verify authentication
- Check database has data
- Check filters

#### Issue: "View button not working"
**Solution:**
- Check routing configuration
- Verify lead_id/customer_id
- Check navigation logic

#### Issue: "Slow performance"
**Solution:**
- Check database indexes
- Verify query optimization
- Check API response time
- Consider caching

---

## Final Sign-off

- [ ] All tests passed
- [ ] All documentation complete
- [ ] Team notified
- [ ] Monitoring in place
- [ ] Support plan ready

**Deployed by:** _________________  
**Date:** _________________  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production

