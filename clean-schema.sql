-- CLEAN DATABASE SCHEMA FOR COMPANY-OWNED CONNECTIONS
-- Run this in Supabase SQL Editor after wiping database

-- Users table (from Google OAuth)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table (from QuickBooks CompanyInfo API)
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quickbooks_realm_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-Company relationships with roles
CREATE TABLE user_company_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- QuickBooks connections - COMPANY OWNED, not user owned
CREATE TABLE quickbooks_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  realm_id TEXT UNIQUE NOT NULL, -- One connection per QuickBooks company
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  company_name TEXT,
  
  -- Audit fields - track WHO connected, but connection belongs to company
  connected_by_user_id UUID REFERENCES users(id),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Token management (auth.md: tokens rotate every 24 hours)
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  refresh_token_expires_at TIMESTAMP WITH TIME ZONE, -- Track 100-day refresh token expiry
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one connection per company (realm_id is unique globally)
  UNIQUE(company_id, realm_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_companies_realm_id ON companies(quickbooks_realm_id);
CREATE INDEX idx_user_company_roles_user_id ON user_company_roles(user_id);
CREATE INDEX idx_user_company_roles_company_id ON user_company_roles(company_id);
CREATE INDEX idx_quickbooks_connections_company_id ON quickbooks_connections(company_id);
CREATE INDEX idx_quickbooks_connections_realm_id ON quickbooks_connections(realm_id);
CREATE INDEX idx_quickbooks_connections_active ON quickbooks_connections(is_active) WHERE is_active = true;

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read/update their own data
CREATE POLICY "Users can view own data" ON users
  FOR ALL USING (auth.uid()::text = google_id OR auth.email() = email);

-- Users can view companies they belong to
CREATE POLICY "Users can view their companies" ON companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id IN (
        SELECT id FROM users WHERE auth.email() = email OR auth.uid()::text = google_id
      )
    )
  );

-- Users can view their company roles
CREATE POLICY "Users can view their roles" ON user_company_roles
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE auth.email() = email OR auth.uid()::text = google_id
    )
  );

-- Users can view connections for their companies
CREATE POLICY "Users can view their company connections" ON quickbooks_connections
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id IN (
        SELECT id FROM users WHERE auth.email() = email OR auth.uid()::text = google_id
      )
    )
  );

-- Only admins can modify connections
CREATE POLICY "Admins can modify connections" ON quickbooks_connections
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_company_roles 
      WHERE role = 'admin' AND user_id IN (
        SELECT id FROM users WHERE auth.email() = email OR auth.uid()::text = google_id
      )
    )
  );

-- Verify tables created
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'companies', 'user_company_roles', 'quickbooks_connections')
ORDER BY table_name, ordinal_position;