# CLAUDE.md

This file provides guidance to Claude Code when working with this financial forecasting web application built with Next.js 14, QuickBooks integration, and AI analysis.

## Commands

```bash
npm run dev     # Development server (localhost:3000)
npm run lint    # ESLint checks
npm run test    # Custom test runner (src/lib/test/runTests.ts)
npm run build   # Production build
```

## Tech Stack

- **Framework**: Next.js 14.1.0 (App Router), TypeScript (strict)
- **UI**: Tremor React, Tailwind CSS, Heroicons
- **Database**: Supabase (auth, shared connections)
- **APIs**: QuickBooks OAuth2, OpenAI

## Architecture

**Patterns**: Service singletons (`DatabaseService`, `FinancialCalculationService` in `/src/lib/services/`), client-server separation, QuickBooks API → API Routes → Services → UI

**Key Directories**:

- `/src/app/` - Pages: `/overview/` (dashboard), `/forecast/` (scenarios), `/analysis/` (AI chat), `/admin/` (debug)
- `/src/components/` - `AppLayout.tsx`, `Sidebar.tsx`, `ForecastContent.tsx`, `MultiAdminConnectionManager.tsx`, `QuickBooksLogin.tsx`
- `/src/lib/` - Core logic: `/quickbooks/`, `/services/`, `/test/`

## Implementation Details

- **QuickBooks**: OAuth2 with state security, Supabase token storage, auto-refresh, multi-user shared connections
- **AI Chat**: OpenAI API, context-aware financial analysis, responsive design, prompts in `/src/lib/prompt.ts`
- **Financial**: Runway calculator (`/src/lib/runwayCalculator.ts`), burn rate projections
- **Testing**: Custom tsx runner, files in `/src/lib/test/`

## Environment Variables

- **QuickBooks**: `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REDIRECT_URI`
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Google OAuth**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **NextAuth**: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- **Optional**: `OPENAI_API_KEY`

## Development Notes

ESM enabled, `@/*` → `src/*`, mobile-first responsive, loading states, error boundaries

## Current Status (January 2025)

### ✅ COMPLETED FEATURES

- **Forecast Page**: Scenario-based forecasting (Baseline/Growth/Downturn) with real QB data and real-time chart updates (`/src/app/forecast/page.tsx`, `/src/components/ForecastContent.tsx`)
- **Multi-user QB Integration**: Shared connection system - admin OAuth connects, non-admin users access via shared connections
- **Professional Login UX**: Replaced technical interface with clean SaaS-style login

### ✅ LOGIN UX TRANSFORMATION (January 2025)

**Complete**: Successfully replaced confusing technical login with professional interface

**Key Components**:

- **QuickBooksLogin** (`/src/components/QuickBooksLogin.tsx`): Clean "Connect QuickBooks" button with branding
- **Enhanced OAuth**: OpenID Connect scope, user profile capture in callback (`/src/app/api/quickbooks/callback/route.ts`)
- **Admin Interface**: Improved `MultiAdminConnectionManager.tsx` with structured user display
- **Database**: Added `user_email`/`user_name` fields, migration tools (`/src/app/api/migrate-user-info/route.ts`)

### 🚨 KNOWN LIMITATION: QuickBooks OpenID Connect

**Issue**: QuickBooks UserInfo API returns no user profile data despite correct OAuth implementation

- ✅ OAuth includes `openid` scope correctly
- ✅ Admin permissions and fresh tokens work
- ❌ QuickBooks API limitation prevents user identification

**Result**: Users show as "Unknown user" in admin interface due to QB API, not implementation issue

**Potential Solutions**: Investigate QB app config for OpenID, sandbox vs production differences, or alternative user identification methods

### 🎯 STATUS SUMMARY

- **Login UX**: ✅ Complete - Professional interface working
- **OAuth Flow**: ✅ Complete - Technical implementation correct
- **QB Data Access**: ✅ Complete - Shared connection system functional
- **User Display**: ❌ QB API limitation - requires alternative approach

## 🚧 MULTI-COMPANY ARCHITECTURE (In Progress - July 2025)

### Overview

Transforming from single-user to secure multi-company platform with proper authentication and data isolation.

### Database Schema (MVP)

```sql
-- Companies derived from QuickBooks
companies: id, quickbooks_realm_id, name, created_at

-- Users from Google SSO
users: id, email, google_id, name, created_at

-- Many-to-many relationships with roles
user_company_roles: user_id, company_id, role ('admin'|'viewer'), created_at

-- Updated QB connections
quickbooks_connections: ... + company_id
```

### Architecture Decisions

- **Many-to-Many Users ↔ Companies**: One user can access multiple companies (real-world requirement)
- **QB Admin = App Admin**: Successfully completing QB OAuth grants admin role
- **Company Data from QB**: Companies auto-created from QuickBooks CompanyInfo API
- **Server-Side QB Access**: All QuickBooks API calls happen server-side with company validation
- **Session-Based Active Company**: User's current company stored in session/JWT

### Implementation Status

- ✅ Database schema designed
- ✅ Migration scripts created  
- ✅ Schema migration (completed)
- ✅ Google SSO integration
- ✅ QB OAuth updates
- ✅ Company switching UI
- ✅ API security layer

### Migration Files

- `/database/manual_migration.sql` - Run in Supabase SQL Editor
- `/src/app/api/migrate-data/route.ts` - Migrate existing QB connections to companies

## 🔧 ARCHITECTURE REFACTOR: Company-Owned Connections (August 2025)

### Problem Statement

