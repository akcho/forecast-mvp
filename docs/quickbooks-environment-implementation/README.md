# QuickBooks Environment Implementation Guide

This directory contains comprehensive step-by-step guides for implementing QuickBooks sandbox/production environment support in the forecast MVP application.

## Overview

The application is currently hardcoded to use QuickBooks sandbox environment, preventing access to real production QuickBooks companies. This implementation guide converts the app to support both sandbox and production environments through configuration.

## Problem Being Solved

**Current Issue**: Users can only see sandbox (test) companies during QuickBooks OAuth, not their real business data.

**Root Cause**: Hardcoded `&environment=sandbox` parameters and `https://sandbox-quickbooks.api.intuit.com` URLs throughout the application.

**Solution**: Dynamic environment configuration that allows switching between sandbox and production via environment variables.

## Implementation Steps

### 📋 [Step 1: Add npm Scripts for Environment Switching](./step1.md)
- Add `dev:sandbox` and `dev:production` npm scripts
- Create environment variable detection test endpoint
- Establish foundation for environment switching

### 🔧 [Step 2: Create Centralized Configuration Utility](./step2.md)
- Build `src/lib/quickbooks/config.ts` configuration utility
- Implement dynamic URL generation functions
- Add comprehensive configuration testing

### 🔐 [Step 3: Update Core OAuth Integration](./step3.md)
- Remove hardcoded `&environment=sandbox` from OAuth URLs
- Update token exchange to be environment-agnostic
- Test OAuth flows in both environments

### 🔄 [Step 4: Update API Files with Hardcoded URLs](./step4.md)
- Replace hardcoded sandbox URLs in 22+ files
- Implement consistent API URL generation
- Batch updates with testing between changes

### ✅ [Step 5: Final Cleanup and Token Refresh Update](./step5.md)
- Update token refresh logic
- Add comprehensive system validation
- Create production readiness checklist

## Quick Start (After Implementation)

```bash
# Development with sandbox (test) data
npm run dev:sandbox

# Development with production (real) data
npm run dev:production
```

## Testing Endpoints

Each step includes test endpoints to validate functionality:

- `/api/test/environment` - Basic environment detection
- `/api/test/qb-config` - Configuration utility testing
- `/api/test/oauth-urls` - OAuth URL generation testing
- `/api/test/all-urls` - API URL generation testing
- `/api/test/system-validation` - Complete system validation
- `/api/test/full-integration` - End-to-end integration testing

## Environment Configuration

### Development
```bash
# .env.local
QB_ENVIRONMENT=sandbox  # Default for development
```

### Production
```bash
# Production environment variables
QB_ENVIRONMENT=production
QB_CLIENT_ID=your_production_client_id
QB_CLIENT_SECRET=your_production_client_secret
QB_REDIRECT_URI=https://yourdomain.com/api/quickbooks/callback
```

## Expected User Experience

### Before Implementation
- Users only see sandbox test companies during QuickBooks OAuth
- Cannot access real business financial data
- Hardcoded to sandbox regardless of intent

### After Implementation

**Sandbox Mode** (`QB_ENVIRONMENT=sandbox`):
- Users see sandbox test companies
- API calls retrieve test data
- Safe for development and testing

**Production Mode** (`QB_ENVIRONMENT=production`):
- Users see their real business companies
- API calls retrieve actual financial data
- Ready for production use

## Architecture Benefits

### For Developers
- **Easy Environment Switching**: Simple npm commands
- **Consistent Configuration**: Centralized utility functions
- **Comprehensive Testing**: Validation endpoints for each step
- **Incremental Implementation**: Safe, step-by-step approach

### For Users
- **Real Data Access**: Can connect actual QuickBooks accounts
- **Transparent Operation**: Same UI works with both environments
- **Reliable Connections**: Environment-appropriate OAuth flows

### For Production
- **Environment Flexibility**: Easy deployment configuration
- **Security Compliance**: Proper separation of sandbox/production
- **Monitoring Capability**: Built-in validation and testing endpoints

## Implementation Strategy

### Incremental Approach
Each step builds on the previous, allowing for:
- **Early Testing**: Validate approach before full implementation
- **Easy Debugging**: Isolate issues to recent changes
- **Safe Rollback**: Revert specific changes if needed
- **Confidence Building**: Verify each piece before proceeding

### Risk Mitigation
- **Backwards Compatibility**: Existing functionality preserved
- **Default Safety**: Defaults to sandbox if not configured
- **Comprehensive Testing**: Multiple validation endpoints
- **Clear Documentation**: Step-by-step guidance for each change

## Files Modified

### Core Configuration (New)
- `src/lib/quickbooks/config.ts` - Centralized configuration utility
- `package.json` - npm scripts for environment switching
- `.env.example` - Environment variable documentation

### OAuth Integration (Modified)
- `src/lib/quickbooks/client.ts` - Dynamic OAuth URL generation
- `src/app/api/quickbooks/refresh/route.ts` - Environment-agnostic token refresh

### API Endpoints (Modified - 22+ files)
All files with hardcoded `https://sandbox-quickbooks.api.intuit.com` URLs:
- API route handlers in `src/app/api/quickbooks/`
- Service classes in `src/lib/services/`
- QuickBooks integration files in `src/lib/quickbooks/`
- Migration and utility scripts

### Testing Infrastructure (New)
- Multiple test endpoints for validation
- Comprehensive system validation
- Integration testing capabilities

## Production Readiness

### Pre-Deployment Checklist
1. ✅ All implementation steps completed
2. ✅ System validation endpoint returns `isReady: true`
3. ✅ OAuth tested with production QuickBooks app
4. ✅ API calls verified with real QuickBooks data
5. ✅ Environment variables configured for production
6. ✅ Security review completed

### Monitoring and Validation
- Use test endpoints to verify correct environment operation
- Monitor OAuth success rates in production
- Validate API response data matches expected environment
- Check for any remaining hardcoded references

## Support and Troubleshooting

### Common Issues
- **Wrong companies in OAuth**: Check `QB_ENVIRONMENT` variable
- **API calls failing**: Verify URL updates completed
- **Token refresh errors**: Ensure environment parameter removed
- **Import path errors**: Confirm `@/lib/quickbooks/config` resolves

### Debugging Tools
- Test endpoints provide detailed environment information
- Console logs show current environment configuration
- OAuth URLs can be inspected for correct parameters
- API URLs can be validated through test endpoints

## Future Enhancements

Potential improvements after basic implementation:
- **Automatic Environment Detection**: Based on QuickBooks app configuration
- **Multi-Environment UI**: Visual indicator of current environment
- **Environment-Specific Logging**: Enhanced debugging capabilities
- **Advanced Validation**: Automated environment consistency checks

## Security Considerations

- **Credential Separation**: Production and sandbox must use different QB app credentials
- **Environment Isolation**: No cross-contamination between environments
- **Access Control**: Production environment requires appropriate permissions
- **Monitoring**: Track environment usage for security auditing