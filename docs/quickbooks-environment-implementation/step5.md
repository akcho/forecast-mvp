# Step 5: Final Cleanup and Token Refresh Update

## Objective
Complete the QuickBooks environment implementation by updating token refresh logic, adding final validations, and ensuring the entire system works seamlessly in both environments.

## What This Step Accomplishes
- Updates token refresh to remove hardcoded environment parameter
- Adds comprehensive system validation
- Creates final testing and validation endpoints
- Ensures complete environment-agnostic operation
- Provides production readiness checklist

## Prerequisites
- Steps 1, 2, 3, and 4 must be completed successfully
- All API files must be updated and tested
- OAuth integration must be working in both environments

## Implementation Tasks

### 1. Update Token Refresh Route

**File**: `src/app/api/quickbooks/refresh/route.ts`

**Current problematic code** (around lines 45-50):
```typescript
body: new URLSearchParams({
  'grant_type': 'refresh_token',
  'refresh_token': refreshToken,
  'environment': 'sandbox'  // ← REMOVE THIS LINE
})
```

**Replace with**:
```typescript
body: new URLSearchParams({
  'grant_type': 'refresh_token',
  'refresh_token': refreshToken
})
```

**Add configuration import at the top**:
```typescript
import { getQuickBooksConfig } from '@/lib/quickbooks/config';
```

**Optional: Add environment logging for debugging**:
```typescript
// Add after getting refresh token, before making request
const config = getQuickBooksConfig();
console.log(`Refreshing token for environment: ${config.environment}`);
```

### 2. Create System Validation Endpoint

**File**: `src/app/api/test/system-validation/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksConfig, validateEnvironmentConfig } from '@/lib/quickbooks/config';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export async function GET(request: NextRequest) {
  try {
    const config = getQuickBooksConfig();
    const validation = validateEnvironmentConfig();

    // Test OAuth URL generation
    const client = new QuickBooksClient();
    const oauthUrl = client.getAuthorizationUrl();

    // Check for any remaining hardcoded references
    const hardcodedChecks = {
      oauthUrl: {
        hasSandboxParam: oauthUrl.includes('environment=sandbox'),
        expectedForSandbox: config.isSandbox,
        isCorrect: config.isSandbox ? oauthUrl.includes('environment=sandbox') : !oauthUrl.includes('environment=sandbox')
      }
    };

    // Environment consistency check
    const environmentCheck = {
      envVariable: process.env.QB_ENVIRONMENT,
      configEnvironment: config.environment,
      isConsistent: (process.env.QB_ENVIRONMENT || 'sandbox') === config.environment
    };

    // Required environment variables check
    const requiredVars = {
      QB_CLIENT_ID: !!process.env.QB_CLIENT_ID,
      QB_CLIENT_SECRET: !!process.env.QB_CLIENT_SECRET,
      QB_REDIRECT_URI: !!process.env.QB_REDIRECT_URI
    };

    const allRequiredPresent = Object.values(requiredVars).every(Boolean);

    return NextResponse.json({
      success: true,
      environment: config.environment,
      validation,
      hardcodedChecks,
      environmentCheck,
      requiredVars,
      readinessChecks: {
        configValid: validation.isValid,
        environmentConsistent: environmentCheck.isConsistent,
        requiredVarsPresent: allRequiredPresent,
        oauthUrlsCorrect: hardcodedChecks.oauthUrl.isCorrect
      },
      overall: {
        isReady: validation.isValid && environmentCheck.isConsistent && allRequiredPresent && hardcodedChecks.oauthUrl.isCorrect,
        issues: [
          ...validation.errors,
          ...(environmentCheck.isConsistent ? [] : ['Environment variable and config mismatch']),
          ...(allRequiredPresent ? [] : ['Missing required environment variables']),
          ...(hardcodedChecks.oauthUrl.isCorrect ? [] : ['OAuth URL generation incorrect for environment'])
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
```

### 3. Create Integration Test Endpoint

**File**: `src/app/api/test/full-integration/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getQuickBooksConfig, getQuickBooksApiUrl } from '@/lib/quickbooks/config';

export async function GET(request: NextRequest) {
  const config = getQuickBooksConfig();

  try {
    // Test that we can generate URLs for all common endpoints
    const testRealmId = '123456789';
    const commonEndpoints = [
      'companyinfo/1',
      'reports/ProfitAndLoss',
      'reports/BalanceSheet',
      'reports/CashFlow',
      'items',
      'customers',
      'vendors',
      'query'
    ];

    const endpointTests = commonEndpoints.map(endpoint => {
      const url = getQuickBooksApiUrl(testRealmId, endpoint);
      return {
        endpoint,
        url,
        usesCorrectBase: url.startsWith(config.baseUrl),
        noHardcodedSandbox: !url.includes('sandbox-quickbooks') || config.isSandbox
      };
    });

    const allEndpointsCorrect = endpointTests.every(test =>
      test.usesCorrectBase && test.noHardcodedSandbox
    );

    // Test environment-specific behavior
    const environmentTests = {
      sandbox: {
        expectedBaseUrl: 'https://sandbox-quickbooks.api.intuit.com',
        currentBaseUrl: config.baseUrl,
        matches: config.isSandbox && config.baseUrl === 'https://sandbox-quickbooks.api.intuit.com'
      },
      production: {
        expectedBaseUrl: 'https://quickbooks.api.intuit.com',
        currentBaseUrl: config.baseUrl,
        matches: config.isProduction && config.baseUrl === 'https://quickbooks.api.intuit.com'
      }
    };

    const currentEnvironmentCorrect = config.isSandbox ?
      environmentTests.sandbox.matches :
      environmentTests.production.matches;

    return NextResponse.json({
      success: true,
      environment: config.environment,
      config,
      endpointTests,
      environmentTests,
      results: {
        allEndpointsCorrect,
        currentEnvironmentCorrect,
        overallIntegrationCorrect: allEndpointsCorrect && currentEnvironmentCorrect
      },
      summary: {
        totalEndpointsTested: endpointTests.length,
        endpointsCorrect: endpointTests.filter(t => t.usesCorrectBase && t.noHardcodedSandbox).length,
        environmentConfigCorrect: currentEnvironmentCorrect
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

### 4. Update Documentation

**File**: `docs/quickbooks-environment-implementation/README.md` (NEW FILE)

```markdown
# QuickBooks Environment Implementation

