-- WIPE DATABASE FOR FRESH START
-- Run this in Supabase SQL Editor

-- Drop all existing tables (CASCADE will handle foreign key dependencies)
DROP TABLE IF EXISTS user_company_roles CASCADE;
DROP TABLE IF EXISTS quickbooks_connections CASCADE;
DROP TABLE IF EXISTS quickbooks_tokens CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Confirm tables are gone (should return no rows)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'companies', 'user_company_roles', 'quickbooks_connections', 'quickbooks_tokens');