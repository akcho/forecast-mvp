# TODO List - Forecast MVP

Last updated: 2025-01-21

## 🚨 URGENT: Login UX Issue
**Priority: HIGH** - Current login shows confusing technical interface

### Problem
- Users see "Company 9341454766470181" repeated 10+ times
- `MultiAdminConnectionManager` (admin debug interface) used as user login
- No clear approval workflow for non-admin QuickBooks users
- Database has duplicate connections for same company

### Solution Required
Replace current login with normal SaaS approval workflow:

1. **User Experience**:
   - Single "Connect QuickBooks" button
   - Admin users → immediate access  
   - Non-admin users → "Waiting for admin approval" message
   - Clear status updates when approved

2. **Admin Experience**:
   - "Pending Approval Requests" notification
   - List of users requesting access
   - Approve/deny buttons
   - Automatic user access once approved

3. **Technical Implementation**:
   - New approval requests table in Supabase
   - Replace `MultiAdminConnectionManager` usage in login flows
   - Clean up duplicate connections for same realm_id
   - Fetch actual company names from QuickBooks API

### Files to Modify
- `/src/components/MultiAdminConnectionManager.tsx` → Replace with user-friendly component
- `/src/app/overview/page.tsx` (login flow)
- `/src/app/forecast/page.tsx` (login flow) 
- `/src/app/analysis/page.tsx` (login flow)
- `/src/lib/quickbooks/connectionManager.ts` (connection logic)

## ✅ COMPLETED
- [x] Forecast page with scenario modeling (Baseline, Growth, Downturn)
- [x] Real QuickBooks data integration for forecasting
- [x] Multi-user shared connection system (technical implementation)
- [x] Logout/login functionality for testing
- [x] User switching between connections
- [x] API routes working with shared connections

## 📋 PENDING (Lower Priority)
- [ ] **MEDIUM**: AI assistant integration for forecast page
- [ ] **LOW**: AI-driven scenario editing via chat interface

## 🔧 Current Working State
- **Forecast page**: Fully functional with real QB data and percentage controls
- **Multi-user access**: Works technically via shared connections
- **All core features**: Implemented and working
- **Main blocker**: User-unfriendly login interface needs replacement

---

**Next Claude Code session should focus entirely on the login UX issue above.**