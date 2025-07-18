# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a financial forecasting web application built with Next.js 14 that integrates with QuickBooks for real-time financial data and uses AI for intelligent analysis. The app helps businesses analyze their cash runway and make informed financial decisions.

## Key Commands

```bash
# Development
npm run dev         # Start development server at http://localhost:3000

# Code Quality
npm run lint        # Run ESLint checks
npm run test        # Run test suite (custom test runner at src/lib/test/runTests.ts)

# Production Build
npm run build       # Build for production
npm run start       # Start production server
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 14.1.0 with App Router
- **Language**: TypeScript (strict mode)
- **UI**: Tremor React components, Tailwind CSS, Heroicons
- **Database**: Supabase for authentication and shared connections
- **External APIs**: QuickBooks (OAuth2), OpenAI API

### Core Architecture Patterns

1. **Service Singleton Pattern**: Business logic is encapsulated in service classes:
   - `DatabaseService` - Supabase interactions
   - `FinancialCalculationService` - Financial computations
   - Located in `/src/lib/services/`

2. **Client-Server Separation**:
   - API routes in `/src/app/api/` handle external API calls and protect credentials
   - Client components handle UI state
   - QuickBooks has both client (`/src/lib/quickbooks/client.ts`) and server (`/src/lib/quickbooks/server.ts`) implementations

3. **Data Flow**:
   - QuickBooks API → API Routes → Service Layer → UI Components
   - Financial data is fetched, processed, and cached for analysis

### Key Directories

- `/src/app/` - Next.js pages and API routes
  - `/analysis/` - Main financial analysis page
  - `/api/quickbooks/` - QuickBooks integration endpoints
  - `/api/chat/` - AI chat functionality
- `/src/components/` - Reusable React components
- `/src/lib/` - Core business logic
  - `/quickbooks/` - QB integration logic
  - `/services/` - Service layer
  - `/test/` - Test files
- `/src/types/` - TypeScript type definitions

## Important Implementation Details

### QuickBooks Integration
- OAuth2 flow implemented with state parameter for security
- Tokens stored in Supabase for multi-user support
- Both individual and shared connections supported
- Client refreshes tokens automatically

### AI Chat Feature
- Uses OpenAI API for financial analysis
- Context-aware based on current financial data
- Responsive design: sidebar on desktop, full-screen on mobile
- Prompts engineered in `/src/lib/prompt.ts`

### Financial Calculations
- Runway calculator in `/src/lib/runwayCalculator.ts`
- Handles burn rate, cash projections, and recommendations
- Service layer processes QuickBooks data into usable format

### Testing
- Custom test runner using tsx
- Test files in `/src/lib/test/`
- Run with `npm run test`

## Environment Variables

Required variables (see SETUP_ENV.md for details):
- QuickBooks OAuth: `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_REDIRECT_URI`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `OPENAI_API_KEY` for AI features

## Development Notes

- ESM modules enabled (`"type": "module"` in package.json)
- TypeScript path alias: `@/*` maps to `src/*`
- Mobile-first responsive design considerations
- Loading states implemented throughout for better UX
- Error boundaries for graceful error handling