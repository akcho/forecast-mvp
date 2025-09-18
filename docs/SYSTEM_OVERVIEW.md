# Financial Forecasting Application - System Overview

## Executive Summary

This is an AI-powered financial forecasting web application that transforms QuickBooks data into actionable business intelligence for small businesses and fractional CFOs. The platform automatically discovers key business drivers from historical financial data and enables real-time scenario planning through an interactive dashboard.

**Target Users:**
- Fractional CFOs managing multiple small business clients
- Small business owners seeking data-driven financial insights
- Financial consultants requiring quick, accurate forecasting tools

**Core Value Proposition:**
- **Data-Driven Driver Discovery**: Systematically analyzes QuickBooks P&L data to identify what truly drives business performance
- **Real-Time Forecasting**: Interactive controls allow instant scenario modeling with confidence scoring
- **Multi-Company Support**: Secure architecture enabling fractional CFOs to manage multiple client companies
- **Business Intelligence**: 3-insight psychology framework delivers focused, actionable recommendations

## Technology Stack

### Frontend
- **Next.js 14.1.0** with App Router architecture
- **TypeScript** (strict mode) for type safety
- **Tremor React** + **Tailwind CSS** for financial dashboard UI
- **Recharts** for interactive data visualization
- **Heroicons** for consistent iconography

### Backend & APIs
- **Next.js API Routes** for server-side business logic
- **QuickBooks API** (OAuth2) for financial data integration
- **OpenAI API** for AI-powered insights and chat analysis
- **Supabase** for authentication and database management

### Architecture Patterns
- **Service Singletons** for business logic (`DriverDiscoveryService`, `FinancialCalculationService`)
- **Client-Server Separation** with secure API endpoints
- **Multi-Tenant Design** supporting company-owned data isolation

## System Architecture

### Data Flow Overview

```
QuickBooks P&L Data → Driver Discovery → Forecast Engine → Interactive Dashboard
                  ↓                  ↓                  ↓
              Data Parsing      Business Logic    Real-Time Updates
              Validation        Scenario Modeling    User Controls
```

### Key Components

1. **Authentication Layer**
   - Google SSO for user management
   - QuickBooks OAuth for financial data access
   - Company-owned connections (admin authorizes once, all users benefit)

2. **Data Processing Pipeline**
   - `FinancialDataParser`: Extracts structured data from QuickBooks P&L reports
   - `DriverDiscoveryService`: Systematic analysis to identify key business drivers
   - `DataValidator`: Ensures data quality and mathematical consistency

3. **Forecasting Engine**
   - `DriverForecastService`: Generates projections based on discovered drivers
   - `InsightEngine`: Produces actionable business recommendations
   - Real-time scenario modeling with user adjustments

4. **User Interface**
   - `ForecastDashboard`: Interactive controls and visualizations
   - `DriverDashboard`: Driver insights with confidence scoring
   - `AnalysisPage`: AI chat integration for detailed exploration

## Current Forecasting System (Sprint 3 Implementation)

### Driver-Based Forecasting Approach

The application implements a sophisticated driver discovery system that replaces traditional static forecasting models:

**Driver Discovery Algorithm:**
```
Score = (Materiality × 0.3) + (Variability × 0.2) + (Predictability × 0.2) +
        (Growth Rate × 0.2) + (Data Quality × 0.1)

Selection Criteria: Score > 0.4 AND Materiality > 1% AND >= 6 months data
```

**Key Features:**
- **Automatic Discovery**: No hardcoded assumptions - data determines what matters
- **Transparent Methodology**: Users see why each driver is important
- **Universal Approach**: Works for any business type through systematic scoring
- **Real QuickBooks Data**: Zero fallback values, all analysis from live transactions

### Forecast Generation Process

1. **Data Analysis** (2-5ms): Analyzes 24 months of QuickBooks data
2. **Driver Scoring**: Evaluates every P&L line item for importance
3. **Business Coverage**: Calculates percentage of business explained by drivers
4. **Interactive Modeling**: Real-time adjustments via slider controls
5. **Confidence Scoring**: Reliability indicators based on data quality

