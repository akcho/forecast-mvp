# Step 4: Update API Files with Hardcoded URLs

## Objective
Replace all hardcoded `https://sandbox-quickbooks.api.intuit.com` URLs with dynamic environment-based URLs using the centralized configuration utility.

## What This Step Accomplishes
- Updates 22 files with hardcoded sandbox URLs
- Implements consistent URL generation across all API endpoints
- Enables all API calls to work in both sandbox and production
- Maintains API functionality while adding environment flexibility

## Prerequisites
- Steps 1, 2, and 3 must be completed successfully
- Core OAuth integration must be working in both environments
- Configuration utility must be tested and functional

## Implementation Strategy

**Approach**: Update files in small batches to enable testing between changes and easier debugging.

## Batch 1: Core QuickBooks Service Files

### 1. Update QuickBooks Service
**File**: `src/lib/quickbooks/service.ts`

**Find and replace pattern**:
```typescript
// Before
const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/...`;

// After
import { getQuickBooksApiUrl } from '@/lib/quickbooks/config';
const url = getQuickBooksApiUrl(realmId, '...');
```

### 2. Update Connection Manager
**File**: `src/lib/quickbooks/connectionManager.ts`

Apply the same find-and-replace pattern.

### 3. Update Server Store
**File**: `src/lib/quickbooks/serverStore.ts`

Apply the same find-and-replace pattern.

### 4. Update QuickBooks Server API
**File**: `src/lib/quickbooks/quickbooksServerAPI.ts`

Apply the same find-and-replace pattern.

## Batch 2: API Route Handlers

### 5-10. Update Core API Routes
**Files**:
- `src/app/api/quickbooks/callback/route.ts`
- `src/app/api/quickbooks/company/route.ts`
- `src/app/api/quickbooks/balance-sheet/route.ts`
- `src/app/api/quickbooks/profit-loss/route.ts`
- `src/app/api/quickbooks/reports/route.ts`
- `src/app/api/quickbooks/query/route.ts`

For each file, apply the same pattern:
```typescript
// Add import at top
import { getQuickBooksApiUrl } from '@/lib/quickbooks/config';

// Replace URL construction
// Before
const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss`;

// After
const url = getQuickBooksApiUrl(realmId, 'reports/ProfitAndLoss');
```

## Batch 3: Extended API Routes

### 11-16. Update Extended API Routes
**Files**:
- `src/app/api/quickbooks/cash-flow/route.ts`
- `src/app/api/quickbooks/transactions/route.ts`
- `src/app/api/quickbooks/lists/route.ts`
- `src/app/api/quickbooks/test-connection/route.ts`
- `src/app/api/quickbooks/generate-forecast/route.ts`
- `src/app/api/quickbooks/discover-drivers/route.ts`

Apply the same import and URL replacement pattern.

## Batch 4: Chat and Service Integration

### 17-18. Update Chat Integration
**Files**:
- `src/app/api/chat/route.ts`
- `src/lib/services/ChatDataService.ts`

Apply the same pattern, being careful with any complex URL construction.

## Batch 5: Test and Migration Scripts

### 19-22. Update Supporting Files
**Files**:
- `src/app/api/test/aging-reports/route.ts`
- `src/scripts/migrateUserInfo.ts`
- `src/app/api/migrate-data/route.ts`
- `src/app/api/migrate-user-info/route.ts`

Apply the same pattern.

## Testing After Each Batch

### After Batch 1 (Core Services):
```bash
npm run dev:sandbox
```
Test: Navigate to `http://localhost:3000/api/test/qb-config`
- Should still work correctly
- Config should show sandbox URLs

```bash
npm run dev:production
```
Test: Navigate to `http://localhost:3000/api/test/qb-config`
- Should show production URLs

### After Batch 2 (API Routes):
```bash
npm run dev:sandbox
```
Test core API endpoints:
- `/api/quickbooks/company`
- `/api/quickbooks/profit-loss`
- Should return data from sandbox

