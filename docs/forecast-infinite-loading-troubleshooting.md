# Troubleshooting Plan for Infinite Loading State

## Issue Description

The `/forecast` page is stuck in an infinite loading state after implementing Phase 2 of company-dropdown-fixes.md. The loading spinner shows continuously and the forecast dashboard never renders.

## Root Cause Analysis

The infinite loading state is caused by several issues in the Phase 2 company context implementation:

1. **Missing Company Context Hook**: The `ForecastDashboard` component calls `useCompany()` but there's no guarantee the CompanyProvider has loaded companies yet.

2. **Company Loading State Conflict**: The `CompanyContext` has its own loading state that conflicts with the forecast page's loading state.

3. **Circular Dependency**: The forecast page checks for connection status, but the new company context also tries to load companies, creating potential race conditions.

4. **Import/Export Issues**: The `/api/companies` route tries to import from `@/lib/auth/companies` which might not exist or be properly implemented.

5. **Context Loading Never Resolves**: The `CompanyContext.refreshCompanies()` function may be failing silently, keeping the loading state permanently true.

## Troubleshooting Plan

### Phase 1: Diagnose the Root Cause (5 minutes)

1. **Check browser console errors**
   - Look for JavaScript errors, network failures, or API errors
   - Check specifically for calls to `/api/companies` and company context loading
   - Examine Network tab in DevTools for failed requests

2. **Add debugging to CompanyContext**
   - Add console logging to track CompanyContext loading states
   - Identify if `refreshCompanies()` is failing or hanging
   - Monitor the lifecycle of company context initialization

3. **Test API endpoints independently**
   - Verify `/api/companies` endpoint works in isolation
   - Check if `@/lib/auth/companies` import exists and is functional
   - Test with direct API calls (curl/Postman)

### Phase 2: Quick Fixes (10 minutes)

1. **Fix missing import issues**
   - Create missing `@/lib/auth/companies` module if needed
   - Or update import to use existing `getUserCompanies` from connectionManager
   - Ensure all TypeScript imports resolve correctly

2. **Add error boundaries and fallbacks**
   - Wrap CompanyProvider with error handling
   - Add fallback loading states for when company context fails
   - Implement timeout mechanisms for hanging requests

3. **Fix loading state logic**
   - Ensure CompanyContext loading resolves properly (both success and error cases)
   - Add timeout fallbacks for hanging API calls
   - Prevent infinite loading loops

### Phase 3: Structural Improvements (15 minutes)

1. **Simplify loading coordination**
   - Make forecast page loading independent of company context loading
   - Use company context as enhancement, not requirement
   - Implement progressive enhancement pattern

2. **Add proper error handling**
   - Show meaningful error messages instead of infinite loading
   - Provide retry mechanisms for failed API calls
   - Display specific error types (network, auth, data, etc.)

3. **Improve user experience**
   - Show progressive loading states with descriptive messages
   - Display what's happening during loading process
   - Add skeleton loaders or progress indicators

### Phase 4: Testing & Validation (5 minutes)

1. **Test all loading scenarios**
   - Fresh page load with no company selected
   - Page load with company in localStorage
   - Error scenarios (API failures, no companies, network issues)
   - Browser refresh scenarios

2. **Verify company switching works**
   - Test that changing companies updates forecast data
   - Ensure smooth transitions between loading states
   - Validate data consistency across company switches

## Technical Details

### Key Files Involved
- `/src/app/forecast/page.tsx` - Main forecast page with loading logic
- `/src/components/ForecastDashboard.tsx` - Dashboard component using company context
- `/src/lib/context/CompanyContext.tsx` - Company context provider
- `/src/app/api/companies/route.ts` - Companies API endpoint
- `/src/lib/quickbooks/connectionManager.ts` - Connection management

### Expected Loading Flow
1. User navigates to `/forecast`
2. Page checks authentication status
3. CompanyProvider loads user's companies
4. Company context selects active company
5. ForecastDashboard loads with selected company
6. Forecast data loads for the company

### Common Failure Points
- API endpoints returning errors silently
- Missing authentication tokens
- Database connection issues
- TypeScript import/export errors
- Race conditions between multiple loading states

## Expected Outcome

After completing this troubleshooting plan:

- Forecast page loads successfully without infinite loading
- Company context integration works properly
- Proper error handling and user feedback
- Smooth company switching functionality
- Clear debugging information for future issues

## Debugging Commands

```bash
# Check Next.js server logs
npm run dev

# Test API endpoints directly
curl -X GET http://localhost:3001/api/companies

# Check database connectivity
# (via Supabase dashboard or direct SQL)

# Monitor network requests
# (via browser DevTools Network tab)
```

## Recovery Steps

If the issue persists after troubleshooting:

1. **Rollback to working state**
   - Revert company context changes
   - Restore original forecast page logic
   - Test basic functionality

2. **Incremental re-implementation**
   - Add company context step by step
   - Test each integration point
   - Maintain working state at each step

3. **Alternative approaches**
   - Use URL-based company selection instead of context
   - Implement company switching without global context
   - Consider server-side company management