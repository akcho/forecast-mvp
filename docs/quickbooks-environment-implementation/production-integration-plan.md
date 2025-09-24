# Production QuickBooks Integration Plan

**Date**: September 20, 2025
**Status**: Ready for Production Credential Integration
**Prerequisites**: ✅ Production credentials obtained from Intuit Developer Portal
**Update**: ✅ Production app redirect URIs configured

## Current Situation Analysis

### ✅ Code Implementation Status

- **Environment Detection**: Complete dynamic switching based on `QB_ENVIRONMENT` variable
- **OAuth Flow**: Enhanced with environment encoding in state parameters
- **API Endpoints**: Dynamic URL generation for sandbox vs production
- **Port Mapping**: Production ports (3001, 3003, 3004) vs sandbox (3000, 3002)

### ✅ Architecture Ready

- OAuth state parameter includes environment: `production_abc123` vs `sandbox_def456`
- Callback route extracts environment from state for correct API calls
- Dynamic credential selection infrastructure prepared
- All hardcoded sandbox URLs eliminated

### 📋 Current Credentials & Configuration

```bash
# Current Development Credentials (in .env and .env.local)
QB_CLIENT_ID=ABnT5kFHyBtDeqymwoRrq612WribCC19qCPR8UnkZB0vG7dWdz
QB_CLIENT_SECRET=NVvIf1OJgvk9Vt31zRcZ1trkp05hdQzRBISmxgc4

# New Production Credentials (to be added)
PRODUCTION_QB_CLIENT_ID=ABKdm2ZbOnkBcwq7pqs0hEmlZuzIt36ruKGuyMtUxkY4PhZqNV
PRODUCTION_QB_CLIENT_SECRET=TOkTYDST8zBdKZmexixgBHTVPN3qrLTm2cs5lWf3
```

### ✅ Production App Redirect URIs Configured

- `https://app.netflo.ai/api/quickbooks/callback` (primary production)
- `https://forecast-mvp.vercel.app/api/quickbooks/callback` (vercel staging)
- `https://developer.intuit.com/v2/OAuth2Playground/RedirectUrl` (testing)

### ✅ Development App Redirect URIs

- `http://localhost:3000/api/quickbooks/callback` (local development)
- `https://app.netflo.ai/api/quickbooks/callback` (production)
- `https://forecast-mvp.vercel.app/api/quickbooks/callback` (staging)

## Implementation Strategy: Hybrid Credential Approach (Updated)

**Selected Approach**: Environment-based credential selection for security and flexibility

### **Hybrid Configuration** (Recommended)

**Pros**:

- Production credentials never used locally (security)
- Clean separation between dev and production environments
- Follows QuickBooks security best practices
- Supports both local development and production deployment

**Implementation**:

```bash
# Local Development: Keep existing development credentials
QB_CLIENT_ID=ABnT5kFHyBtDeqymwoRrq612WribCC19qCPR8UnkZB0vG7dWdz
QB_CLIENT_SECRET=NVvIf1OJgvk9Vt31zRcZ1trkp05hdQzRBISmxgc4

# Production Deployment: Add production credentials
PRODUCTION_QB_CLIENT_ID=ABKdm2ZbOnkBcwq7pqs0hEmlZuzIt36ruKGuyMtUxkY4PhZqNV
PRODUCTION_QB_CLIENT_SECRET=TOkTYDST8zBdKZmexixgBHTVPN3qrLTm2cs5lWf3

# Environment-specific redirect URIs
PRODUCTION_REDIRECT_URI=https://app.netflo.ai/api/quickbooks/callback
DEVELOPMENT_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
```

### **Credential Selection Logic**

- **localhost environments**: Use development app credentials + localhost redirect
- **deployed environments** (app.netflo.ai, vercel.app): Use production app credentials + HTTPS redirects
- **automatic detection**: Based on request origin/environment variables

## Required Implementation Steps

### 1. Environment Variable Updates

- [ ] Add production credentials to `.env` and `.env.local`
- [ ] Add environment-specific redirect URI variables
- [ ] Keep existing development credentials for local use

### 2. Dynamic Credential Selection Logic

Update `src/lib/quickbooks/client.ts` to detect deployment environment:

