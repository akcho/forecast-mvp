-- Manual Multi-Company Schema Migration
-- Run this in Supabase SQL Editor if the API migration doesn't work

-- Companies table - derived from QuickBooks CompanyInfo
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quickbooks_realm_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table - from Google SSO authentication  
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Many-to-many relationship between users and companies with roles
CREATE TABLE IF NOT EXISTS user_company_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

-- Add company_id to existing quickbooks_connections table
ALTER TABLE quickbooks_connections 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_realm_id ON companies(quickbooks_realm_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id ON user_company_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id ON user_company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_connections_company_id ON quickbooks_connections(company_id);

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'users', 'user_company_roles');

-- Verify column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quickbooks_connections' 
AND column_name = 'company_id';