This directory contains step-by-step guides for implementing QuickBooks sandbox/production environment support.

## Implementation Steps

1. **[Step 1](./step1.md)**: Add npm Scripts for Environment Switching
2. **[Step 2](./step2.md)**: Create Centralized Configuration Utility
3. **[Step 3](./step3.md)**: Update Core OAuth Integration
4. **[Step 4](./step4.md)**: Update API Files with Hardcoded URLs
5. **[Step 5](./step5.md)**: Final Cleanup and Token Refresh Update

## Quick Start

After completing all steps, use these commands to switch environments:

```bash
# Development with sandbox (test) data
npm run dev:sandbox

# Development with production (real) data
npm run dev:production
```

## Testing Endpoints

Use these endpoints to validate the implementation:

- `/api/test/environment` - Basic environment detection
- `/api/test/qb-config` - Configuration utility testing
- `/api/test/oauth-urls` - OAuth URL generation testing
- `/api/test/all-urls` - API URL generation testing
- `/api/test/system-validation` - Complete system validation
- `/api/test/full-integration` - Integration testing

## Environment Variables

Add to your `.env.local`:

```bash
QB_ENVIRONMENT=sandbox  # or 'production'
```

## Production Checklist

Before deploying to production:

1. ✅ All test endpoints pass
2. ✅ OAuth works in both environments
3. ✅ API calls use correct URLs
4. ✅ No hardcoded sandbox references remain
5. ✅ Environment variables configured correctly
```

## Testing Instructions

### Test 1: Token Refresh Validation
```bash
npm run dev:sandbox
```
Navigate to `/api/test/system-validation`

**Expected**: `readinessChecks.oauthUrlsCorrect` should be `true`

### Test 2: Complete System Validation (Sandbox)
```bash
npm run dev:sandbox
```
Navigate to `/api/test/system-validation`

**Expected Response**:
```json
{
  "overall": {
    "isReady": true,
    "issues": []
  },
  "readinessChecks": {
    "configValid": true,
    "environmentConsistent": true,
    "requiredVarsPresent": true,
    "oauthUrlsCorrect": true
  }
}
```

### Test 3: Complete System Validation (Production)
```bash
npm run dev:production
```
Navigate to `/api/test/system-validation`

**Expected**: Same as above but with `environment: "production"`

### Test 4: Full Integration Test
```bash
npm run dev:sandbox
npm run dev:production
```

For both environments, navigate to `/api/test/full-integration`

**Expected**: `results.overallIntegrationCorrect` should be `true`

### Test 5: End-to-End OAuth Test

**Sandbox**:
```bash
npm run dev:sandbox
```
- Complete OAuth flow
- Should see sandbox companies
- Should successfully connect and fetch data

**Production** (if you have real QB account):
```bash
npm run dev:production
```
- Complete OAuth flow
- Should see real companies
- Should successfully connect and fetch real data

## Success Criteria

✅ **Token refresh updated (no hardcoded environment)**
✅ **System validation endpoint created and passing**
✅ **Full integration test endpoint created and passing**
✅ **Documentation updated**
✅ **All test endpoints return success**
✅ **OAuth flows work in both environments**
✅ **API calls work in both environments**
✅ **No hardcoded sandbox references remain**

## Expected Results

After completing this step:
- Complete QuickBooks environment system is functional
- Easy switching between sandbox and production
- All hardcoded references eliminated
- Comprehensive testing and validation available
- Production-ready implementation
- Clear documentation for future developers

## Production Deployment Checklist

Before deploying to production:

### Required Environment Variables
```bash
QB_ENVIRONMENT=production
QB_CLIENT_ID=your_production_client_id
QB_CLIENT_SECRET=your_production_client_secret
QB_REDIRECT_URI=https://yourdomain.com/api/quickbooks/callback
```

### Pre-Deployment Tests
1. Run `/api/test/system-validation` - should return `isReady: true`
2. Run `/api/test/full-integration` - should return `overallIntegrationCorrect: true`
3. Test OAuth flow with production QB app credentials
4. Verify real company data is accessible

### Security Considerations
- Production QB credentials must be different from sandbox
- Ensure production redirect URI matches deployed domain
- Test with real QuickBooks account before user launch
- Monitor for any API rate limits or restrictions

## Rollback Plan

If critical issues are discovered:
1. Set `QB_ENVIRONMENT=sandbox` to return to sandbox-only mode
2. All existing functionality will continue working
3. Fix issues and redeploy with `QB_ENVIRONMENT=production`

## Support and Troubleshooting

Common issues and solutions:
- **OAuth showing wrong companies**: Check QB_ENVIRONMENT variable
- **API calls failing**: Verify all hardcoded URLs were updated
- **Token refresh errors**: Ensure environment parameter was removed
- **Missing companies**: Confirm QuickBooks app has correct permissions