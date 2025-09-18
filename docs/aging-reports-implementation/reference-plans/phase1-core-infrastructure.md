# Phase 1: QuickBooks Aging Reports API Implementation Plan - September 17, 2025

## Overview
Implement aging reports API endpoint following the existing codebase patterns, with fallback strategies for accessing A/R and A/P aging data.

## Core Components to Create

### 1. API Endpoint: `/src/app/api/quickbooks/aging-reports/route.ts`
- **Pattern**: Follow `/profit-loss/route.ts` authentication and connection handling
- **Query Parameters**:
  - `type=receivable|payable` (required)
  - `details=true|false` (optional, default false)
  - `asOfDate=YYYY-MM-DD` (optional, defaults to current date)
  - `company_id` (optional, for multi-company support)
- **Fallback Strategy**:
  - Primary: Try QuickBooks native aging reports (`AgedReceivables`, `AgedPayables`)
  - Fallback: Construct from Invoice/Bill queries with payment analysis
- **Response Format**: Match existing QB API patterns with `QueryResponse` wrapper

### 2. Type Definitions: `/src/lib/types/agingTypes.ts`
- `AgingReport` interface with type, summary, details, and data source
- `AgingTransaction` interface for transaction-level details
- `AgingBucketSummary` interface for standard aging buckets (Current, 1-30, 31-60, 61-90, 90+)
- `CollectionAnalysis` interface for payment pattern insights

### 3. Service Layer: `/src/lib/services/AgingAnalysisService.ts`
- Core methods:
  - `fetchQuickBooksAgingData()` - Primary QB aging report fetching
  - `constructAgingFromTransactions()` - Fallback transaction-based construction
  - `calculateAgingBuckets()` - Standardized aging calculation
  - `analyzeCollectionPatterns()` - Payment pattern analysis
- Error handling with graceful fallbacks
- Data validation and normalization

### 4. Test Endpoint: `/src/app/api/test/aging-reports/route.ts`
- Validation endpoint following existing test pattern
- Test both receivables and payables
- Verify aging calculations and data consistency

## Implementation Steps

### Step 1: Create Core Infrastructure (1-2 hours)
1. Create aging types file with comprehensive interfaces
2. Create basic API endpoint with authentication pattern
3. Add query parameter parsing and validation
4. Implement basic QB connection handling

### Step 2: Implement Data Fetching (2-3 hours)
1. Create AgingAnalysisService with primary QB aging report fetching
2. Implement fallback transaction-based aging construction
3. Add aging bucket calculation algorithm
4. Build data normalization and validation

### Step 3: Add Testing Capability (1 hour)
1. Create test endpoint for validation
2. Add comprehensive error handling
3. Test with different QB company scenarios
4. Verify aging calculations accuracy

### Step 4: Integration Points (1 hour)
1. Update existing types if needed for compatibility
2. Ensure consistent response formatting
3. Add proper error messages and status codes
4. Document API endpoint usage

## Technical Architecture

### Authentication Pattern
- Use `getValidConnection()` from connectionManager
- Support multi-company with `company_id` parameter
- Include automatic token refresh handling
- Follow existing QB API security patterns

### Data Flow
```
Client Request → Authentication → QB Aging API (primary)
                                ↓ (if fails)
                              Transaction Construction (fallback)
                                ↓
                              Aging Calculation → Response
```

### Aging Bucket Algorithm
- Current: Due date >= today
- 1-30 days: 1-30 days past due
- 31-60 days: 31-60 days past due
- 61-90 days: 61-90 days past due
- 90+ days: More than 90 days past due

## Expected Deliverables

1. **Functional aging reports API** following codebase patterns
2. **Comprehensive type definitions** for aging data structures
3. **AgingAnalysisService** with primary and fallback data fetching
4. **Test endpoint** for validation and debugging
5. **Integration-ready code** that works with existing architecture

This foundation will enable enhanced working capital modeling and cash flow forecasting in subsequent phases.