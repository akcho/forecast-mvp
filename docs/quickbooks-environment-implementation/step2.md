# Step 2: Create Centralized Configuration Utility

## Objective
Create a centralized configuration utility that provides consistent QuickBooks environment detection and URL generation across the entire application.

## What This Step Accomplishes
- Creates single source of truth for QB environment configuration
- Provides reusable functions for URL generation
- Enables easy testing of configuration logic
- Prepares foundation for updating all hardcoded URLs

## Prerequisites
- Step 1 must be completed successfully
- Environment variable detection must be working
- npm scripts must be functional

## Implementation Tasks

### 1. Create Configuration Utility

**File**: `src/lib/quickbooks/config.ts` (NEW FILE)

```typescript
/**
 * Centralized QuickBooks environment configuration
 * Provides consistent environment detection and URL generation
 */

export interface QuickBooksConfig {
  environment: 'sandbox' | 'production';
  baseUrl: string;
  discoveryDocumentUrl: string;
  isProduction: boolean;
  isSandbox: boolean;
}

/**
 * Get QuickBooks configuration based on environment variable
 */
export function getQuickBooksConfig(): QuickBooksConfig {
  const environment = (process.env.QB_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';

  const baseUrl = environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

  const discoveryDocumentUrl = environment === 'production'
    ? 'https://appcenter.intuit.com/api/v1/connection/oauth2'
    : 'https://appcenter.intuit.com/api/v1/connection/oauth2';

  return {
    environment,
    baseUrl,
    discoveryDocumentUrl,
    isProduction: environment === 'production',
    isSandbox: environment === 'sandbox'
  };
}

/**
 * Generate QuickBooks API URL for a specific endpoint
 */
export function getQuickBooksApiUrl(realmId: string, endpoint: string): string {
  const config = getQuickBooksConfig();
  return `${config.baseUrl}/v3/company/${realmId}/${endpoint}`;
}

/**
 * Generate OAuth authorization URL with proper environment
 */
export function getOAuthEnvironmentParam(): string {
  const config = getQuickBooksConfig();
  return config.isProduction ? '' : '&environment=sandbox';
}

/**
 * Get environment-appropriate token endpoint
 */
export function getTokenEndpoint(): string {
  return 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
}

/**
 * Validate environment configuration
 */
export function validateEnvironmentConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const environment = process.env.QB_ENVIRONMENT;

  if (environment && !['sandbox', 'production'].includes(environment)) {
    errors.push(`Invalid QB_ENVIRONMENT: ${environment}. Must be 'sandbox' or 'production'`);
  }

  if (!environment) {
    warnings.push('QB_ENVIRONMENT not set, defaulting to sandbox');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
```

### 2. Create Configuration Test Endpoint

**File**: `src/app/api/test/qb-config/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import {
  getQuickBooksConfig,
  getQuickBooksApiUrl,
  getOAuthEnvironmentParam,
  validateEnvironmentConfig
} from '@/lib/quickbooks/config';

export async function GET(request: NextRequest) {
  try {
    const config = getQuickBooksConfig();
    const validation = validateEnvironmentConfig();

    // Test URL generation
    const testRealmId = '123456789';
    const testApiUrl = getQuickBooksApiUrl(testRealmId, 'reports/ProfitAndLoss');
    const oauthParam = getOAuthEnvironmentParam();

    return NextResponse.json({
      success: true,
      config,
      validation,
      examples: {
        apiUrl: testApiUrl,
        oauthEnvironmentParam: oauthParam,
        fullOAuthUrl: `https://appcenter.intuit.com/connect/oauth2?client_id=TEST${oauthParam}`
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 3. Update Environment Test Endpoint

**File**: `src/app/api/test/environment/route.ts` (UPDATE EXISTING)

Replace the existing content with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksConfig, validateEnvironmentConfig } from '@/lib/quickbooks/config';

export async function GET(request: NextRequest) {
  const config = getQuickBooksConfig();
  const validation = validateEnvironmentConfig();

  return NextResponse.json({
    success: true,
    environment: config.environment,
    baseUrl: config.baseUrl,
    isProduction: config.isProduction,
    isSandbox: config.isSandbox,
    validation,
    message: `QuickBooks environment detected as: ${config.environment}`
  });
}
```

## Testing Instructions

### Test 1: Configuration Utility (Sandbox)
```bash
npm run dev:sandbox
```
Navigate to `http://localhost:3000/api/test/qb-config`

**Expected Response**:
```json
{
  "success": true,
  "config": {
    "environment": "sandbox",
    "baseUrl": "https://sandbox-quickbooks.api.intuit.com",
    "isProduction": false,
    "isSandbox": true
  },
  "examples": {
    "apiUrl": "https://sandbox-quickbooks.api.intuit.com/v3/company/123456789/reports/ProfitAndLoss",
    "oauthEnvironmentParam": "&environment=sandbox"
  }
}
```

### Test 2: Configuration Utility (Production)
```bash
npm run dev:production
```
Navigate to `http://localhost:3000/api/test/qb-config`

**Expected Response**:
```json
{
  "config": {
    "environment": "production",
    "baseUrl": "https://quickbooks.api.intuit.com",
    "isProduction": true,
    "isSandbox": false
  },
  "examples": {
    "apiUrl": "https://quickbooks.api.intuit.com/v3/company/123456789/reports/ProfitAndLoss",
    "oauthEnvironmentParam": ""
  }
}
```

### Test 3: Validation Function
```bash
# Set invalid environment
QB_ENVIRONMENT=invalid npm run dev
```
Navigate to `http://localhost:3000/api/test/qb-config`

**Should return validation errors**

### Test 4: Updated Environment Endpoint
```bash
npm run dev:sandbox
```
Navigate to `http://localhost:3000/api/test/environment`

**Should return enhanced response with validation**

## Success Criteria

✅ **Configuration utility created successfully**
✅ **All helper functions work correctly**
✅ **Test endpoints return expected data**
✅ **Sandbox configuration generates sandbox URLs**
✅ **Production configuration generates production URLs**
✅ **Environment validation catches invalid values**
✅ **OAuth parameter generation works correctly**

## Expected Results

After completing this step:
- Centralized configuration utility is available
- All environment-specific URLs can be generated dynamically
- Configuration can be easily tested and validated
- Foundation is ready for updating actual QuickBooks integration
- No existing functionality is affected

## Next Step

Once this step is complete and all tests pass, proceed to **step3.md** to update the core OAuth integration.

## Rollback Plan

If issues occur:
1. Delete `src/lib/quickbooks/config.ts`
2. Delete `src/app/api/test/qb-config/route.ts`
3. Revert `src/app/api/test/environment/route.ts` to original version
4. Current functionality will be completely restored

## Common Issues

**Import errors**: Ensure the path alias `@/lib/quickbooks/config` resolves correctly
**TypeScript errors**: Verify all type definitions are correct
**Environment not detected**: Check that npm scripts from Step 1 are working