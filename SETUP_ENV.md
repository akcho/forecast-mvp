# Environment Variables Setup Guide

## Required Environment Variables

### Supabase (Required for shared connections)
1. `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key (for client-side)
3. `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side)

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

### 2. Create the Database Tables
Run this SQL in your Supabase SQL editor:

```sql
-- Drop the old table if it exists
DROP TABLE IF EXISTS shared_connections;

-- Create the new multi-admin connections table
CREATE TABLE quickbooks_connections (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  realm_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  company_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id, realm_id)
);

-- Create index for faster queries
CREATE INDEX idx_quickbooks_connections_company ON quickbooks_connections(company_id);
CREATE INDEX idx_quickbooks_connections_active ON quickbooks_connections(is_active);
CREATE INDEX idx_quickbooks_connections_shared ON quickbooks_connections(is_shared);

-- Note: RLS is intentionally disabled for MVP
-- The app uses anonymous user IDs from localStorage, not authenticated Supabase users
-- RLS will be enabled when proper user authentication is implemented
```

### 3. Set Environment Variables in Vercel
1. Go to your Vercel project dashboard
2. Go to Settings > Environment Variables
3. Add each variable:

| Variable Name | Value |
|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `QB_CLIENT_ID` | Your QuickBooks app client ID |
| `QB_CLIENT_SECRET` | Your QuickBooks app client secret |
| `QB_REDIRECT_URI` | `https://your-domain.vercel.app/api/quickbooks/callback` |

### 4. Redeploy
After setting the environment variables, redeploy your application.

## Testing
1. Deploy with the environment variables set
2. Connect multiple QuickBooks accounts
3. Test sharing connections between users
4. Verify connection management features work 