Current implementation ties QuickBooks connections to individual users (`user_id`), but per auth.md requirements, connections should be:
1. **Company-owned**: One connection per company/realm, shared by all users
2. **Admin-authorized once**: Admin connects, all users benefit
3. **Persistent**: Automatic token refresh prevents expiration

### Current vs Target Architecture

**Current (User-Owned):**
- Each user creates their own QB connection
- Non-admins blocked from accessing admin's connection
- Multiple redundant connections per company
- Manual token refresh only

**Target (Company-Owned per auth.md):**
- Admin authorizes once for entire company
- Connection stored at company level
- All users (admin & non-admin) use shared connection
- Automatic token refresh on 401/403
- Background refresh prevents 100-day expiry

### Required Changes

#### 1. Database Logic Refactor
- **Keep** `user_id` in connections table for audit trail ("who connected this?")
- **Change** connection lookup: Use `company_id` as primary key, not `user_id`
- **Update** `getValidConnection()` to fetch by company, not user

#### 2. Connection Manager Updates (`/src/lib/quickbooks/connectionManager.ts`)
- Remove `getUserId()` logic for connection retrieval
- Update `getAvailableConnections()` to fetch all company connections
- Remove distinction between "direct" and "shared" connections (all are shared)

#### 3. OAuth Callback (`/src/app/api/quickbooks/callback/route.ts`)
- Check for existing company connection before creating new
- Update existing connection if realm already connected
- Store `connected_by_user_id` for audit

#### 4. Automatic Token Refresh
- Wrap all QB API calls with refresh-on-401 middleware
- Update `/src/lib/quickbooks/client.ts` to auto-refresh
- Add retry logic with fresh tokens

#### 5. Background Token Refresh
- Create `/src/app/api/cron/refresh-tokens/route.ts`
- Refresh all tokens older than 24 hours
- Prevent 100-day expiration

#### 6. UI Updates
- Show "Connected by [admin name] on [date]" in connection status
- Remove per-user connection management
- Add company-wide connection status indicator

### Implementation Priority

1. **Phase 1**: Fix connection retrieval (company-based, not user-based)
2. **Phase 2**: Add automatic token refresh on API calls
3. **Phase 3**: Implement background refresh job
4. **Phase 4**: Update UI to reflect shared connection model

### Files to Modify

- `/src/lib/quickbooks/connectionManager.ts` - Primary refactor
- `/src/app/api/quickbooks/callback/route.ts` - Update connection creation
- `/src/lib/quickbooks/client.ts` - Add auto-refresh wrapper
- `/src/components/QuickBooksLogin.tsx` - Show shared connection status
- `/src/app/api/cron/refresh-tokens/route.ts` - New background job

### User Journey Clarification

**Users with Google login but no QuickBooks account:**
1. Sign in with Google → Authenticated but no company association
2. **Empty state**: "No company connected. Ask your admin to connect QuickBooks"
3. **Path A**: Admin invites them → Access QB data instantly (no QB account needed)
4. **Path B**: If they're a QB admin → Can connect new company

**Key insight**: Non-admin users NEVER need QuickBooks accounts. They access financial data through the company's shared connection established by the admin.

### Required Features for Complete Implementation

1. **Empty state UI**: Clear messaging when user has no company
2. **Manual user addition (MVP approach)**:
   - New users sign up with Google first
   - They see empty state: "Ask your admin to grant access"
   - Admin manually adds user's email in Settings → Team Members
   - User refreshes page → immediately sees company data
   - No invitation emails or tokens needed for MVP
3. **Company selector**: For users with multiple companies
4. **Onboarding flow**: Guide new users to request access or connect QB

### Admin User Management Flow (MVP)

**Granting access to non-QuickBooks users:**
1. User signs up with Google OAuth (creates `users` record)
2. User sees empty state with their email displayed: "Your email: user@example.com - Share this with your admin"
3. Admin goes to Settings → Team Members
4. Admin enters user's email and role (viewer/admin)
5. System adds record to `user_company_roles` table
6. User refreshes → Instantly sees financial data

**Key point**: Non-admin users never need QuickBooks accounts. They only need Google login + admin approval.

### Technical Data Flow: How Non-Admin Users Access QuickBooks Data

**Step-by-step data flow:**

1. **User Authentication**: User signs in with Google OAuth → Creates `users` record
2. **Company Check**: API queries `user_company_roles` to find user's company access
3. **Get Company Token**: API fetches company's QB connection from `quickbooks_connections`
4. **Call QB API**: Uses COMPANY's `access_token` (not user-specific!)
5. **Return Data**: QuickBooks returns data, app displays to user

**Critical Understanding:**
```javascript
// QuickBooks API only needs these two things:
const qbRequest = {
  url: `https://sandbox-quickbooks.api.intuit.com/v3/company/${realm_id}/reports/ProfitAndLoss`,
  headers: {
    'Authorization': `Bearer ${company_access_token}` // Company token, NOT user token
  }
};
// No user context needed - QB doesn't know or care which user is asking!
```

**Why this works:** QuickBooks API operates at company level, not user level. The access token represents the COMPANY's permission grant, not any individual's credentials. This is why one admin authorization enables access for ALL team members.

**Visual Flow Diagram:**
```
Non-Admin User                Your App                    QuickBooks
     |                            |                           |
     |--Sign in with Google------>|                           |
     |                            |                           |
     |<--"You're in Company X"----|                           |
     |                            |                           |
     |--"Show me P&L"------------>|                           |
     |                            |                           |
     |                            |--Use Company X's token--->|
     |                            |  (from admin's setup)     |
     |                            |                           |
     |                            |<--P&L Data----------------|
     |                            |                           |
     |<--P&L Report---------------|                           |
```

Key insight: QuickBooks thinks it's the company/admin making the request, not the individual user!
