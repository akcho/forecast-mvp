# Step 1: QuickBooks Aging Reports API Implementation Plan - September 17, 2025

## Overview
Create a comprehensive QuickBooks Aging Reports API endpoint with fallback strategies for accessing A/R and A/P aging data, following the existing codebase patterns and architecture.

## Primary Implementation Strategy

### 1. New API Endpoint: `/src/app/api/quickbooks/aging-reports/route.ts`

**Endpoint Design:**
```
GET /api/quickbooks/aging-reports?type=receivable&details=true
GET /api/quickbooks/aging-reports?type=payable&details=true
```

**Implementation Approach:**
- **Primary**: Try QuickBooks native aging reports (AgedReceivables/AgedPayables)
- **Fallback**: Construct aging data from Invoices/Bills with customer payment analysis
- **Hybrid**: Combine QB summary data with transaction-level details when available

### 2. Data Structure Definitions

**New Types File:** `/src/lib/types/agingTypes.ts`
```typescript
interface AgingReport {
  type: 'receivable' | 'payable';
  asOfDate: string;
  summary: AgingBucketSummary;
  details: AgingTransaction[];
  source: 'quickbooks_native' | 'constructed_from_transactions' | 'hybrid';
}

interface AgingTransaction {
  customerOrVendor: string;
  documentNumber: string;
  documentDate: string;
  dueDate: string;
  daysOverdue: number;
  amount: number;
  agingBucket: 'current' | '1-30' | '31-60' | '61-90' | '90+';
  originalAmount?: number;
  paymentsReceived?: number;
}

interface AgingBucketSummary {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  total: number;
}
```

### 3. Service Layer: `AgingAnalysisService`

**New File:** `/src/lib/services/AgingAnalysisService.ts`

**Core Responsibilities:**
- Query QB aging reports (primary method)
- Construct aging from transactions (fallback method)
- Normalize data into consistent format
- Calculate aging buckets and metrics
- Provide collection/payment pattern analysis

**Key Methods:**
```typescript
- fetchQuickBooksAgingData(type, realmId, accessToken)
- constructAgingFromTransactions(type, realmId, accessToken)
- calculateAgingBuckets(transactions, asOfDate)
- analyzeCollectionPatterns(agingData)
- generatePaymentOptimizationInsights(agingData)
```

### 4. Enhanced Type Definitions

**Update:** `/src/lib/types/financialModels.ts`
- Add aging-related interfaces
- Extend existing working capital types
- Include collection/payment pattern types

### 5. Integration Points

**Authentication Pattern:**
- Follow existing `/profit-loss/route.ts` pattern
- Use `getValidConnection()` for QB authentication
- Include company_id parameter support
- Handle token refresh automatically

**Error Handling:**
- Graceful fallback if native aging reports unavailable
- Comprehensive validation of constructed data
- Clear error messages for missing data scenarios

**Response Format:**
- Consistent with existing QB API endpoints
- Include metadata about data source and reliability
- Support both summary and detailed views

## Implementation Steps

### Phase 1: Core Infrastructure (2-3 hours)
1. Create `/src/app/api/quickbooks/aging-reports/route.ts`
2. Implement basic QB authentication and connection handling
3. Create `/src/lib/types/agingTypes.ts` with comprehensive type definitions
4. Add basic endpoint testing capability

### Phase 2: Data Fetching Logic (3-4 hours)
1. Create `/src/lib/services/AgingAnalysisService.ts`
2. Implement primary QB aging report fetching
3. Build fallback transaction-based aging construction
4. Add data validation and normalization

### Phase 3: Data Processing (2-3 hours)
1. Implement aging bucket calculations
2. Add collection/payment pattern analysis
3. Create summary metrics generation
4. Build aging transaction detail processing

### Phase 4: Integration & Testing (2-3 hours)
1. Create test endpoints for validation
2. Add comprehensive error handling
3. Implement response formatting
4. Test with different QB company scenarios

### Phase 5: Enhanced Features (1-2 hours)
1. Add caching for aging data (15-minute TTL)
2. Implement date range support
3. Add filtering and sorting options
4. Create aging trend analysis capabilities

