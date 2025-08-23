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
- **Monthly Data**: ✅ Complete - 12+ months historical + current actuals (Aug 15, 2025)
- **User Display**: ❌ QB API limitation - requires alternative approach

## 🚀 SPRINT 2: Essential Tabs & Financial Integration (August 2025)

### Current Status: Phase 4 Complete ✅

**MAJOR PROGRESS (Aug 16)**: Sprint 2 comprehensive financial modeling infrastructure complete

#### Phase 1: Data Foundation ✅
- **Fixed QuickBooks monthly data extraction** - Resolved double-wrapping bug
- **Server-side financial data parsing** - Clean extraction from QB reports
- **Data validation and quality checks** - Mathematical consistency verification
- **Enhanced P&L API with optional parsing** - Backwards compatible integration

#### Phase 2: Advanced Forecasting Engine ✅
- **3-Scenario Forecasting Framework** - Baseline/Growth/Downturn modeling
- **Historical Trend Analysis** - Growth rates, seasonality, volatility analysis
- **Advanced Expense Categorization** - Fixed/Variable/Seasonal/Stepped classification
- **Category-Level Inflation Modeling** - Labor 4.5%, Rent 3.8%, Materials 3.5%
- **ServiceBusinessForecaster** - Customer lifecycle, capacity constraints, ARPC modeling
- **Comprehensive Test Suite** - 6 test endpoints validating all components

**Key Services Implemented:**
- `FinancialDataParser` - Structured QB data extraction
- `DataValidator` - Quality assurance and consistency checks  
- `TrendAnalyzer` - Historical pattern analysis
- `ExpenseCategorizer` - Behavioral expense analysis with inflation
- `ForecastEngine` - 3-scenario projections with detailed expenses
- `ServiceBusinessForecaster` - Revenue modeling for service businesses

#### Phase 3: Working Capital & Asset Modeling ✅
- **WorkingCapitalModeler** - A/R, A/P, and inventory projections with collection patterns
- **AssetProjectionModeler** - Fixed asset and depreciation forecasting with seasonal capex
- **Business-Specific Modeling** - Service business optimized for landscaping operations
- **MVP Asset Categories** - Equipment, Vehicles, Technology, Buildings (to be generalized)

#### Phase 4: Comprehensive Cash Flow Integration ✅
- **CashFlowStatementService** - Full 3-statement cash flow model integration
- **Multi-Service Orchestration** - Combines P&L, working capital, and asset projections
- **Production API Endpoint** - /api/quickbooks/cash-flow-forecast for Forecast tab
- **Comprehensive Test Suite** - 9 test endpoints validating all financial services

**Ready for Phase 5**: Visual component implementation and interactive user interface

### Sprint 2 Service Architecture

#### Core Financial Services (`/src/lib/services/`)

**FinancialDataParser** (`FinancialDataParser.ts`)
- Extracts structured data from QuickBooks P&L reports
- Parses nested QB structures into clean monthly arrays
- Handles revenue/expense categorization and totals calculation
- Test endpoint: `/api/test/parsed-monthly`

**DataValidator** (`DataValidator.ts`)  
- Validates data completeness and mathematical consistency
- Checks period coverage, missing months, calculation accuracy
- Generates actionable data quality reports
- Integrated into all parsing operations

**TrendAnalyzer** (`TrendAnalyzer.ts`)
- Analyzes historical financial trends for forecasting inputs
- Calculates growth rates, seasonality scores, volatility metrics
- Identifies fixed vs variable cost patterns through correlation analysis
- Test endpoint: `/api/test/trend-analysis`

**ExpenseCategorizer** (`ExpenseCategorizer.ts`)
- Advanced expense categorization: Fixed/Variable/Seasonal/Stepped
- Category-specific inflation modeling (Labor 4.5%, Rent 3.8%, etc.)
- Behavioral analysis using correlation and variability metrics
- Test endpoint: `/api/test/expense-categorization`

**ForecastEngine** (`ForecastEngine.ts`)
- 3-scenario forecasting framework (Baseline/Growth/Downturn)
- Enhanced mode with category-level expense projections
- Seasonal adjustments and inflation-adjusted modeling
- Test endpoint: `/api/test/forecast-engine`

**ServiceBusinessForecaster** (`ServiceBusinessForecaster.ts`)
- Specialized revenue modeling for service businesses
- Customer lifecycle analysis (acquisition, retention, ARPC)
- Capacity constraints and expansion planning
- Market saturation and competitive effects modeling
- Test endpoint: `/api/test/service-business-forecasting`

**WorkingCapitalModeler** (`WorkingCapitalModeler.ts`)
- A/R, A/P, and inventory modeling for cash flow impact
- 3-month collection patterns (70% month 1, 25% month 2, 4% month 3, 1% bad debt)
- Working capital efficiency metrics and cash conversion cycle
- Seasonal collection and payment pattern adjustments
- Test endpoint: `/api/test/working-capital`

