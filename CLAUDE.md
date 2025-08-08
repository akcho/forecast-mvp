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
