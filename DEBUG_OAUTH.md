# QuickBooks OAuth Debug Guide

## Issue Summary
When clicking "Connect QuickBooks" on app.netflo.ai/forecast, it immediately redirects back to app.netflo.ai/forecast without completing OAuth.

## Debug Steps

### 1. Check OAuth URL Generation (Production)

Visit this URL in production to see what OAuth URL is being generated:
```
https://app.netflo.ai/api/debug/oauth-url
```

This will show you:
- The exact OAuth URL being generated
- All OAuth parameters (client_id, redirect_uri, etc.)
- Environment detection results
- Credential availability status

### 2. Expected OAuth URL Format

The generated URL should look like:
```
https://appcenter.intuit.com/connect/oauth2?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=https%3A%2F%2Fapp.netflo.ai%2Fapi%2Fquickbooks%2Fcallback&scope=com.intuit.quickbooks.accounting%20openid&state=production_RANDOM_STRING
```

### 3. Common Issues to Check

#### A. Client ID Issues
- **Problem**: `client_id` parameter is missing or invalid
- **Check**: Verify `PRODUCTION_QB_CLIENT_ID` environment variable is set in production
- **Signs**: Debug endpoint shows missing or short client_id

#### B. Redirect URI Mismatch
- **Problem**: Redirect URI doesn't match what's registered in QuickBooks app
- **Check**: Redirect URI should be exactly `https://app.netflo.ai/api/quickbooks/callback`
- **Signs**: QuickBooks immediately redirects back without authorization

#### C. Invalid App Configuration
- **Problem**: QuickBooks app is not properly configured for production
- **Check**: Ensure your QuickBooks app has the correct redirect URI registered
- **Signs**: OAuth fails silently

### 4. QuickBooks App Settings to Verify

In your QuickBooks Developer account, verify:

1. **Redirect URIs** section contains exactly:
   ```
   https://app.netflo.ai/api/quickbooks/callback
   ```

2. **App Environment** is set to "Production" (not sandbox)

3. **OAuth Scope** includes:
   - `com.intuit.quickbooks.accounting`
   - `openid` (for user profile)

### 5. Environment Variables Check

Ensure these are set in production deployment:
```
PRODUCTION_QB_CLIENT_ID=your_production_app_id
PRODUCTION_QB_CLIENT_SECRET=your_production_app_secret
PRODUCTION_REDIRECT_URI=https://app.netflo.ai/api/quickbooks/callback
```

### 6. Test Scenarios

**Scenario A: URL Generation Fails**
- Visit `/api/debug/oauth-url` returns error
- Fix: Check environment variables and credentials

**Scenario B: URL Generated but OAuth Fails**
- Debug endpoint shows valid URL
- But clicking "Connect QuickBooks" still redirects back
- Fix: Check QuickBooks app redirect URI configuration

**Scenario C: OAuth Succeeds but Callback Fails**
- OAuth completes but callback has errors
- Check: Server logs in production deployment platform (Vercel, etc.)

## Next Steps

1. Visit the debug endpoint on production: `https://app.netflo.ai/api/debug/oauth-url`
2. Share the output to identify the specific issue
3. Based on the output, we can determine if it's:
   - Missing credentials
   - Redirect URI mismatch
   - QuickBooks app configuration issue

## Clean Up

After debugging, delete the debug endpoint:
```bash
rm src/app/api/debug/oauth-url/route.ts
```