## Technical Implementation Details

### QuickBooks API Investigation Strategy

**Primary Approach: Native Aging Reports**
```typescript
// Try QuickBooks native aging endpoints first
const endpoints = [
  'AgedReceivables',
  'AgedPayables',
  'ARAgingSummary',
  'APAgingSummary'
];
```

**Fallback Approach: Transaction Construction**
```typescript
// If native reports unavailable, construct from:
// 1. Invoice queries with payment history
// 2. Bill queries with payment tracking
// 3. Customer/Vendor payment terms
// 4. Historical payment patterns
```

### Data Construction Algorithm

**Aging Bucket Calculation:**
```typescript
function calculateAgingBucket(dueDate: Date, asOfDate: Date): AgingBucket {
  const daysOverdue = Math.floor((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOverdue <= 0) return 'current';
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
}
```

**Collection Pattern Analysis:**
```typescript
function analyzeCollectionPatterns(transactions: AgingTransaction[]): CollectionAnalysis {
  // Analyze historical payment timing
  // Calculate average days to payment by customer
  // Identify seasonal collection patterns
  // Generate collection probability scores
}
```

### API Endpoint Structure

**Route Handler Pattern:**
```typescript
export async function GET(request: NextRequest) {
  // 1. Authentication & validation (following existing pattern)
  const session = await getServerSession(authOptions);
  const connection = await getValidConnection(session.user.dbId, companyId);

  // 2. Parameter extraction
  const { type, details, asOfDate } = extractQueryParams(request);

  // 3. Data fetching with fallback
  let agingData;
  try {
    agingData = await fetchNativeAgingReport(connection, type);
  } catch (error) {
    agingData = await constructAgingFromTransactions(connection, type);
  }

  // 4. Data processing & formatting
  const processedData = await processAgingData(agingData, { details });

  // 5. Response formatting (matching existing QB API patterns)
  return NextResponse.json({
    QueryResponse: {
      AgingReport: processedData
    }
  });
}
```

### Integration with Existing Services

**WorkingCapitalModeler Enhancement:**
```typescript
// Replace hardcoded collection patterns with real aging data
class WorkingCapitalModeler {
  async enhanceWithAgingData(agingData: AgingReport): Promise<RealTimeWorkingCapital> {
    // Use actual customer payment patterns
    // Apply real due dates for cash flow timing
    // Calculate risk-adjusted collection schedules
  }
}
```

**ChatDataService Integration:**
```typescript
// Add aging context to AI chat
interface EnhancedBusinessProfile {
  agingAnalysis: {
    receivables: AgingAnalysis;
    payables: AgingAnalysis;
    riskAssessment: CollectionRiskMetrics;
    optimizationOpportunities: PaymentOptimization[];
  };
}
```

## Quality Assurance

**Data Validation:**
- Cross-reference aging totals with A/R and A/P balances
- Validate date calculations and aging bucket assignments
- Ensure mathematical consistency across all metrics

**Testing Strategy:**
- Unit tests for aging calculations
- Integration tests with QB sandbox
- Error scenario testing (missing data, API failures)
- Performance testing with large datasets

**Documentation:**
- API endpoint documentation
- Service method documentation
- Type definitions with clear descriptions
- Usage examples and common patterns

## Expected Deliverables

1. **Fully functional aging reports API endpoint**
2. **Comprehensive aging data service layer**
3. **Complete type definitions for aging data**
4. **Test endpoints for validation**
5. **Documentation and usage examples**

## Next Steps After Implementation

Once Step 1 is complete, this foundation will enable:

1. **Enhanced Working Capital Modeling** (Step 2)
   - Replace generic patterns with real aging data
   - Use actual due dates for precise cash flow timing

2. **Advanced Cash Flow Forecasting** (Step 3)
   - Risk-adjusted collection projections
   - Payment optimization recommendations

3. **AI Chat Assistant Enhancement** (Step 4)
   - Transaction-level customer/vendor insights
   - Aging-based risk assessment and recommendations

This implementation provides the critical data foundation for transforming generic working capital assumptions into precise, data-driven cash flow forecasting capabilities.