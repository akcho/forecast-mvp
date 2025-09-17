# Company Dropdown Fixes

## Issues Identified

After conducting phases 1 and 2 of database migration, several issues were discovered with the company dropdown functionality:

1. **Company dropdown cuts off the full company name** - The Tremor Select component doesn't handle long company names well
2. **Nothing changes when clicking between companies** - Missing integration between CompanySwitcher and main app logic
3. **No ability to sign out of a company** - No logout option at company level, only full app logout

## Root Cause Analysis

### CompanySwitcher UI Issues
- Tremor Select doesn't handle text overflow well for long company names
- Company role badge takes up space and may cause truncation
- No tooltips or expanded view for full company names

### Missing Company Context Integration
- CompanySwitcher saves `selected_company_id` to localStorage but nothing reads it
- Backend APIs (like `/api/quickbooks/profit-loss`) use `getValidConnection(userId)` which defaults to first company, ignoring user selection
- No company context provider to sync company selection across components
- Frontend components don't react to company changes

### Logout Functionality Gap
- Only global logout exists via Sidebar.tsx, no per-company disconnect option
- Users can't disconnect from a specific company while staying logged into the app
- No way to remove inactive/expired company connections from UI

## Implementation Plan

### Phase 1: Fix UI Truncation Issues
**Objective**: Make company names fully visible and improve UX

**Changes**:
- Replace Tremor Select with a custom dropdown that handles long company names better
- Implement proper text wrapping and ellipsis with tooltips
- Redesign company role badge placement to not interfere with company name
- Add visual indicators for active/selected company

**Files to modify**:
- `src/components/CompanySwitcher.tsx`

### Phase 2: Implement Company Context Management
**Objective**: Make company switching actually work throughout the app

**Changes**:
- Create CompanyProvider context to manage selected company state globally
- Update all API calls to include selected company ID in requests
- Modify backend APIs to use selected company instead of defaulting to first
- Sync localStorage with context state for persistence
- Add loading states during company switches

**Files to create/modify**:
- `src/lib/context/CompanyContext.tsx` (new)
- `src/components/AppLayout.tsx`
- All QuickBooks API routes in `src/app/api/quickbooks/`
- `src/lib/quickbooks/connectionManager.ts`

### Phase 3: Add Company-Level Logout
**Objective**: Allow users to disconnect individual companies

**Changes**:
- Add "Disconnect Company" option to company dropdown menu
- Implement API endpoint to deactivate specific company connections
- Update UI to remove disconnected companies from dropdown immediately
- Add confirmation dialogs for destructive actions

**Files to create/modify**:
- `src/components/CompanySwitcher.tsx`
- `src/app/api/companies/disconnect/route.ts` (new)
- `src/lib/quickbooks/connectionManager.ts`

### Phase 4: Backend API Integration
**Objective**: Ensure all backend operations use correct company context

**Changes**:
- Modify QuickBooks APIs to accept and prioritize company_id parameter
- Update connectionManager.getValidConnection() to use specified company instead of auto-selecting first
- Add proper error handling when selected company has no active connection
- Implement automatic fallback to available company if selected company becomes unavailable

**Files to modify**:
- `src/lib/quickbooks/connectionManager.ts`
- `src/app/api/quickbooks/profit-loss/route.ts`
- `src/app/api/quickbooks/balance-sheet/route.ts`
- `src/app/api/quickbooks/status/route.ts`
- All other QB API routes

## Technical Details

### Current Flow (Broken)
```
User selects company → localStorage.setItem('selected_company_id', id)
API call → getValidConnection(userId) → Uses first company regardless of selection
```

### Target Flow (Fixed)
```
User selects company → CompanyContext.setSelectedCompany(id) + localStorage
API call → getValidConnection(userId, selectedCompanyId) → Uses selected company
```

### Company Context Structure
```typescript
interface CompanyContextType {
  selectedCompanyId: string | null;
  companies: UserCompanyRole[];
  setSelectedCompany: (companyId: string) => Promise<void>;
  disconnectCompany: (companyId: string) => Promise<void>;
  refreshCompanies: () => Promise<void>;
  loading: boolean;
  error: string | null;
}
```

### Backend API Changes
All QuickBooks API routes need to:
1. Accept optional `company_id` query parameter
2. Use selected company from session/context if available
3. Fall back to user's first company if no selection
4. Return proper error if selected company has no connection

## Success Criteria

- ✅ Company names display fully without truncation
- ✅ Switching companies actually changes data throughout the app
- ✅ Users can disconnect individual companies without logging out completely
- ✅ Backend correctly uses selected company for all operations
- ✅ Proper error handling when selected company becomes unavailable
- ✅ Smooth UX with loading states and error messages
- ✅ Company selection persists across browser sessions

## Testing Plan

1. **UI Testing**: Verify long company names display properly with tooltips
2. **Switching Testing**: Confirm data changes when switching between companies
3. **Disconnect Testing**: Verify company disconnection works without affecting other companies
4. **Persistence Testing**: Confirm selected company persists across browser refresh
5. **Error Handling**: Test behavior when selected company connection expires
6. **Multi-user Testing**: Verify company access controls work correctly

## Implementation Order

1. Phase 1 (UI fixes) - Quick win to improve immediate UX
2. Phase 2 (Context) - Core infrastructure for company switching
3. Phase 4 (Backend) - Ensure API integration works correctly
4. Phase 3 (Disconnect) - Advanced feature once core functionality is solid

This order ensures we fix the most visible issues first while building the foundation for complete functionality.