```typescript
constructor() {
  const isLocalhost = process.env.VERCEL_URL === undefined &&
                     process.env.NODE_ENV !== 'production';

  // Use development credentials for localhost, production credentials for deployed
  this.clientId = isLocalhost
    ? process.env.QB_CLIENT_ID || ''
    : process.env.PRODUCTION_QB_CLIENT_ID || '';
  this.clientSecret = isLocalhost
    ? process.env.QB_CLIENT_SECRET || ''
    : process.env.PRODUCTION_QB_CLIENT_SECRET || '';

  // Select appropriate redirect URI
  this.redirectUri = isLocalhost
    ? process.env.DEVELOPMENT_REDIRECT_URI || 'http://localhost:3000/api/quickbooks/callback'
    : process.env.PRODUCTION_REDIRECT_URI || 'https://app.netflo.ai/api/quickbooks/callback';
}
```

### 3. Testing Protocol

- [ ] **Local Development Testing**: Test with development credentials on localhost
- [ ] **Production Environment Testing**: Deploy to staging/production and test with production credentials
- [ ] **OAuth Verification**: Confirm real QuickBooks companies appear in production OAuth flow
- [ ] **Data Flow Testing**: Complete OAuth → Company Creation → API Calls → Real data retrieval
- [ ] **Environment Isolation**: Verify proper credential selection based on deployment environment

### 4. Validation Checklist

- [ ] **Local Development**: Development credentials used for localhost environments
- [ ] **Production Deployment**: Production credentials used for deployed environments
- [ ] **OAuth Flow**: Real QuickBooks companies appear in production environments
- [ ] **API Integration**: Real business data retrieved successfully
- [ ] **Token Management**: Refresh mechanism works with both credential sets
- [ ] **Error Handling**: Proper error handling for both development and production environments

### 5. Documentation Updates

- [ ] Update CLAUDE.md with hybrid credential configuration
- [ ] Document environment-based credential selection logic
- [ ] Update deployment instructions for both development and production
- [ ] Document redirect URI configuration for each environment

## Technical Architecture (No Changes Needed)

### ✅ Environment Detection Logic

```typescript
// config.ts - Ready for production
const environment = (process.env.QB_ENVIRONMENT || "sandbox") as
  | "sandbox"
  | "production";
```

### ✅ OAuth State Encoding

```typescript
// Automatically includes environment in OAuth flow
state = production_abc123; // for production ports
state = sandbox_def456; // for sandbox ports
```

### ✅ Dynamic API URLs

```typescript
// Automatically selects correct base URL
production: "https://quickbooks.api.intuit.com";
sandbox: "https://sandbox-quickbooks.api.intuit.com";
```

### ✅ Port-Based Environment Mapping

- Port 3000, 3002: `QB_ENVIRONMENT=sandbox`
- Port 3001, 3003, 3004: `QB_ENVIRONMENT=production`

## Expected Outcomes

### Current State (Development Only)

- All environments use development app credentials
- Limited to Intuit sandbox test companies
- Local development works with localhost redirect

### After Hybrid Implementation

- **Local Development**: Continues using development credentials + localhost
- **Production Deployment**: Uses production credentials + HTTPS redirects
- **OAuth Experience**: Real QuickBooks companies appear in deployed environments
- **Data Access**: Full access to actual business financial data
- **Security**: Production credentials never exposed in local development

## Risk Mitigation

### Testing Strategy

1. **Environment-based testing** (local development vs deployed)
2. **Incremental validation** (credentials → OAuth → API calls → real data)
3. **Backup current configuration** before implementing changes
4. **Test both environments** to ensure proper credential selection

### Rollback Plan

- Keep backup of current `.env` files
- Git commit before making credential changes
- Test on single port before updating all environments
- Document any issues encountered for quick resolution

## Next Actions

1. **Environment Setup**: Add production credentials and redirect URIs to environment files
2. **Code Updates**: Implement dynamic credential selection logic in QuickBooksClient
3. **Local Testing**: Validate development credential usage in localhost environments
4. **Deployment Testing**: Test production credential usage in deployed environments
5. **Documentation**: Update CLAUDE.md and relevant documentation

## Updated Status

### ✅ Completed

- Production QuickBooks app configured with HTTPS redirect URIs
- Redirect URI validation resolved (localhost removed from production app)
- Implementation strategy updated to hybrid approach

### 🔄 Ready for Implementation

- Environment variable configuration with production credentials
- Dynamic credential selection logic implementation
- Testing and validation across both environments

### 🎯 Key Benefits of Hybrid Approach

- **Security**: Production credentials isolated from local development
- **Flexibility**: Both development and production testing capabilities
- **Compliance**: Follows QuickBooks security requirements
- **Maintainability**: Clean separation of environments
