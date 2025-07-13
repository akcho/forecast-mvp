# Environment Variables Setup Guide

## Required Environment Variables

### Supabase (Required for shared connections)
1. `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
2. `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

### QuickBooks (Required for OAuth)
3. `QB_CLIENT_ID` - Your QuickBooks app client ID
4. `QB_CLIENT_SECRET` - Your QuickBooks app client secret
5. `QB_REDIRECT_URI` - Your QuickBooks redirect URI (should be your production URL + /api/quickbooks/callback)

### Optional
6. `OPENAI_API_KEY` - For AI features (optional)

## How to Set Up

### 1. Create a Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Get your project URL and service role key from Settings > API

### 2. Create the Database Table
Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE shared_connections (
  id SERIAL PRIMARY KEY,
  company_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  realm_id TEXT NOT NULL,
  shared_by TEXT,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, realm_id)
);
```

### 3. Set Environment Variables in Vercel
1. Go to your Vercel project dashboard
2. Go to Settings > Environment Variables
3. Add each variable:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `QB_CLIENT_ID` | Your QuickBooks app client ID |
| `QB_CLIENT_SECRET` | Your QuickBooks app client secret |
| `QB_REDIRECT_URI` | `https://your-domain.vercel.app/api/quickbooks/callback` |

### 4. Redeploy
After setting the environment variables, redeploy your application.

## Testing
1. Deploy with the environment variables set
2. Connect as admin in one browser
3. Share the connection
4. Test in an incognito browser - you should see the shared connection working 