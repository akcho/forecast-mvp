# Database-Only QuickBooks Authentication Migration

## Problem Statement

The application currently runs **two conflicting authentication systems** that cause users to see data from the wrong QuickBooks company:

### Current Broken Architecture
- **Frontend Components**: Use legacy `quickBooksStore` → reads from browser cookies → gets old realm ID (`9341454766470181`)
- **Backend API Routes**: Use modern `ConnectionManager` → reads from Supabase database → gets new realm ID

### Symptoms
- Users see data from previous sandbox companies even after creating new ones
- Manual cookie clearing required every time a new company is added
- Inconsistent data between frontend and backend
- Multi-company switching doesn't work properly

## Migration Strategy

### Phase 1: Create Unified Frontend API Client

**Create**: `/src/lib/quickbooks/databaseClient.ts`

```typescript
// New database-backed client that replaces quickBooksStore
export class DatabaseQuickBooksClient {
  async getConnectionStatus(): Promise<ConnectionStatus>
  async getAccessToken(): Promise<string | null>
  async getRealmId(): Promise<string | null>
  async isAuthenticated(): Promise<boolean>
  async switchCompany(companyId: string): Promise<void>
}
```

**Benefits**:
- Single API that calls backend instead of reading cookies
- Maintains same interface as `quickBooksStore` for easy migration
- Supports multi-company switching out of the box

### Phase 2: Frontend Component Migration

**Files requiring migration** (7 total):

#### High Priority Components
1. **`/src/components/chat.tsx`**
   - **Current**: Uses `quickBooksStore.getAccessToken()` for headers
   - **Change**: Replace with API call to get connection data
   - **Impact**: Chat functionality broken until fixed

2. **`/src/app/page.tsx`**
   - **Current**: Legacy URL parameter handling with `quickBooksStore.setTokens()`
   - **Change**: Remove legacy OAuth handling, use database flow only
   - **Impact**: Main page authentication

3. **`/src/components/ForecastContent.tsx`**
   - **Current**: Mixed usage of `quickBooksStore` and `getValidConnection`
   - **Change**: Use database client consistently
   - **Impact**: Forecast page functionality

#### Secondary Components
4. **`/src/app/drivers/page.tsx`** - Driver discovery page
5. **`/src/app/overview/page.tsx`** - Overview dashboard
6. **`/src/app/forecast/page.tsx`** - Forecast dashboard
7. **`/src/app/dashboard/page.tsx`** - Legacy dashboard (may be deprecated)

### Phase 3: Remove Legacy Infrastructure

**Files to delete**:
- **`/src/lib/quickbooks/store.ts`** - Cookie-based store (complete removal)
- **`/src/lib/quickbooks/serverStore.ts`** - Header-based store (complete removal)

**Files to update**:
- **`/src/lib/quickbooks/client.ts`** - Remove all `quickBooksStore` dependencies
- **API routes using headers** - Remove header-based authentication

### Phase 4: API Enhancement

**New API endpoints needed**:

1. **`/api/quickbooks/connection-tokens`** (GET)
   ```typescript
   // Returns access tokens for authenticated requests
   {
     access_token: string,
     realm_id: string,
     company_name: string
   }
   ```

2. **Enhanced `/api/quickbooks/status`**
   - Already exists and works correctly
   - May need minor enhancements for frontend client

**Updates to existing APIs**:
- Remove header-based authentication patterns
- Ensure all APIs use `getValidConnection()` from ConnectionManager

## Implementation Details

### Database Client Interface

```typescript
// /src/lib/quickbooks/databaseClient.ts
export interface ConnectionStatus {
  isAuthenticated: boolean;
  hasConnection: boolean;
  userCompanies: Company[];
  activeCompanyId?: string;
  companyConnection?: QuickBooksConnection;
}

export class DatabaseQuickBooksClient {
  private cache: ConnectionStatus | null = null;
  private cacheExpiry: number = 0;

  async getConnectionStatus(forceRefresh = false): Promise<ConnectionStatus> {
    // Cache for 30 seconds to avoid excessive API calls
    if (!forceRefresh && this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    const response = await fetch('/api/quickbooks/status');
    this.cache = await response.json();
    this.cacheExpiry = Date.now() + 30000; // 30 second cache
    return this.cache;
  }

  async getAccessToken(): Promise<string | null> {
    const status = await this.getConnectionStatus();
    return status.companyConnection?.access_token || null;
  }

  async getRealmId(): Promise<string | null> {
    const status = await this.getConnectionStatus();
    return status.companyConnection?.realm_id || null;
  }

  async isAuthenticated(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.isAuthenticated;
  }

  async switchCompany(companyId: string): Promise<void> {
    // Clear cache and get fresh status with new company
    this.cache = null;
    await this.getConnectionStatus();
  }

  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}

// Singleton instance
export const databaseClient = new DatabaseQuickBooksClient();
```

### Component Migration Pattern

**Before** (using cookies):
```typescript
import { quickBooksStore } from '@/lib/quickbooks/store';

const realmId = quickBooksStore.getRealmId();
const accessToken = quickBooksStore.getAccessToken();
const isAuth = await quickBooksStore.isAuthenticatedWithQuickBooks();
```

