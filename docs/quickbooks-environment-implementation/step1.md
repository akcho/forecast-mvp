# Step 1: Add npm Scripts for Environment Switching

## Objective
Add developer-friendly npm scripts to enable easy switching between QuickBooks sandbox and production environments without manual file editing.

## What This Step Accomplishes
- Adds `dev:sandbox` and `dev:production` commands
- Tests that environment variables are properly read
- Validates current behavior still works
- Creates foundation for all subsequent steps

## Implementation Tasks

### 1. Update package.json Scripts

**File**: `package.json`

**Current scripts section** (around line 6):
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "tsx src/lib/test/runTests.ts"
}
```

**Add these new scripts**:
```json
"scripts": {
  "dev": "next dev",
  "dev:sandbox": "QB_ENVIRONMENT=sandbox next dev",
  "dev:production": "QB_ENVIRONMENT=production next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "tsx src/lib/test/runTests.ts"
}
```

### 2. Update .env.example

**File**: `.env.example`

**Add this line** (after the QuickBooks section):
```bash
# QuickBooks Environment (sandbox or production)
QB_ENVIRONMENT=sandbox
```

**Complete QuickBooks section should look like**:
```bash
# QuickBooks
QB_CLIENT_ID=your_quickbooks_client_id
QB_CLIENT_SECRET=your_quickbooks_client_secret
QB_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback
QB_ENVIRONMENT=sandbox
```

### 3. Create Test Environment Variable Detection

**File**: `src/app/api/test/environment/route.ts` (NEW FILE)

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const environment = process.env.QB_ENVIRONMENT || 'sandbox';

  return NextResponse.json({
    success: true,
    environment,
    baseUrl: environment === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com',
    message: `QuickBooks environment detected as: ${environment}`
  });
}
```

## Testing Instructions

### Test 1: Default Behavior
```bash
npm run dev
```
- Navigate to `http://localhost:3000/api/test/environment`
- Should return: `{"environment": "sandbox", ...}`

### Test 2: Explicit Sandbox
```bash
npm run dev:sandbox
```
- Navigate to `http://localhost:3000/api/test/environment`
- Should return: `{"environment": "sandbox", ...}`

### Test 3: Production Environment
```bash
npm run dev:production
```
- Navigate to `http://localhost:3000/api/test/environment`
- Should return: `{"environment": "production", ...}`

### Test 4: Manual Environment Variable
```bash
# In your .env.local
QB_ENVIRONMENT=production

npm run dev
```
- Should return: `{"environment": "production", ...}`

## Success Criteria

✅ **npm scripts added successfully**
✅ **Environment variable detection working**
✅ **Test endpoint returns correct environment**
✅ **All three test scenarios pass**
✅ **Current app functionality unchanged**

## Expected Results

After completing this step:
- Developers can easily switch environments with simple commands
- Environment variable is properly detected across the application
- Foundation is ready for dynamic URL configuration
- No existing functionality is broken

## Next Step

Once this step is complete and all tests pass, proceed to **step2.md** to create the centralized configuration utility.

## Rollback Plan

If issues occur:
1. Remove the new npm scripts from `package.json`
2. Remove the `QB_ENVIRONMENT` line from `.env.example`
3. Delete the test endpoint file
4. Current functionality will be completely restored