# Step 1: Native Aging Reports Testing Plan

## Required Context

**📖 Read First**:
- [`../../README.md`](../README.md) - Aging reports implementation overview and rationale
- [`../../SYSTEM_OVERVIEW.md`](../../SYSTEM_OVERVIEW.md) - Complete system architecture and existing patterns

Essential background on:
- Current financial forecasting system architecture
- Existing QuickBooks integration patterns to follow
- Service layer architecture and authentication patterns
- Working capital modeling services to integrate with

## Goal
Test QuickBooks aging report endpoints to discover actual API capabilities before building services.

## Deliverable
Create `/src/app/api/test/aging-reports/route.ts` to probe QB aging capabilities.

## Implementation Steps

### 1. Create test endpoint structure
- Follow existing test pattern from `/src/app/api/test/parsed-monthly/route.ts`
- Use same authentication and connection management patterns
- Include comprehensive error handling and logging

### 2. Test native aging report endpoints
- Try `AgedReceivables` endpoint (returns ARAgingSummary response object)
- Try `AgedPayables` endpoint (returns APAgingSummary response object)
- Document exact response structures and error conditions
- Verify endpoint vs response object name distinction

### 3. Test fallback transaction approach
- Query Invoices with payment status
- Query Bills with payment tracking
- Test date calculations and aging bucket logic
- Measure performance with real company data

### 4. Document findings
- Record actual QB response formats
- Identify required vs optional fields
- Note any QB API limitations or quirks
- Determine which approach is viable

## Expected Outcome
Clear understanding of QuickBooks aging API capabilities to inform the service layer implementation.

## Success Criteria
- Know exactly which QB APIs work and how
- Have documented response formats
- Understand error conditions and limitations
- Have a proven data retrieval approach for next phases

## Technical Implementation Notes

### Authentication Pattern (from existing codebase)
```typescript
const session = await getServerSession(authOptions);
const connection = await getValidConnection(session.user.dbId, companyId);
const qbAPI = new QuickBooksServerAPI(
  connection.access_token,
  connection.refresh_token,
  connection.realm_id
);
```

### Endpoints to Test
1. **Native Aging Reports** (CONFIRMED WORKING):
   - `reports/AgedReceivables` (returns ARAgingSummary response object)
   - `reports/AgedPayables` (returns APAgingSummary response object)

   **Note**: ARAgingSummary and APAgingSummary are response object names, not separate endpoints

2. **Fallback Transaction Queries**:
   - `items?query="SELECT * FROM Invoice"`
   - `items?query="SELECT * FROM Bill"`
   - Focus on payment status and aging calculations

### Response Documentation Template
For each endpoint tested, document:
- URL and parameters
- Response structure
- Success/error conditions
- Data completeness
- Performance characteristics