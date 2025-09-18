# QuickBooks Environment Configuration Fix

## Problem Description

The application is currently hardcoded to use QuickBooks **sandbox environment**, which prevents access to real production QuickBooks companies. When users try to connect their actual business QuickBooks account, only sandbox (test) companies appear in the company dropdown during OAuth, not their real business data.

## Root Cause Analysis

The issue occurs because the application explicitly requests sandbox access in multiple places:

1. **OAuth Authorization URLs** - Uses `&environment=sandbox` parameter
2. **API Base URLs** - All API calls hardcoded to `https://sandbox-quickbooks.api.intuit.com`
3. **Token Exchange** - Includes `'environment': 'sandbox'` in token requests

When a user logs into Intuit during OAuth, QuickBooks only shows sandbox companies because that's what the application specifically requests, even if the user's email has access to both sandbox and production accounts.

## Current Configuration Issues

### OAuth URLs (client.ts:126)
```javascript
return `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}` +
       `&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
       `&scope=${encodeURIComponent(scope)}&state=${state}` +
       `&environment=sandbox`;  // ← HARDCODED SANDBOX
```

### API Base URLs (Multiple Files)
```javascript
const baseUrl = 'https://sandbox-quickbooks.api.intuit.com/v3';  // ← HARDCODED SANDBOX
```

### Token Refresh (refresh/route.ts:47)
```javascript
body: new URLSearchParams({
  'grant_type': 'refresh_token',
  'refresh_token': refreshToken,
  'environment': 'sandbox'  // ← HARDCODED SANDBOX
})
```

## Solution Overview

Convert the application from hardcoded sandbox to configurable environment that supports both sandbox and production QuickBooks access.

## Implementation Plan

### 1. Add Environment Configuration

**File: `.env.local`**
```bash
# Add this line
QB_ENVIRONMENT=production  # or 'sandbox' for testing
```

### 2. Update QuickBooks Client (client.ts)

**Remove hardcoded environment parameters:**
- Line 126: Remove `&environment=sandbox` from `getAuthorizationUrl()`
- Line 143: Remove `&environment=sandbox` from `getAlternativeAuthorizationUrl()`
- Line 161: Remove `'environment': 'sandbox'` from `exchangeCodeForTokens()`

**Add dynamic environment logic:**
```javascript
const environment = process.env.QB_ENVIRONMENT || 'sandbox';
const baseUrl = environment === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';
```

### 3. Update API Base URLs

**Files requiring base URL updates (15+ files):**
- `src/lib/quickbooks/service.ts`
- `src/lib/services/ChatDataService.ts`
- `src/lib/quickbooks/serverStore.ts`
- `src/lib/quickbooks/connectionManager.ts`
- `src/lib/quickbooks/quickbooksServerAPI.ts`
- `src/app/api/quickbooks/callback/route.ts`
- `src/app/api/quickbooks/company/route.ts`
- `src/app/api/quickbooks/reports/route.ts`
- `src/app/api/quickbooks/balance-sheet/route.ts`
- `src/app/api/quickbooks/query/route.ts`
- `src/app/api/quickbooks/profit-loss/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/quickbooks/generate-forecast/route.ts`
- `src/app/api/test/aging-reports/route.ts`
- `src/scripts/migrateUserInfo.ts`

**Replace pattern:**
```javascript
// Before
const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/...`;

// After
const environment = process.env.QB_ENVIRONMENT || 'sandbox';
const baseUrl = environment === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';
const url = `${baseUrl}/v3/company/${realmId}/...`;
```

### 4. Update Token Refresh Logic

**File: `src/app/api/quickbooks/refresh/route.ts`**

Remove hardcoded environment parameter:
```javascript
// Before
body: new URLSearchParams({
  'grant_type': 'refresh_token',
  'refresh_token': refreshToken,
  'environment': 'sandbox'  // ← Remove this line
})
```

### 5. Add Utility Function (Optional)

**File: `src/lib/quickbooks/config.ts` (new file)**
```javascript
export function getQuickBooksConfig() {
  const environment = process.env.QB_ENVIRONMENT || 'sandbox';
  return {
    environment,
    baseUrl: environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com',
    isProduction: environment === 'production'
  };
}
```

## Testing Plan

### Phase 1: Sandbox Verification
1. Set `QB_ENVIRONMENT=sandbox` in `.env.local`
2. Test OAuth flow - should show sandbox companies
3. Verify API calls work with existing connections
4. Confirm no regression in current functionality

### Phase 2: Production Testing
1. Set `QB_ENVIRONMENT=production` in `.env.local`
2. Test OAuth flow - should show real QuickBooks companies
3. Connect to actual business account
4. Verify API calls retrieve real business data
5. Test token refresh with production tokens

### Phase 3: Environment Switching
1. Test switching between sandbox and production
2. Verify connections are isolated by environment
3. Confirm no cross-contamination of data

## Expected Results

**After Implementation:**

1. **OAuth Company Selection**: Setting `QB_ENVIRONMENT=production` will show real QuickBooks business companies in the dropdown during OAuth
2. **API Data Access**: Application will fetch actual business financial data instead of sandbox test data
3. **Flexible Configuration**: Can switch between sandbox (testing) and production (real data) via environment variable
4. **Backwards Compatibility**: Existing sandbox connections continue working when environment is set to sandbox

## Risk Assessment

- **Risk Level**: Low
- **Backwards Compatibility**: ✅ Maintained with environment variable default
- **Data Safety**: ✅ No risk to existing data, only changes data source
- **Rollback Plan**: ✅ Simple - revert environment variable to sandbox
- **Testing**: ✅ Can test both environments independently

## Migration Notes

### For Existing Users
- No action required if staying with sandbox
- To access production data: set `QB_ENVIRONMENT=production` and re-authenticate

### For New Deployments
- Set appropriate `QB_ENVIRONMENT` value based on intended use
- Production deployments should use `QB_ENVIRONMENT=production`
- Development/testing should use `QB_ENVIRONMENT=sandbox`

## Related Documentation

- [QuickBooks OAuth Documentation](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization)
- [Sandbox vs Production Environments](https://developer.intuit.com/app/developer/qbo/docs/develop/sandboxes)
- [System Overview](./SYSTEM_OVERVIEW.md)