### After Batch 3 (Extended Routes):
Test additional endpoints:
- `/api/quickbooks/test-connection`
- `/api/quickbooks/discover-drivers`

### After Batch 4 (Chat Integration):
Test the analysis page chat functionality

### After Batch 5 (Supporting Files):
Test any migration or utility endpoints

## Create Comprehensive Test Endpoint

**File**: `src/app/api/test/all-urls/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksConfig, getQuickBooksApiUrl } from '@/lib/quickbooks/config';

export async function GET(request: NextRequest) {
  const config = getQuickBooksConfig();
  const testRealmId = '123456789';

  // Test all common endpoint patterns
  const endpoints = [
    'reports/ProfitAndLoss',
    'reports/BalanceSheet',
    'companyinfo/1',
    'query?query=SELECT * FROM Item',
    'items',
    'customers',
    'vendors',
    'reports/CustomerBalance',
    'reports/VendorBalance',
    'reports/CashFlow'
  ];

  const generatedUrls = endpoints.map(endpoint => ({
    endpoint,
    url: getQuickBooksApiUrl(testRealmId, endpoint)
  }));

  return NextResponse.json({
    success: true,
    environment: config.environment,
    baseUrl: config.baseUrl,
    testRealmId,
    generatedUrls,
    validation: {
      allUrlsUseCorrectBase: generatedUrls.every(item =>
        item.url.startsWith(config.baseUrl)
      ),
      noHardcodedSandbox: generatedUrls.every(item =>
        !item.url.includes('sandbox') || config.isSandbox
      )
    },
    timestamp: new Date().toISOString()
  });
}
```

## File Update Template

For each file, follow this pattern:

```typescript
// 1. Add import at the top
import { getQuickBooksApiUrl } from '@/lib/quickbooks/config';

// 2. Find constructions like this:
const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/reports/ProfitAndLoss`;

// 3. Replace with:
const url = getQuickBooksApiUrl(realmId, 'reports/ProfitAndLoss');

// 4. For complex URLs with query parameters:
const baseUrl = getQuickBooksApiUrl(realmId, 'query');
const url = `${baseUrl}?query=${encodeURIComponent(sqlQuery)}`;
```

## Success Criteria

✅ **All 22 files updated successfully**
✅ **No hardcoded sandbox URLs remain**
✅ **All API endpoints work in both environments**
✅ **Import statements added correctly**
✅ **URL generation uses centralized utility**
✅ **Test endpoint validates all URLs**
✅ **Existing functionality maintained**

## Expected Results

After completing this step:
- All QuickBooks API calls dynamically use the correct environment
- Sandbox mode hits sandbox QuickBooks APIs
- Production mode hits production QuickBooks APIs
- All endpoints maintain their functionality
- URL generation is consistent across the application

## Next Step

Once this step is complete and all tests pass, proceed to **step5.md** for final cleanup and token refresh updates.

## Rollback Plan

If issues occur during any batch:
1. Revert the specific batch of files that caused issues
2. Remove the import statements added
3. Restore the hardcoded URLs for those files
4. Test that functionality is restored
5. Fix the issues before proceeding

## Common Issues

**Import path errors**: Ensure `@/lib/quickbooks/config` imports correctly
**Missing endpoint parameters**: Some URLs might have additional path segments
**Query parameter handling**: Complex URLs might need special handling
**TypeScript errors**: Ensure all types are properly imported

## Progress Tracking

- [ ] Batch 1: Core QuickBooks Services (4 files)
- [ ] Batch 2: API Route Handlers (6 files)
- [ ] Batch 3: Extended API Routes (6 files)
- [ ] Batch 4: Chat and Service Integration (2 files)
- [ ] Batch 5: Test and Migration Scripts (4 files)
- [ ] Create comprehensive test endpoint
- [ ] Final testing and validation