## Authentication & Multi-Company Architecture

### User Management
- **Google SSO Integration**: Secure user authentication with profile capture
- **Role-Based Access**: Admin and viewer permissions per company
- **Session Management**: NextAuth.js with secure session handling

### Company Structure
```sql
companies: id, quickbooks_realm_id, name, created_at
users: id, email, google_id, name, created_at
user_company_roles: user_id, company_id, role, created_at
quickbooks_connections: company_id, access_token, refresh_token, ...
```

### Connection Architecture
- **Company-Owned Connections**: One QuickBooks connection per company
- **Admin Authorization**: Admin connects QB once, all users benefit
- **Automatic Token Refresh**: Prevents 100-day expiration with background refresh
- **Shared Access**: Non-admin users access data through company connection

### User Journey for Non-QB Users
1. Sign in with Google → Creates user record
2. See empty state: "Ask your admin to grant access"
3. Admin adds user email in Settings → Instant access to financial data
4. No QuickBooks account needed for non-admin users

## API Architecture

### Core Endpoints

**Driver Discovery:**
- `GET /api/quickbooks/discover-drivers` - Analyzes QB data to find key business drivers
- Returns: Driver list with materiality scores, confidence ratings, business insights

**Forecast Generation:**
- `POST /api/quickbooks/generate-forecast` - Creates projections with driver controls
- Input: Company ID, projection months, scenario adjustments
- Returns: Base forecast + interactive driver controls + confidence bands

**Data Access:**
- `GET /api/quickbooks/profit-loss?parsed=true` - Raw + structured P&L data
- `GET /api/quickbooks/status` - Connection and company validation

### Service Layer Architecture

**DriverDiscoveryService** (`/src/lib/services/DriverDiscoveryService.ts`)
- Systematic analysis of QB data with composite scoring
- Automatic driver selection based on materiality and predictability
- Business coverage metrics and insight generation

**DriverForecastService** (`/src/lib/services/DriverForecastService.ts`)
- 3-scenario modeling (Baseline/Growth/Downturn)
- Real-time forecast updates with driver adjustments
- Confidence scoring based on data quality

**InsightEngine** (`/src/lib/services/InsightEngine.ts`)
- 3-Insight Psychology Framework for decision support
- Automated insight generation using cognitive psychology principles
- Context-aware recommendations based on business age and performance

### Data Models

**Driver Discovery:**
```typescript
interface DiscoveredDriver {
  id: string;
  name: string;
  type: 'revenue' | 'expense' | 'external';
  materialityScore: number;
  confidenceScore: number;
  correlationWithRevenue: number;
  forecastMethod: 'trend' | 'seasonal' | 'correlation' | 'manual';
}
```

**Forecast Response:**
```typescript
interface ForecastResponse {
  success: boolean;
  forecast: {
    summary: KeyMetricCard[];
    drivers: ProjectedDriver[];
    projections: MonthlyProjection[];
    insights: BusinessInsight[];
  };
}
```

## Business Intelligence Features

### 3-Insight Psychology Framework

Based on cognitive psychology research, the system generates exactly 3 focused insights rather than overwhelming lists:

**Framework Structure:**
1. **Primary Concern** (Warning/Risk) - Most urgent issue requiring attention
2. **Validation** (Success/Strength) - Positive reinforcement of what's working
3. **Opportunity** (Growth/Optimization) - Actionable improvement potential

**Psychology Principles Applied:**
- **Rule of Three**: Information processed optimally in groups of 3
- **Cognitive Load Theory**: Working memory limits for actionable decisions
- **Decision Fatigue**: Too many options decrease decision quality
- **Paradox of Choice**: More options create anxiety and paralysis

### Intelligence Features

**Business Age Detection:**
- Automatically determines operational timeline from QuickBooks data
- Context-appropriate insights for startups vs. established businesses
- Prevents misleading warnings for new businesses with limited data

**Confidence Scoring:**
- Data quality analysis (completeness, consistency, coverage)
- Predictability assessment based on historical variance
- Reliability indicators for each driver and forecast

