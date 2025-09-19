# Step 3: Update Core OAuth Integration

## Objective
Update the core QuickBooks OAuth client to use dynamic environment configuration instead of hardcoded sandbox parameters.

## What This Step Accomplishes
- Removes hardcoded `&environment=sandbox` from OAuth URLs
- Updates token exchange to use environment-appropriate endpoints
- Enables actual testing of both sandbox and production OAuth flows
- Maintains backwards compatibility

## Prerequisites
- Step 1 and Step 2 must be completed successfully
- Configuration utility must be working and tested
- Environment detection must be functional

## Implementation Tasks

### 1. Update QuickBooks Client OAuth Methods

**File**: `src/lib/quickbooks/client.ts`

**Current problematic code** (around lines 123-126):
```typescript
// Use sandbox authorization endpoint
return `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
       `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
       `&scope=${encodeURIComponent(scope)}&state=${state}` +
       `&environment=sandbox`;  // ← REMOVE THIS
```

**Replace with**:
```typescript
import { getOAuthEnvironmentParam } from '@/lib/quickbooks/config';

// ... in getAuthorizationUrl method around line 123:
const environmentParam = getOAuthEnvironmentParam();
return `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
       `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
       `&scope=${encodeURIComponent(scope)}&state=${state}${environmentParam}`;
```

**Alternative authorization method** (around lines 140-143):
```typescript
// Current problematic code:
return `https://oauth.platform.intuit.com/oauth2/v1/authorize?client_id=${this.clientId}` +
       `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
       `&scope=${encodeURIComponent(scope)}&state=${state}` +
       `&environment=sandbox`;  // ← REMOVE THIS
```

**Replace with**:
```typescript
const environmentParam = getOAuthEnvironmentParam();
return `https://oauth.platform.intuit.com/oauth2/v1/authorize?client_id=${this.clientId}` +
       `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
       `&scope=${encodeURIComponent(scope)}&state=${state}${environmentParam}`;
```

### 2. Update Token Exchange Method

**File**: `src/lib/quickbooks/client.ts`

**Current problematic code** (around lines 160-165):
```typescript
body: new URLSearchParams({
  'grant_type': 'authorization_code',
  'code': code,
  'redirect_uri': this.redirectUri,
  'environment': 'sandbox'  // ← REMOVE THIS LINE
})
```

**Replace with** (remove the environment parameter entirely):
```typescript
body: new URLSearchParams({
  'grant_type': 'authorization_code',
  'code': code,
  'redirect_uri': this.redirectUri
})
```

### 3. Add Import Statement

**File**: `src/lib/quickbooks/client.ts`

**Add this import at the top** (around line 1-5):
```typescript
import { getOAuthEnvironmentParam } from '@/lib/quickbooks/config';
```

### 4. Create OAuth Test Endpoint

**File**: `src/app/api/test/oauth-urls/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksClient } from '@/lib/quickbooks/client';

export async function GET(request: NextRequest) {
  try {
    const client = new QuickBooksClient();

    const standardUrl = client.getAuthorizationUrl();
    const alternativeUrl = client.getAlternativeAuthorizationUrl();

    return NextResponse.json({
      success: true,
      environment: process.env.QB_ENVIRONMENT || 'sandbox',
      urls: {
        standard: standardUrl,
        alternative: alternativeUrl
      },
      analysis: {
        standardHasSandbox: standardUrl.includes('environment=sandbox'),
        alternativeHasSandbox: alternativeUrl.includes('environment=sandbox'),
        standardHasProduction: !standardUrl.includes('environment='),
        alternativeHasProduction: !alternativeUrl.includes('environment=')
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

## Testing Instructions

### Test 1: OAuth URLs in Sandbox Mode
```bash
npm run dev:sandbox
```
Navigate to `http://localhost:3000/api/test/oauth-urls`

**Expected Response**:
```json
{
  "success": true,
  "environment": "sandbox",
  "urls": {
    "standard": "https://appcenter.intuit.com/connect/oauth2?client_id=...&environment=sandbox",
    "alternative": "https://oauth.platform.intuit.com/oauth2/v1/authorize?client_id=...&environment=sandbox"
  },
  "analysis": {
    "standardHasSandbox": true,
    "alternativeHasSandbox": true
  }
}
```

### Test 2: OAuth URLs in Production Mode
```bash
npm run dev:production
```
Navigate to `http://localhost:3000/api/test/oauth-urls`

**Expected Response**:
```json
{
  "environment": "production",
  "urls": {
    "standard": "https://appcenter.intuit.com/connect/oauth2?client_id=...",
    "alternative": "https://oauth.platform.intuit.com/oauth2/v1/authorize?client_id=..."
  },
  "analysis": {
    "standardHasSandbox": false,
    "alternativeHasSandbox": false,
    "standardHasProduction": true,
    "alternativeHasProduction": true
  }
}
```

### Test 3: Actual OAuth Flow (Manual Test)

**Sandbox Test**:
```bash
npm run dev:sandbox
```
1. Go to your app and try to connect QuickBooks
2. Should redirect to QuickBooks with sandbox companies visible
3. **Note**: Only test companies should appear in the dropdown

**Production Test** (CAREFUL - uses real data):
```bash
npm run dev:production
```
1. Go to your app and try to connect QuickBooks
2. Should redirect to QuickBooks with real companies visible
3. **Note**: Real business companies should appear in the dropdown

### Test 4: Token Exchange (Integration Test)

This will be tested automatically when completing the OAuth flow in Test 3. The token exchange should work without the hardcoded environment parameter.

## Success Criteria

✅ **OAuth URLs generated correctly for both environments**
✅ **Sandbox mode includes `&environment=sandbox` parameter**
✅ **Production mode does NOT include environment parameter**
✅ **Token exchange works without hardcoded environment**
✅ **Test endpoint returns expected URL analysis**
✅ **Manual OAuth flow works in both environments**
✅ **QuickBooks shows appropriate companies for each environment**

## Expected Results

After completing this step:
- OAuth flows work correctly in both sandbox and production
- QuickBooks displays sandbox companies when in sandbox mode
- QuickBooks displays real companies when in production mode
- Token exchange functions properly for both environments
- Core OAuth integration is environment-agnostic

## Next Step

Once this step is complete and all tests pass, proceed to **step4.md** to update API files with hardcoded URLs.

## Rollback Plan

If issues occur:
1. Revert changes to `src/lib/quickbooks/client.ts`
2. Restore hardcoded `&environment=sandbox` parameters
3. Remove the import statement
4. Delete the test endpoint
5. OAuth functionality will be restored to original state

## Common Issues

**Import path errors**: Ensure `@/lib/quickbooks/config` resolves correctly
**OAuth redirects failing**: Check that QB_CLIENT_ID and QB_CLIENT_SECRET are set
**Wrong companies showing**: Verify environment variable is being read correctly
**Token exchange errors**: Ensure environment parameter is completely removed from token requests

## Security Notes

- **Be very careful with production testing** - you'll be connecting to real QuickBooks accounts
- **Test with sandbox first** to ensure functionality works
- **Don't commit real QuickBooks credentials** to the repository
- **Production OAuth will show real business data** - ensure you have permission to test