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

## 🚨 CRITICAL LIMITATIONS

### QuickBooks OAuth Redirect URI Restrictions

**IMPORTANT**: Intuit does **NOT** allow localhost redirect URIs to be registered on production QuickBooks applications.

**Key Facts**:
- ❌ **Production QuickBooks apps**: Cannot add `http://localhost:3000/api/quickbooks/callback` as redirect URI
- ✅ **Sandbox QuickBooks apps**: Can use localhost redirect URIs for development
- 🔒 **Production apps**: Only allow HTTPS redirect URIs (e.g., `https://app.netflo.ai/api/quickbooks/callback`)

**Practical Impact**:
- **Production QB companies cannot be tested on localhost** - this is a platform limitation, not a bug
- **Only sandbox environment works on localhost** via `?env=sandbox` parameter
- **Production testing requires deployment** to a domain with HTTPS

**Current Architecture Status**:
- ✅ `localhost:3000/forecast?env=sandbox` → Works (sandbox companies)
- ❌ `localhost:3000/forecast` → Cannot work (production companies blocked by Intuit)
- ✅ `app.netflo.ai/forecast` → Works (production companies with HTTPS redirect)

**Do NOT suggest**:
- Adding localhost redirect URIs to production QuickBooks app (impossible)
- Configuring production credentials to work on localhost (platform restriction)
- "Fixing" redirect URI configuration for production localhost access (not allowed by Intuit)

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

### QuickBooks Environment Switching Configuration

**Production Integration Status**: ✅ LIVE - URL parameter-based environment switching implemented

**Architecture**: Clean URL parameter-based environment detection for flexible local testing
- **Production Default**: `localhost:3000/forecast` → production APIs + production credentials + localhost redirect
- **Sandbox Override**: `localhost:3000/forecast?env=sandbox` → sandbox APIs + development credentials + localhost redirect
- **Deployed**: `app.netflo.ai/forecast` → production APIs + production credentials + HTTPS redirect

```bash
# QuickBooks Development Credentials (for localhost environments)
QB_CLIENT_ID=your_dev_app_id
QB_CLIENT_SECRET=your_dev_app_secret

# QuickBooks Production Credentials (for deployed environments)
PRODUCTION_QB_CLIENT_ID=your_production_app_id
PRODUCTION_QB_CLIENT_SECRET=your_production_app_secret

# Environment-specific redirect URIs
DEVELOPMENT_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
PRODUCTION_REDIRECT_URI=https://app.netflo.ai/api/quickbooks/callback

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

### QuickBooks Environment Detection Logic

```typescript
// URL parameter-based environment detection
function detectEnvironment(requestUrl?: string): 'sandbox' | 'production' {
  if (requestUrl) {
    // Server-side: extract from request URL
    const url = new URL(requestUrl);
    return url.searchParams.get('env') === 'sandbox' ? 'sandbox' : 'production';
  }

  if (typeof window !== 'undefined') {
    // Client-side: extract from window.location
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('env') === 'sandbox' ? 'sandbox' : 'production';
  }

  return 'production'; // Default for SSR
}

// Environment determines both API endpoints and credentials
production environment → production APIs + production credentials
sandbox environment → sandbox APIs + development credentials
```

**Key Features**:
- **Explicit switching**: Add `?env=sandbox` to test sandbox companies locally
- **Production default**: Default behavior uses production companies for realistic testing
- **UI indicator**: Sandbox mode shows orange "🧪 Sandbox Mode" badge
- **Localhost redirects**: Both environments use localhost redirects for local testing
- **State preservation**: Environment choice preserved through OAuth flow

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

**QuickBooks Environment Switching**:
- URL parameter-based environment detection (`?env=sandbox` for sandbox mode)
- Production-first approach with explicit sandbox testing
- Both environments work on localhost with appropriate redirects
- Environment indicator UI for clear mode awareness
- Clean separation of API endpoints and credentials based on environment

### 🎯 Current User Experience

**Environment Switching**:
- **Production Companies**: Visit `/forecast` (default)
- **Sandbox Testing**: Visit `/forecast?env=sandbox`
- **Environment Indicator**: Orange "🧪 Sandbox Mode" badge appears in sandbox mode

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