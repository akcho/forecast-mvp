# CLAUDE.md

This file provides guidance to Claude Code when working with this AI-powered financial forecasting web application. The platform transforms QuickBooks data into actionable business intelligence through driver-based forecasting for small businesses and fractional CFOs.

## 🚨 IMPORTANT: Keep This File Current

**MANDATORY**: Update this CLAUDE.md file EVERY time you make significant changes to the codebase. This ensures Claude Code has accurate context for future development work.

**When to Update:**
- New features or major functionality changes
- Architecture modifications or service updates
- API endpoint changes or additions
- Status updates (completed features, current roadmap)
- Tech stack or dependency changes

**What to Update:**
- Current Status section with latest feature completion
- API Endpoints if routes change
- Core Architecture if services are modified
- Remove deprecated information immediately

## Commands

```bash
npm run dev     # Development server (localhost:3000)
npm run lint    # ESLint checks
npm run test    # Custom test runner (src/lib/test/runTests.ts)
npm run build   # Production build
```

## Tech Stack

- **Framework**: Next.js 14.1.0 (App Router), TypeScript (strict)
- **UI**: Tremor React, Tailwind CSS, Heroicons, Recharts
- **Database**: Supabase (auth, multi-company data)
- **APIs**: QuickBooks OAuth2, OpenAI, Google SSO

## Core Architecture

**Current System**: Driver-based forecasting with real-time QuickBooks data analysis

**Data Flow**: QuickBooks P&L → Driver Discovery → Forecast Engine → Interactive Dashboard

**Key Services**:
- `DriverDiscoveryService` - Systematic QB data analysis with scoring algorithm
- `DriverForecastService` - Real-time projections with confidence scoring
- `FinancialDataParser` - Structured data extraction from QB reports
- `InsightEngine` - 3-insight psychology framework for business recommendations

**Key Directories**:
- `/src/app/` - Pages: `/forecast/` (main interface), `/analysis/` (AI chat)
- `/src/components/` - `ForecastDashboard.tsx`, `DriverDashboard.tsx`, `QuickBooksLogin.tsx`
- `/src/lib/services/` - Core business logic and data processing

## Driver-Based Forecasting System

**Core Algorithm**:
```
Score = (Materiality × 0.3) + (Variability × 0.2) + (Predictability × 0.2) +
        (Growth Rate × 0.2) + (Data Quality × 0.1)

Include if: Score > 0.4 AND Materiality > 1% AND >= 6 months data
```

**Key Features**:
- Automatic driver discovery from real QuickBooks data (no hardcoded assumptions)
- Interactive forecast controls with real-time updates
- 3-scenario modeling (Baseline/Growth/Downturn)
- Confidence scoring based on data quality and predictability

## Multi-Company Authentication

**Architecture**: Company-owned QuickBooks connections with role-based access

**Database Schema**:
```sql
companies: id, quickbooks_realm_id, name, created_at
users: id, email, google_id, name, created_at
user_company_roles: user_id, company_id, role ('admin'|'viewer'), created_at
quickbooks_connections: company_id, access_token, refresh_token, ...
```

**User Flow**:
- Google SSO for user authentication
- Admin connects QuickBooks once per company
- All users access shared company connection
- Non-admin users don't need QuickBooks accounts

## API Endpoints

**Core Production APIs**:
- `GET /api/quickbooks/discover-drivers` - Driver discovery with materiality scoring
- `POST /api/quickbooks/generate-forecast` - Interactive forecasting with driver controls
- `GET /api/quickbooks/profit-loss?parsed=true` - Structured P&L data
- `GET /api/quickbooks/status` - Connection validation

**Authentication APIs**:
- `/api/quickbooks/callback` - OAuth callback with company creation
- `/api/auth/[...nextauth]` - Google SSO integration

## 3-Insight Psychology Framework

**Rationale**: Based on cognitive psychology research - users make better decisions with 3 focused insights vs overwhelming lists

**Structure**:
1. **Primary Concern** (Warning/Risk) - Most urgent issue requiring attention
2. **Validation** (Success/Strength) - Positive reinforcement of what's working
3. **Opportunity** (Growth/Optimization) - Actionable improvement potential

**Implementation**: `InsightEngine.ts` generates 5+ insights internally, then applies `selectOptimal3Insights()` for strategic selection

## Environment Variables

```bash
# QuickBooks Integration
QB_CLIENT_ID=your_app_id
QB_CLIENT_SECRET=your_app_secret
QB_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# AI Features (Optional)
OPENAI_API_KEY=your_openai_key
```

## Current Status (September 2025)

### ✅ Live Production Features

**Driver-Based Forecasting**:
- Real-time driver discovery from QuickBooks P&L data (2-5ms analysis)
- Interactive dashboard with driver sliders and instant chart updates
- Confidence scoring and business coverage metrics
- 3-scenario modeling with data-driven projections

**Multi-Company Platform**:
- Google SSO with company-owned QuickBooks connections
- Role-based access (admin/viewer) with secure data isolation
- Automatic token refresh preventing 100-day expiration
- Professional login UX with shared connection management

**Business Intelligence**:
- 3-insight psychology framework for focused recommendations
- Business age detection for context-appropriate insights
- Smart analytics (materiality, variability, growth rate analysis)
- AI chat integration for detailed financial exploration

### 🎯 Current User Experience

**Main Interface** (`/forecast`):
1. **Drivers Tab** - Discovered drivers with materiality scores and business insights
2. **Forecast Tab** - Interactive controls with real-time scenario modeling
3. **Reports Tab** - Traditional financial statements with AI chat analysis

**Key Metrics Delivered**:
- "Found 16 key drivers covering 87% of business activity"
- Driver insights: "Plants and Soil correlates 85% with revenue"
- Monthly projections with confidence intervals
- Real-time forecast updates via slider controls

## Development Notes

- **ESM enabled**, `@/*` → `src/*` imports
- **Mobile-first responsive** design with Tremor components
- **TypeScript strict mode** with comprehensive error handling
- **Real QuickBooks data** - zero hardcoded fallbacks throughout system
- **Service singletons** pattern for business logic
- **Custom test runner** in `src/lib/test/` for service validation

## Target Users & Business Value

**Fractional CFOs**:
- Manage multiple client companies from single dashboard
- Generate professional forecasts in minutes, not hours
- Data-driven insights replace manual financial analysis

**Small Business Owners**:
- Understand what actually drives business performance
- Scenario planning without CFO-level expertise
- Clear, focused insights without overwhelming complexity