**Smart Analytics:**
- Materiality analysis (impact on business performance)
- Variability scoring (fixed vs. variable cost behavior)
- Growth rate analysis with seasonal adjustments
- Correlation analysis between revenue and expense drivers

## File Structure Overview

### Core Application
```
/src/app/
├── page.tsx                 # Legacy home (redirects to /forecast)
├── forecast/page.tsx        # Main forecasting interface
├── analysis/page.tsx        # AI chat analysis
└── api/quickbooks/          # QB integration endpoints

/src/components/
├── ForecastDashboard.tsx    # Main forecasting UI
├── DriverDashboard.tsx      # Driver discovery interface
├── QuickBooksLogin.tsx      # Authentication component
└── AppLayout.tsx            # Navigation and layout

/src/lib/services/
├── DriverDiscoveryService.ts    # Driver analysis engine
├── DriverForecastService.ts     # Forecast generation
├── FinancialDataParser.ts       # QB data processing
├── InsightEngine.ts             # Business intelligence
└── DataValidator.ts             # Quality assurance
```

### Documentation
```
/docs/
├── SYSTEM_OVERVIEW.md           # This file - master system description
├── design/                      # Technical design documents
├── sprints/                     # Development sprint documentation
└── setup/                       # Installation and configuration guides
```

## Development Workflow

### Commands
```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Production build with TypeScript compilation
npm run lint     # ESLint checks for code quality
npm run test     # Custom test runner (src/lib/test/runTests.ts)
```

### Environment Variables
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

### Testing Architecture
- **Custom Test Runner**: `src/lib/test/runTests.ts`
- **Validation Endpoints**: 9 test routes for service validation
- **Integration Tests**: End-to-end QuickBooks data flow validation
- **Unit Tests**: Service-level testing for business logic

## Current Status & Roadmap

### ✅ Completed Features (September 2025)

**Sprint 3: Driver-Based Forecasting**
- Driver discovery system with real QuickBooks data
- Interactive forecast dashboard with real-time updates
- 3-insight psychology framework for business recommendations
- Multi-company architecture with role-based access
- Production-ready API endpoints with comprehensive error handling

**Sprint 2: Financial Modeling Infrastructure**
- Advanced forecasting engine with 3-scenario modeling
- Working capital and asset projection capabilities
- Service business optimization for landscaping operations
- Comprehensive cash flow statement integration

**Sprint 1: Foundation**
- QuickBooks OAuth integration with token management
- Multi-user shared connection system
- Professional login UX with Google SSO
- Basic financial data extraction and validation

### 🎯 Business Impact

**For Fractional CFOs:**
- Manage multiple client companies from single dashboard
- Generate professional forecasts in minutes, not hours
- Data-driven insights replace manual financial analysis
- Confident recommendations backed by QuickBooks data

**For Small Business Owners:**
- Understand what actually drives their business performance
- Scenario planning for growth, downturn, and baseline cases
- Clear, focused insights without overwhelming complexity
- Professional-grade forecasting without CFO-level expertise

## Technical Architecture Notes

### Design Principles
- **Data-Driven Decisions**: Let QuickBooks data determine importance, not assumptions
- **User Experience First**: Minimal cognitive load with maximum actionable insight
- **Scalable Architecture**: Multi-tenant design supporting growth
- **Security by Design**: Company data isolation with audit trails

### Performance Considerations
- **Server-Side Processing**: QB API calls and calculations happen server-side
- **Efficient Data Flow**: Minimal client-server round trips
- **Caching Strategy**: 15-minute cache for repeated API calls
- **Background Jobs**: Token refresh prevents authentication failures

### Future Enhancements
- **Automated Insights**: Proactive recommendations based on data changes
- **Industry Benchmarking**: Comparative analysis against similar businesses
- **Advanced Scenarios**: What-if modeling with external economic factors
- **Mobile Optimization**: Responsive design for on-the-go access

---

*This documentation serves as the master reference for understanding the financial forecasting application's architecture, capabilities, and business value. For specific technical details, refer to the design documents in `/docs/design/` and sprint documentation in `/docs/sprints/`.*