**After** (using database):
```typescript
import { databaseClient } from '@/lib/quickbooks/databaseClient';

const realmId = await databaseClient.getRealmId();
const accessToken = await databaseClient.getAccessToken();
const isAuth = await databaseClient.isAuthenticated();
```

### Chat Component Specific Changes

**Current problematic pattern**:
```typescript
headers: {
  'X-QB-Access-Token': quickBooksStore.getAccessToken() || '',
  'X-QB-Realm-ID': quickBooksStore.getRealmId() || '',
  'X-QB-Refresh-Token': quickBooksStore.getRefreshToken() || '',
}
```

**New approach** (two options):

**Option A**: Remove custom headers, let API routes handle authentication
```typescript
// No custom headers needed - API routes use getValidConnection()
headers: {
  'Content-Type': 'application/json',
}
```

**Option B**: Get tokens from database client
```typescript
const tokens = await databaseClient.getConnectionTokens();
headers: {
  'X-QB-Access-Token': tokens.access_token || '',
  'X-QB-Realm-ID': tokens.realm_id || '',
}
```

## Migration Checklist

### Preparation
- [ ] Create backup branch: `git checkout -b cookie-to-database-migration`
- [ ] Document current cookie values for testing: `console.log(document.cookie)`
- [ ] Test current functionality before changes

### Phase 1: Infrastructure
- [ ] Create `/src/lib/quickbooks/databaseClient.ts`
- [ ] Create `/api/quickbooks/connection-tokens` endpoint (if needed)
- [ ] Test database client works with existing `/api/quickbooks/status`

### Phase 2: Component Migration
- [ ] Migrate `/src/components/chat.tsx`
- [ ] Migrate `/src/app/page.tsx`
- [ ] Migrate `/src/components/ForecastContent.tsx`
- [ ] Migrate `/src/app/drivers/page.tsx`
- [ ] Migrate `/src/app/overview/page.tsx`
- [ ] Migrate `/src/app/forecast/page.tsx`
- [ ] Migrate `/src/app/dashboard/page.tsx`

### Phase 3: Cleanup
- [ ] Remove `/src/lib/quickbooks/store.ts`
- [ ] Remove `/src/lib/quickbooks/serverStore.ts`
- [ ] Update `/src/lib/quickbooks/client.ts`
- [ ] Remove cookie imports from all files
- [ ] Remove header-based auth from API routes

### Phase 4: Testing
- [ ] Test single company access
- [ ] Test multi-company switching
- [ ] Test new sandbox company creation
- [ ] Verify no cookie dependencies remain
- [ ] Test all major features (chat, forecast, drivers, overview)

## Expected Benefits

### Immediate Fixes
✅ **No more wrong company data** - System always uses active company from database
✅ **No manual cookie clearing** - Database is single source of truth
✅ **Consistent frontend/backend** - Both use same ConnectionManager

### Enhanced Functionality
✅ **Multi-company switching** - Users can seamlessly switch between companies
✅ **Automatic token refresh** - Database system handles token expiration
✅ **Proper user isolation** - Each user sees only their authorized companies

### Future-Proofing
✅ **Production ready** - No hardcoded values or browser dependencies
✅ **Scalable architecture** - Supports unlimited companies per user
✅ **Maintainable code** - Single authentication system to maintain

## Testing Strategy

### Before Migration
1. Document current behavior: which realm ID is being used?
2. Test all major features work with current system
3. Note any existing bugs or inconsistencies

### During Migration
1. Test each component individually after migration
2. Verify database client returns correct company data
3. Check browser network tab - no cookie-based requests

### After Migration
1. **New Company Test**: Create new QuickBooks sandbox, verify it's used immediately
2. **Multi-Company Test**: Connect multiple companies, verify switching works
3. **Token Refresh Test**: Verify automatic token refresh still works
4. **Feature Test**: Verify chat, forecast, drivers, overview all work correctly

## Rollback Plan

If migration causes issues:

1. **Immediate rollback**: Revert to backup branch
2. **Partial rollback**: Re-enable specific components using cookies temporarily
3. **Data preservation**: Database connections remain intact - only frontend changes

## Timeline Estimate

- **Phase 1** (Infrastructure): 1 hour
- **Phase 2** (Components): 2-3 hours
- **Phase 3** (Cleanup): 1 hour
- **Phase 4** (Testing): 1 hour

**Total**: 5-6 hours for complete migration

## Success Criteria

Migration is complete and successful when:

1. ✅ No references to `quickBooksStore` exist in codebase
2. ✅ No cookie-based authentication remains
3. ✅ Users can create new sandbox companies without manual cookie clearing
4. ✅ Multi-company switching works seamlessly
5. ✅ All features (chat, forecast, drivers, overview) work correctly
6. ✅ Frontend and backend always use same company data

---

*This migration resolves the fundamental architecture conflict between cookie-based and database-based authentication, enabling proper multi-company support and eliminating manual cookie management.*