**AssetProjectionModeler** (`AssetProjectionModeler.ts`)
- Fixed asset and depreciation forecasting
- Capital expenditure planning with seasonal timing (spring focus)
- Asset categories: Equipment (50%), Vehicles (30%), Technology (10%), Buildings (10%)
- Depreciation schedules and cash flow impact analysis
- Test endpoint: `/api/test/asset-projections`

**CashFlowStatementService** (`CashFlowStatementService.ts`)
- Comprehensive 3-statement cash flow model integration
- Operating Activities: Net income + depreciation + working capital changes
- Investing Activities: Capital expenditures + asset disposals
- Financing Activities: Debt service + owner distributions
- Multi-scenario projections with risk and performance metrics
- Test endpoint: `/api/test/cash-flow-statement`

#### Enhanced API Routes

**Production Endpoints:**
- `/api/quickbooks/profit-loss?parsed=true` - Returns both raw QB data and parsed structure
- `/api/quickbooks/cash-flow-forecast` - Comprehensive 3-scenario cash flow projections
  - Supports `?months=12` for projection period
  - Supports `?details=true` for full detailed response
  - Optimized for Forecast tab UI consumption

**Test & Validation Endpoints:**
- `/api/test/parsed-monthly` - FinancialDataParser validation
- `/api/test/trend-analysis` - TrendAnalyzer historical pattern analysis
- `/api/test/expense-categorization` - ExpenseCategorizer behavioral analysis
- `/api/test/forecast-engine` - ForecastEngine 3-scenario P&L projections
- `/api/test/service-business-forecasting` - ServiceBusinessForecaster revenue modeling
- `/api/test/working-capital` - WorkingCapitalModeler A/R, A/P projections
- `/api/test/asset-projections` - AssetProjectionModeler capex and depreciation
- `/api/test/cash-flow-statement` - CashFlowStatementService full integration
- `/api/test/monthly-data` - Raw monthly data extraction

**Notes:**
- All endpoints provide comprehensive validation and debugging output
- Maintains full backwards compatibility with existing analysis page
- Test endpoints require authentication but provide detailed error reporting

## 🎯 SPRINT 3: Driver-Based Forecasting Pivot (August 2025)

### Rationale for Strategic Pivot

After analyzing best forecasting practices from industry experts, we identified critical issues with our complex cash flow modeling approach:

