# QuickBooks OAuth Production Fix - September 21, 2025

## Issue Discovered
QuickBooks OAuth connection was failing on `app.netflo.ai` production environment with Intuit connection error page during OAuth setup.

## Root Cause Analysis
Two critical bugs were identified in the QuickBooks OAuth flow:

### 1. Environment Parameter Loss (QuickBooksLogin Component)
**Problem**: When users accessed `app.netflo.ai/forecast?env=sandbox`, clicking "Connect QuickBooks" would redirect to `/api/quickbooks/auth` without preserving the `env=sandbox` parameter.

**Impact**:
- Sandbox mode testing on production was broken
- Environment parameter was lost during OAuth flow
- Server defaulted to production environment incorrectly

### 2. Incorrect Credential Selection Logic (QuickBooksClient)
**Problem**: The credential selection logic was:
```typescript
const useProductionCredentials = environment === 'production' || isDeployed;
```

**Impact**:
- On deployed environments (`isDeployed = true`), it always used production credentials
- Even when explicitly requesting sandbox mode with `?env=sandbox`
- Made sandbox testing impossible on production deployment

## Solutions Implemented

### Fix 1: Environment Parameter Preservation
**File**: `src/components/QuickBooksLogin.tsx`

**Before**:
```typescript
const handleQuickBooksConnect = () => {
  window.location.href = '/api/quickbooks/auth';
};
```

**After**:
```typescript
const handleQuickBooksConnect = () => {
  // Preserve environment parameter if present in current URL
  const urlParams = new URLSearchParams(window.location.search);
  const environment = urlParams.get('env');

  let authUrl = '/api/quickbooks/auth';
  if (environment === 'sandbox') {
    authUrl += '?env=sandbox';
  }

  window.location.href = authUrl;
};
```

### Fix 2: Correct Credential Selection Logic
**File**: `src/lib/quickbooks/client.ts`

**Before**:
```typescript
const useProductionCredentials = environment === 'production' || isDeployed;
```

**After**:
```typescript
// Environment should override deployment status for credential selection
const useProductionCredentials = environment === 'production';
```

### Fix 3: Added Debug Endpoint
**File**: `src/app/api/quickbooks/debug/route.ts`

Added diagnostic endpoint to help troubleshoot OAuth configuration issues:
- Shows detected environment and deployment status
- Displays credential availability
- Shows generated OAuth URL components
- Provides recommendations for configuration issues

**Usage**:
- `https://app.netflo.ai/api/quickbooks/debug` - Production mode diagnostics
- `https://app.netflo.ai/api/quickbooks/debug?env=sandbox` - Sandbox mode diagnostics

## Testing Results

### Local Environment (Before Fix)
✅ `localhost:3000/forecast?env=sandbox` → Worked (sandbox)
❌ `localhost:3000/forecast` → Expected production behavior

### Local Environment (After Fix)
✅ `localhost:3000/forecast?env=sandbox` → Works (sandbox)
✅ `localhost:3000/forecast` → Works (production)

### Production Environment (Expected After Deployment)
✅ `app.netflo.ai/forecast?env=sandbox` → Should work (sandbox with production HTTPS redirect)
✅ `app.netflo.ai/forecast` → Should work (production with production HTTPS redirect)

## Configuration Verification

The debug endpoint confirmed proper configuration:

**Sandbox Mode**:
- Client ID: `ABnT5kFHyB...` (sandbox credentials)
- Environment parameter: `environment=sandbox`
- Redirect URI: Appropriate for deployment environment

**Production Mode**:
- Client ID: `ABKdm2ZbOn...` (production credentials)
- Environment parameter: Not specified (defaults to production)
- Redirect URI: Appropriate for deployment environment

## Deployment Status
- **Committed**: c144c97 - "Fix QuickBooks OAuth environment handling for production deployment"
- **Pushed**: Changes synced to main branch
- **Status**: Ready for production deployment

## Next Steps
1. Deploy to production environment
2. Test OAuth flow on `app.netflo.ai` for both environments
3. Use debug endpoint if issues persist
4. Verify QuickBooks app redirect URI configuration matches production URLs

## Architecture Impact
This fix ensures the environment switching system works correctly on both local and deployed environments:

- **Development**: `localhost:3000/forecast?env=sandbox` for sandbox testing
- **Production**: `app.netflo.ai/forecast?env=sandbox` for sandbox testing with HTTPS redirects
- **Production**: `app.netflo.ai/forecast` for production companies

The credential selection now properly respects the explicit environment parameter regardless of deployment status.

## Additional Debugging (September 21, Evening)

### Issue Persistence
Despite fixing the OAuth environment handling, production OAuth is still failing with Intuit error screen showing:
```
AppConnection flow landed on Error screen
Cannot read properties of undefined (reading 'node')
```

### Debug Endpoint Results
Production debug endpoint shows correct configuration:
```json
{
  "credentials": {
    "hasProductionCredentials": true,
    "productionClientIdLength": 51
  },
  "oauthUrl": {
    "clientId": "ABKdm2ZbOn...",
    "redirectUri": "https://app.netflo.ai/api/quickbooks/callback",
    "environment": "not specified"
  }
}
```

### Troubleshooting Steps Taken
1. **Redirect URI Added**: Added `https://app.netflo.ai/api/quickbooks/callback` to QuickBooks app configuration
2. **Debug Endpoint Created**: `/api/quickbooks/debug` confirms correct credential and URL configuration
3. **Test Callback Added**: Created `/api/quickbooks/test-callback` to verify if callbacks reach the app

### Next Steps for Investigation
1. Test if `https://app.netflo.ai/api/quickbooks/test-callback` is reachable
2. Temporarily change redirect URI in QB app to test callback endpoint
3. Check production logs for OAuth URL generation in `/api/quickbooks/auth`
4. Verify QuickBooks app status (published vs development mode)
5. Test with different QuickBooks companies to rule out company-specific restrictions

### Current Status
- Code changes are correct and deployed
- Configuration appears correct in debug output
- Issue likely lies in QuickBooks app setup or Intuit platform connectivity
- Need to verify redirect URI configuration took effect and app is properly published