**Problems with Previous Approach:**
- **Too Complex**: 3-statement cash flow modeling was overwhelming for users
- **Data Issues**: Using hardcoded fallback values ($140,000) instead of real QuickBooks data
- **Missing Best Practice**: Not implementing driver-based forecasting (the #1 recommended technique)
- **Not Actionable**: Users couldn't understand what actually drives their business
- **Generic Models**: Complex services that don't connect to real business drivers

### New Approach: Data-Driven Driver Discovery

**Core Philosophy:** Let QuickBooks data tell us what matters instead of making assumptions

**Systematic Driver Discovery Process:**
1. **Analyze Every Line Item** - Evaluate all P&L and Balance Sheet entries
2. **Score by Importance** - Use materiality, variability, predictability, and correlation
3. **Automatic Selection** - No arbitrary "10-15 drivers" - data determines what matters
4. **Transparent Methodology** - Users see why each driver is important
5. **Forecast Method Matching** - Different drivers use appropriate forecasting techniques

**Driver Scoring Algorithm:**
```
Score = (Materiality × 0.3) + (Variability × 0.2) + (Predictability × 0.2) + 
        (Growth Rate × 0.2) + (Data Quality × 0.1)

Include if: Score > 0.4 AND Materiality > 1% AND >= 6 months data
```

### Implementation Architecture

**New Components:**
- **DriverDiscoveryService** - Systematic analysis of QB data to identify true business drivers
- **DriverDashboard** - Clean UI showing discovered drivers with sparklines and insights
- **/api/quickbooks/discover-drivers** - API endpoint for driver discovery and analysis

**Components Being Deprecated:**
- ❌ **CashFlowStatement.tsx** - Overly complex 3-statement modeling
- ❌ **ForecastContentEnhanced.tsx** - Too many tabs and confusing views
- ❌ **Complex service classes** that don't connect to real drivers
- ❌ **Hardcoded demo data** and fallback values throughout

### Sprint 3 Current Status: IMPLEMENTATION COMPLETE ✅

**MAJOR PROGRESS (Aug 23)**: Driver-based forecasting system fully implemented and operational

**Driver Discovery System:**
- ✅ **DriverDiscoveryService** - Full systematic analysis of QB data with scoring algorithm
- ✅ **API Endpoint** - `/api/quickbooks/discover-drivers` production endpoint
- ✅ **Driver Dashboard UI** - Interactive interface with driver cards, insights, and business coverage metrics
- ✅ **Smart Analytics** - Materiality, predictability, variability, and growth rate analysis
- ✅ **Business-Friendly Display** - Clear explanations and actionable insights for users

**Forecast System:**
- ✅ **Driver-Based Forecasting** - `/api/quickbooks/generate-forecast` with real QB driver data
- ✅ **ForecastDashboard** - Interactive controls with driver sliders and real-time updates
- ✅ **3-Scenario Modeling** - Baseline projections with user-adjustable drivers
- ✅ **Confidence Scoring** - Reliability indicators based on data quality and predictability

**Key Technical Achievements:**
- ✅ **Real Data Integration** - No hardcoded values, all analysis from actual QB transactions
- ✅ **Business Age Intelligence** - System understands operational timeline and business lifecycle
- ✅ **Smart Error Prevention** - Fixed misleading warnings for new businesses
- ✅ **Modern UI Architecture** - Unified page headers with context-aware controls

### ACTUAL RESULTS ACHIEVED ✅

**User Experience (Live in Production):**
1. ✅ **"Analyzing your data..."** - Automatic driver discovery runs in 2-5ms
2. ✅ **"Found 16 key drivers"** - Dynamic list based on actual materiality thresholds  
3. ✅ **Driver insights** - "Plants and Soil correlates 85% with revenue", business coverage metrics
4. ✅ **Interactive forecasting** - Real-time slider adjustments update charts instantly
5. ✅ **Actionable results** - Monthly projections with confidence intervals and key insights

**Technical Benefits (Delivered):**
- ✅ **Real QuickBooks data** - Zero hardcoded fallbacks, all from live QB transactions
- ✅ **Universal approach** - Works for any business size/type through systematic scoring
- ✅ **Transparent methodology** - Users see materiality scores, predictability, data quality
- ✅ **True business drivers** - Focus on items that actually impact financial performance
- ✅ **Production-ready UI** - Modern, responsive interface with professional UX

### Current Live Features (August 2025)

**Three Main Tabs:**
1. **Drivers** - Driver discovery with business coverage analysis and driver cards
2. **Forecast** - Interactive forecasting with driver controls and scenario modeling  
3. **Reports** - Traditional financial statements with AI chat analysis

**Enhanced Intelligence:**
- Business age detection for context-appropriate insights
- Smart data quality analysis that avoids false warnings for new businesses
- Automatic date range parsing for complex QB formats
- Real-time forecast updates with confidence scoring

### Sprint 2 Implementation Summary

**Services Architecture Completed:**
1. **Data Layer**: FinancialDataParser, DataValidator
2. **Analysis Layer**: TrendAnalyzer, ExpenseCategorizer
3. **Forecasting Layer**: ForecastEngine, ServiceBusinessForecaster
4. **Financial Modeling**: WorkingCapitalModeler, AssetProjectionModeler
5. **Integration Layer**: CashFlowStatementService

**Key Technical Achievements:**
- **Full 3-Statement Integration**: P&L, Balance Sheet changes, and Cash Flow
- **Service Business Optimization**: Landscaping-specific modeling patterns
- **Comprehensive Test Coverage**: 9 validation endpoints covering all services
- **Production-Ready API**: Optimized endpoint for Forecast tab consumption
- **Backwards Compatibility**: Maintained existing analysis page functionality

**MVP Limitations Identified (for future generalization):**
- Asset categories are hardcoded (Equipment 50%, Vehicles 30%, Technology 10%, Buildings 10%)
- Collection patterns use industry standards rather than company-specific analysis
- Seasonal patterns are template-based rather than derived from historical data
- Service business focus may need adaptation for product-based businesses

**Financial Modeling Completeness:**
- ✅ Revenue projections with growth scenarios
- ✅ Expense categorization with inflation modeling
- ✅ Working capital impact on cash flow
- ✅ Capital expenditure and depreciation schedules
- ✅ Operating, investing, and financing cash flows
- ✅ Risk metrics and scenario analysis
- ⏳ Equity calculations (retained earnings) - pending
- ⏳ Visual components for user interaction

### Next Steps: Visual Implementation Phase

**Phase 5 - UI Components (Pending):**
1. **CashFlowStatement Component** - Visual cash flow statement display
2. **Enhanced ForecastContent** - Replace simple weekly charts with comprehensive monthly projections
3. **AssumptionsPanel** - Interactive controls for scenario adjustments
4. **Cash Flow Dashboard** - Multi-tab interface with different financial views

**Integration Pattern for UI:**
- Fetch from `/api/quickbooks/cash-flow-forecast`
- Display 3-scenario comparison cards
- Show monthly cash flow charts (Operating, Investing, Financing)
- Enable drill-down into supporting data (A/R, A/P, Capex)
- Provide assumption adjustment controls

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
